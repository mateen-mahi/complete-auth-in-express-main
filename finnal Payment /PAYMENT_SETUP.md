# Stripe Payment Integration — Setup Guide

This document covers the complete payment flow: what each file does, where it goes, how to configure it, and why it's built this way. Read the "Why this architecture" section even if you just want to copy-paste — it explains the two things that would otherwise be easy to get wrong.

---

## 1. The flow, in one paragraph

Frontend asks the backend "what would this course cost, with this promo code?" (`/payments/quote`) — purely informational, no money moves. When the user clicks Pay, frontend asks the backend to actually start a payment (`/payments/create-payment-intent`) — the backend re-calculates the price itself from the real course record, creates a Stripe PaymentIntent for that amount, and writes a `pending` `Order` row. The frontend then hands off to Stripe's own hosted UI (`PaymentElement`) to collect card details — **your server and your React code never see the card number**. Once Stripe actually confirms the charge, it calls your backend directly (`/payments/webhook`) — that webhook is the only thing allowed to mark the order `completed` and enroll the student.

---

## 2. File placement

```
backend/
├── config/
│   └── stripe.js                  ← Stripe SDK init
├── models/
│   └── order.model.js             ← already yours, unchanged
├── utils/
│   ├── promoCodes.js               ← promo code → discount % lookup
│   └── orderPricing.js             ← shared price calculation (quote AND charge use this)
├── controllers/
│   └── payment.controller.js       ← quote, create-payment-intent, webhook
├── routes/
│   └── payment.route.js
└── app.js                          ← needs ONE specific edit, see §5

frontend/
├── src/
│   ├── services/
│   │   └── stripeClient.js         ← loadStripe() singleton
│   └── pages/
│       └── StripePayment.jsx       ← replaces your current mockup
```

---

## 3. Install

```bash
# Backend
npm install stripe

# Frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

## 4. Environment variables

```bash
# Backend .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URI=http://localhost:5173   # used to build the return_url / verify links

# Frontend .env (Vite requires this exact prefix)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Get the secret key and publishable key from **Stripe Dashboard → Developers → API keys**. The webhook secret comes from §6 below — it's different for local testing vs. production.

---

## 5. The one `app.js` edit that will silently break everything if skipped

Stripe's webhook handler needs the **raw, unparsed** request body to verify the request actually came from Stripe (via a cryptographic signature). Your app almost certainly has `app.use(express.json())` running globally, which would already have parsed that body into a JS object before the webhook route ever sees it — and once that happens, signature verification fails on every single request, permanently.

**Fix: register the webhook route directly on `app`, before `express.json()` runs:**

```js
import { stripeWebhook } from "./controllers/payment.controller.js";
import paymentRoutes from "./routes/payment.route.js";

// MUST be before express.json() — do not move this
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use(cors({ /* ...your existing config, unchanged... */ }));
// ...rest of your existing middleware...

app.use("/api/v1/payments", paymentRoutes); // /quote and /create-payment-intent — normal JSON is fine here
```

If payments seem to succeed on the frontend but orders never flip to `completed` in your database, this is almost always the cause.

---

## 6. Testing webhooks on your local machine

Stripe's servers can't reach `localhost` directly. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then run:

```bash
stripe listen --forward-to localhost:8080/api/v1/payments/webhook
```

This prints something like `whsec_abcd1234...` — that's your **local** `STRIPE_WEBHOOK_SECRET`. Leave this command running in a terminal while you test.

For production, you'll register your real webhook URL in **Stripe Dashboard → Developers → Webhooks → Add endpoint**, pointing at `https://yourdomain.com/api/v1/payments/webhook`, and use the secret Stripe generates for *that* endpoint instead.

---

## 7. Test card numbers (test mode only)

| Number | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

Any future expiry date, any 3-digit CVC, any postal code.

---

## 8. Why this architecture — the two decisions that actually matter

### Why `PaymentElement` instead of raw `<input>` fields for card number/expiry/CVC

Your original mockup collected card details into React state (`cardNumber`, `expiry`, `cvc`). **This is the wrong approach, not a style choice** — that data would need to travel through your own JavaScript and potentially your own server, which means your app becomes subject to PCI-DSS compliance requirements that apply to anyone who touches raw card data. `PaymentElement` is Stripe's hosted UI, embedded via an iframe — the card number never exists in your React state or touches your server at all. It also automatically shows Google Pay / Apple Pay if you enable them in your Stripe Dashboard, so the manual `SiGooglepay`/`SiApplepay` buttons and the separate UPI tab aren't needed as custom code anymore — Stripe handles all of it inside one component.

### Why the charged amount is always recalculated server-side

The frontend sends `courseId` and (optionally) `promoCode` — **never a dollar amount**. If the backend trusted a price sent by the client, anyone could open dev tools and change `total` before it's submitted, buying a $50 course for $1. `orderPricing.js` is the single place price math happens; both `/quote` (for display) and `/create-payment-intent` (for the actual charge) call the exact same function, so what the user sees is guaranteed to match what they're charged.

### Why order fulfillment happens in the webhook, not right after `confirmPayment()` on the frontend

When `stripe.confirmPayment()` resolves successfully in the browser, that only means *Stripe accepted the payment attempt* — it does not guarantee your server has heard about it yet. If the user closes the tab, loses their connection, or the browser crashes in the half-second after payment succeeds, a frontend-only "mark this as paid" would silently lose the order. The webhook is Stripe's own server calling your server directly, independent of whatever happens to the user's browser — that's what makes it the actual source of truth. `payment_intent.succeeded` is what triggers `paymentStatus: "completed"` and enrollment; the frontend's success screen is just a nice UI moment layered on top.

---

## 9. Known limitation

Your `Order` schema has a single `courseId` per order, so this handles **one course per checkout**. If you ever want the cart-based multi-course checkout from your `Courses.jsx` page to route through this same payment flow, `Order` would need to support multiple courses (either an array field, or one `Order` per course sharing a batch/session ID) — not built here since your schema, as given, is clearly single-course.
