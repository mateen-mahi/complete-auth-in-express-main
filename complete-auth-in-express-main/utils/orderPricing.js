// utils/orderPricing.js
//
// Single source of truth for "what does this course cost, after any promo
// code and tax". Both the /quote endpoint (pure display, called on every
// promo code attempt) and /create-payment-intent (the actual charge) call
// THIS SAME function — so the price a user sees is guaranteed to be the
// price they're charged. Never duplicate this math anywhere else.
import { validatePromoCode } from "./promoCodes.js";

const TAX_RATE = 0.18; // adjust to match your actual tax requirement

export function calculateOrderTotal({ coursePrice, promoCode }) {
  const discountPercent = validatePromoCode(promoCode);
  const discountAmount = discountPercent
    ? Number(((coursePrice * discountPercent) / 100).toFixed(2))
    : 0;

  const subtotalAfterDiscount = Number((coursePrice - discountAmount).toFixed(2));
  const taxAmount = Number((subtotalAfterDiscount * TAX_RATE).toFixed(2));
  const total = Number((subtotalAfterDiscount + taxAmount).toFixed(2));

  return {
    coursePrice,
    discountPercent: discountPercent || 0,
    discountAmount,
    taxAmount,
    total,
    // Stripe requires amounts in the smallest currency unit — cents for USD
    totalInCents: Math.round(total * 100),
  };
}
