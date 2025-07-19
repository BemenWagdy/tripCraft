// lib/currency.ts
// Very small starter map – expand as you support more passports.
const countryToCurrency: Record<string, string> = {
  // GCC + MENA
  'United Arab Emirates': 'AED',
  UAE: 'AED',
  Egypt: 'EGP',
  Saudi: 'SAR',
  Qatar: 'QAR',
  Kuwait: 'KWD',

  // Europe
  Belgium: 'EUR',
  France: 'EUR',
  Germany: 'EUR',
  'United Kingdom': 'GBP',

  // Americas
  'United States': 'USD',
  Canada: 'CAD',

  // Asia-Pacific
  Japan: 'JPY',
  Australia: 'AUD',
};

export function currencyCode(country: string | undefined): string {
  if (!country) return '';
  return countryToCurrency[country.trim()] ?? '';
}