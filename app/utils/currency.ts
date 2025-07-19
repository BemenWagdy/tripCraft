// app/utils/currency.ts
// ------------------------------------------------------------------
// Very small lookup-table helper.  Add more countries as you need.
// ------------------------------------------------------------------

const MAP: Record<string, string> = {
  Egypt: 'EGP',
  'United Arab Emirates': 'AED',
  Belgium: 'EUR',
  USA: 'USD',
  'United States': 'USD',
};

export function currencyCode(name = ''): string {
  // upper-case ISO code already? → just return it
  if (name.trim().length === 3) return name.trim().toUpperCase();
  return MAP[name.trim()] ?? '';          // '' → caller can fall back to USD
}