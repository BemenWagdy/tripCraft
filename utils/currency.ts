// utils/currency.ts
// ------------------------------------------------------------
// Minimal helper – extend the MAP as you add destinations.
// ------------------------------------------------------------
const MAP: Record<string, string> = {
  Egypt: 'EGP',
  'United Arab Emirates': 'AED',
  Belgium: 'EUR',
  USA: 'USD',
  'United States': 'USD',
};

export function currencyCode(name = ''): string {
  const trimmed = name.trim();
  // already an ISO-4217 code? (e.g. "EGP") -------------------
  if (trimmed.length === 3) return trimmed.toUpperCase();
  // look-up by country name ----------------------------------
  return MAP[trimmed] ?? '';         // caller can fall back to USD
}