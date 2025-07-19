// lib/fx.ts
// ------------------------------------------------------------------
// Fetch live exchange rates for *any* currency pair via exchangerate.host
// ------------------------------------------------------------------

const BASE_URL = 'https://api.exchangerate.host/latest';

/**
 * Returns the price of 1 unit of `base` expressed in `quote`.
 * Example:  getFxRate('AED', 'EGP')  ->  14.02  (1 AED = 14.02 EGP)
 */
export async function getFxRate(base: string, quote: string): Promise<number> {
  // normalise to upper-case 3-letter codes
  const from = base.trim().toUpperCase();
  const to   = quote.trim().toUpperCase();

  // same-currency shortcut
  if (from === to) return 1;

  const url = `${BASE_URL}?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`;

  const res = await fetch(url, { next: { revalidate: 3600 } }); // 1-hour cache
  if (!res.ok) throw new Error(`FX request failed ${res.status}`);

  const data: { rates?: Record<string, number> } = await res.json();
  const rate = data.rates?.[to];

  if (!rate || Number.isNaN(rate)) throw new Error('Rate not found');
  return rate;
}