// controllers/payment.controller.js
import stripe from "../config/stripe.js";
import Order from "../models/order.model.js";
import Course from "../models/course.model.js";
import { calculateOrderTotal } from "../utils/orderPricing.js";
import { notifyEnrollment } from "../services/adminEvents.js";

// ─────────────────────────────────────────────────────────────
// POST /api/v1/payments/quote
// Pure calculation, no Stripe call, no DB write — safe to call every time
// the user types a promo code. This is what the frontend shows BEFORE the
// user commits to paying.
// ─────────────────────────────────────────────────────────────
export const getPriceQuote = async (req, res) => {
  try {
    const { courseId, promoCode } = req.body;

    const course = await Course.findById(courseId).select("price title");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const pricing = calculateOrderTotal({ coursePrice: course.price, promoCode });

    return res.status(200).json({ success: true, courseTitle: course.title, pricing });
  } catch (error) {
    console.error("Error in getPriceQuote:", error);
    return res.status(500).json({ success: false, message: "Server error while calculating price" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/payments/create-payment-intent
// Creates the actual Stripe PaymentIntent AND a pending Order record.
// The charged amount is recalculated HERE from the real course price —
// the client only ever supplies courseId + promoCode, never a dollar amount.
// ─────────────────────────────────────────────────────────────
export const createPaymentIntent = async (req, res) => {
  try {
    const { courseId, promoCode } = req.body;
    const userId = req.user.id;

    const course = await Course.findById(courseId).select("price title");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const alreadyEnrolled = await Course.exists({ _id: courseId, studentsEnrolled: userId });
    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: "You're already enrolled in this course." });
    }

    const pricing = calculateOrderTotal({ coursePrice: course.price, promoCode });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.totalInCents,
      currency: "usd",
      // Read back inside the webhook to know exactly what this payment was for
      metadata: { userId: String(userId), courseId: String(courseId) },
      // Lets Stripe automatically offer card + whatever wallets you've
      // enabled in your Dashboard, without you hand-coding each one
      automatic_payment_methods: { enabled: true },
    });

    // Written as "pending" immediately — the webhook is what flips this to
    // "completed" once Stripe confirms the charge actually cleared. This
    // row existing is also how the webhook finds which order to update.
    const order = await Order.create({
      userId,
      courseId,
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
// Called by STRIPE'S servers, never by your frontend directly. This is the
// real source of truth for "did the payment succeed" — a success response
// on the frontend just means "Stripe accepted the card," not "we're sure
// the money is confirmed." The user could close the tab, lose their
// connection, etc. between those two moments. Only this handler should
// ever mark an order "completed" or trigger enrollment.
// ─────────────────────────────────────────────────────────────
export const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    // req.body MUST be the raw, unparsed request buffer here — see the
    // app.js wiring note. If express.json() already parsed it, signature
    // verification will fail every time.
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
      // Stripe sends many event types — anything not handled above is
      // safely ignored rather than causing an error.
      break;
  }

  // Stripe requires a 200 response, or it will keep retrying this webhook
  // on a backoff schedule, assuming your server failed to receive it.
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

  const course = await Course.findByIdAndUpdate(
    order.courseId,
    { $addToSet: { studentsEnrolled: order.userId } },
    { new: true }
  ).select("title");

  if (course) {
    notifyEnrollment({ userId: order.userId, courseId: order.courseId, courseTitle: course.title });
  }
}
