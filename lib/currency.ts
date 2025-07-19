// lib/currency.ts
// Very small starter map – expand as you support more passports.
const countryToCurrency: Record<string, string> = {
  // GCC + MENA
  'United Arab Emirates': 'AED',
  UAE: 'AED',
  Dubai: 'AED',
  'Abu Dhabi': 'AED',
  Sharjah: 'AED',
  Egypt: 'EGP',
  Cairo: 'EGP',
  Alexandria: 'EGP',
  Luxor: 'EGP',
  Saudi: 'SAR',
  'Saudi Arabia': 'SAR',
  Riyadh: 'SAR',
  Jeddah: 'SAR',
  Mecca: 'SAR',
  Qatar: 'QAR',
  Doha: 'QAR',
  Kuwait: 'KWD',
  'Kuwait City': 'KWD',

  // Europe
  Belgium: 'EUR',
  France: 'EUR',
  Paris: 'EUR',
  Lyon: 'EUR',
  Marseille: 'EUR',
  Germany: 'EUR',
  Berlin: 'EUR',
  Munich: 'EUR',
  Frankfurt: 'EUR',
  'United Kingdom': 'GBP',
  UK: 'GBP',
  London: 'GBP',
  Manchester: 'GBP',
  Edinburgh: 'GBP',
  Italy: 'EUR',
  Rome: 'EUR',
  Milan: 'EUR',
  Venice: 'EUR',
  Spain: 'EUR',
  Madrid: 'EUR',
  Barcelona: 'EUR',
  Netherlands: 'EUR',
  Amsterdam: 'EUR',

  // Americas
  'United States': 'USD',
  USA: 'USD',
  'New York': 'USD',
  'Los Angeles': 'USD',
  Chicago: 'USD',
  Miami: 'USD',
  Canada: 'CAD',
  Toronto: 'CAD',
  Vancouver: 'CAD',
  Montreal: 'CAD',

  // Asia-Pacific
  Japan: 'JPY',
  Tokyo: 'JPY',
  Osaka: 'JPY',
  Kyoto: 'JPY',
  Australia: 'AUD',
  Sydney: 'AUD',
  Melbourne: 'AUD',
  Perth: 'AUD',
  Thailand: 'THB',
  Bangkok: 'THB',
  'Phuket': 'THB',
  Singapore: 'SGD',
  Malaysia: 'MYR',
  'Kuala Lumpur': 'MYR',
  Turkey: 'TRY',
  Istanbul: 'TRY',
  Ankara: 'TRY',
};

export function currencyCode(country: string | undefined): string {
  if (!country) return '';
  return countryToCurrency[country.trim()] ?? '';
}