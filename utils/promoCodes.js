
const PROMO_CODES = {
  ACADEMY20: 20,
  SAVE10: 10,
  WELCOME50: 50,
};


export function validatePromoCode(code) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return PROMO_CODES[normalized] ?? null;
}
