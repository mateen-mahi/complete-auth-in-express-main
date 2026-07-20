// utils/promoCodes.js
//
// Simple validated lookup for now. Everything that needs a promo code goes
// through validatePromoCode() below — swap the implementation for a
// database-backed Coupon model later without touching any caller.
const PROMO_CODES = {
  ACADEMY20: 20,
  SAVE10: 10,
  WELCOME50: 50,
};

/**
 * Returns the discount percentage for a code, or null if invalid/missing.
 * NEVER trust a discount percentage sent from the client — this is the
 * only place a percentage should ever come from.
 */
export function validatePromoCode(code) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return PROMO_CODES[normalized] ?? null;
}
