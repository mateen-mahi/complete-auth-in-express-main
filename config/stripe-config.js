// config/stripe.js
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing from your .env file");
}

// Pinning an API version means Stripe's own API changes over time can
// never silently change your integration's behavior underneath you.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export default stripe;
