// routes/payment.route.js
import express from "express";
import verifyAuth from "../Middlewares/AuthMiddleware.js";
import { getPriceQuote, createPaymentIntent, stripeWebhook } from "../controllers/payment.controller.js";

const paymentRoutes = express.Router();

// Requires a logged-in user — we need req.user.id for the Order record
paymentRoutes.post("/quote", getPriceQuote);
paymentRoutes.post("/create-payment-intent",createPaymentIntent);

// NOTE: the webhook route itself is registered separately, directly on
// `app`, BEFORE express.json() — see the app.js wiring note. It is
// intentionally NOT included here and NOT behind verifyAuth.

export default paymentRoutes;
