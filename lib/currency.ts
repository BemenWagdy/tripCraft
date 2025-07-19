// lib/currency.ts
// Simple currency mapping for countries and cities
const countryToCurrency: Record<string, string> = {
  // Egypt
  'Egypt': 'EGP',
  'Cairo': 'EGP',
  'Alexandria': 'EGP',
  'Luxor': 'EGP',
  
  // UAE
  'United Arab Emirates': 'AED',
  'UAE': 'AED',
  'Dubai': 'AED',
  'Abu Dhabi': 'AED',
  'Sharjah': 'AED',
  
  // Other major currencies
  'United States': 'USD',
  'USA': 'USD',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'France': 'EUR',
  'Germany': 'EUR',
  'Italy': 'EUR',
  'Spain': 'EUR',
  'Netherlands': 'EUR',
  'Belgium': 'EUR',
  'Japan': 'JPY',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'Switzerland': 'CHF',
  'China': 'CNY',
  'India': 'INR',
  'Brazil': 'BRL',
  'Russia': 'RUB',
  'South Africa': 'ZAR',
  'Mexico': 'MXN',
  'Turkey': 'TRY',
  'Saudi Arabia': 'SAR',
  'Thailand': 'THB',
  'Singapore': 'SGD',
  'Malaysia': 'MYR',
  'Indonesia': 'IDR',
  'Philippines': 'PHP',
  'Vietnam': 'VND',
  'South Korea': 'KRW',
  'Israel': 'ILS',
  'Norway': 'NOK',
  'Sweden': 'SEK',
  'Denmark': 'DKK',
  'Poland': 'PLN',
  'Czech Republic': 'CZK',
  'Hungary': 'HUF',
  'Romania': 'RON',
  'Bulgaria': 'BGN',
  'Croatia': 'HRK',
  'Serbia': 'RSD',
  'Ukraine': 'UAH',
  'Argentina': 'ARS',
  'Chile': 'CLP',
  'Colombia': 'COP',
  'Peru': 'PEN',
  'Uruguay': 'UYU',
  'Pakistan': 'PKR',
  'Bangladesh': 'BDT',
  'Sri Lanka': 'LKR',
  'Nepal': 'NPR',
  'Morocco': 'MAD',
  'Tunisia': 'TND',
  'Algeria': 'DZD',
  'Nigeria': 'NGN',
  'Kenya': 'KES',
  'Ghana': 'GHS',
  'Ethiopia': 'ETB',
  'Tanzania': 'TZS',
  'Uganda': 'UGX',
  'Zambia': 'ZMW',
  'Zimbabwe': 'ZWL',
  'New Zealand': 'NZD',
};

export function currencyCode(country: string | undefined): string {
  if (!country) return 'USD';
  
  const trimmed = country.trim();
  
  // Already an ISO code?
  if (trimmed.length === 3 && /^[A-Z]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  // Direct mapping
  if (countryToCurrency[trimmed]) {
    return countryToCurrency[trimmed];
  }
  
  // Try to extract country from "City, Country" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    for (const part of parts) {
      if (countryToCurrency[part]) {
        return countryToCurrency[part];
      }
    }
  }
  
  // Fallback to USD
  return 'USD';
}