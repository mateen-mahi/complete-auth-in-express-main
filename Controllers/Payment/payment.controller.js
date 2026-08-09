// controllers/payment.controller.js
import stripe from "../../config/stripe-config.js";
import Order from "../../models/order.model.js";
import Course from "../../models/courses.model.js";
import { calculateOrderTotal } from "../../utils/orderPricing.js";
import { notifyEnrollment } from "../../service/adminEvents.js";

// ─────────────────────────────────────────────────────────────
// POST /api/v1/payments/quote
// ─────────────────────────────────────────────────────────────
export const getPriceQuote = async (req, res) => {
  try {
    const { courseIds, promoCode } = req.body;

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: "courseIds is required and must be a non-empty array" });
    }

    const courses = await Course.find({ _id: { $in: courseIds } }).select("price title");
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ success: false, message: "One or more courses not found" });
    }

    const pricing = calculateOrderTotal({
      coursePrices: courses.map((c) => c.price),
      promoCode,
    });

    return res.status(200).json({
      success: true,
      courseTitles: courses.map((c) => c.title),
      pricing,
    });
  } catch (error) {
    console.error("Error in getPriceQuote:", error);
    return res.status(500).json({ success: false, message: "Server error while calculating price" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/payments/create-payment-intent
// ─────────────────────────────────────────────────────────────
export const createPaymentIntent = async (req, res) => {
  try {
    const { courseIds, promoCode } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: "courseIds is required and must be a non-empty array" });
    }

    const courses = await Course.find({ _id: { $in: courseIds } }).select("price title studentsEnrolled");
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ success: false, message: "One or more courses not found" });
    }

    const alreadyEnrolledCourse = courses.find((c) => c.studentsEnrolled?.some((id) => String(id) === String(userId)));
    if (alreadyEnrolledCourse) {
      return res.status(400).json({
        success: false,
        message: `You're already enrolled in "${alreadyEnrolledCourse.title}".`,
      });
    }

    const pricing = calculateOrderTotal({
      coursePrices: courses.map((c) => c.price),
      promoCode,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.totalInCents,
      currency: "usd",
      // Stripe metadata values must be strings — courseIds is JSON-encoded
      // and parsed back out in the webhook
      metadata: {
        userId: String(userId),
        courseIds: JSON.stringify(courseIds),
      },
      automatic_payment_methods: { enabled: true },
    });

    const order = await Order.create({
      userId,
      courseIds,
      amountPaid: pricing.total,
      currency: "USD",
      paymentGateway: "stripe",
      paymentStatus: "pending",
      gatewayTransactionId: paymentIntent.id,
    });

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
      pricing,
    });
  } catch (error) {
    console.error("Error in createPaymentIntent:", error);
    return res.status(500).json({ success: false, message: "Server error while starting payment" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/payments/webhook
// ─────────────────────────────────────────────────────────────
export const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      await handlePaymentSuccess(event.data.object);
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      await Order.findOneAndUpdate(
        { gatewayTransactionId: paymentIntent.id },
        { paymentStatus: "failed" }
      );
      break;
    }
    default:
      break;
  }

  return res.status(200).json({ received: true });
};

async function handlePaymentSuccess(paymentIntent) {
  const order = await Order.findOneAndUpdate(
    { gatewayTransactionId: paymentIntent.id },
    { paymentStatus: "completed" },
    { new: true }
  );

  if (!order) {
    console.error(`Webhook: no matching order for PaymentIntent ${paymentIntent.id}`);
    return;
  }

  for (const courseId of order.courseIds) {
    const course = await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { studentsEnrolled: order.userId } },
      { new: true }
    ).select("title");

    if (course) {
      notifyEnrollment({ userId: order.userId, courseId, courseTitle: course.title });
    }
  }
}