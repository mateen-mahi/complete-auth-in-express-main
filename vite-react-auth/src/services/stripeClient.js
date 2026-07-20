// src/services/stripeClient.js
import { loadStripe } from "@stripe/stripe-js";

// Module-level singleton — loadStripe() should only run ONCE per
// publishable key. If this were called inside a component, it would
// re-initialize Stripe.js on every re-render, which Stripe explicitly
// warns against (extra network requests, potential state issues).
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default stripePromise;
