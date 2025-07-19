/* app/utils/currency.ts
   Smart resolver → always returns a 3-letter ISO-4217 code or ''        */

const MAP: Record<string, string> = {
  /* ────── countries you care about ────── */
  EGYPT: 'EGP',
  'UNITED ARAB EMIRATES': 'AED',
  UAE: 'AED',
  BELGIUM: 'EUR',
  USA: 'USD',
  'UNITED STATES': 'USD',

  /* ────── high-traffic cities (map → national currency) ────── */
  DUBAI: 'AED',
  CAIRO: 'EGP',
  BRUSSELS: 'EUR',
};

/** Return ISO-4217 code for a country *or* city string.  
 *  Empty string means "unknown" (let your guard catch it). */
export function currencyCode(raw?: string): string {
  if (!raw) return '';

  // Already an ISO code?
  const t = raw.trim().toUpperCase();
  if (t.length === 3) return t;

  // Drop anything after comma / dash  → "Paris, France" → "PARIS"
  const clean = t.split(/[,–-]/)[0].trim();

  // Direct city / country hit
  if (MAP[clean]) return MAP[clean];

  // Last word heuristic  → "PARIS FRANCE" → "FRANCE"
  const last = clean.split(/\s+/).pop()!;
  return MAP[last] ?? '';
}