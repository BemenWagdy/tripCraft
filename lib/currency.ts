// lib/currency.ts
// Enhanced currency mapping for countries and cities
const countryToCurrency: Record<string, string> = {
  // GCC + MENA
  'United Arab Emirates': 'AED',
  'UAE': 'AED',
  'Dubai': 'AED',
  'Abu Dhabi': 'AED',
  'Sharjah': 'AED',
  'Egypt': 'EGP',
  'Cairo': 'EGP',
  'Alexandria': 'EGP',
  'Luxor': 'EGP',
  'Saudi Arabia': 'SAR',
  'Saudi': 'SAR',
  'Riyadh': 'SAR',
  'Jeddah': 'SAR',
  'Qatar': 'QAR',
  'Doha': 'QAR',
  'Kuwait': 'KWD',
  'Kuwait City': 'KWD',
  
  // Europe
  'Belgium': 'EUR',
  'France': 'EUR',
  'Paris': 'EUR',
  'Germany': 'EUR',
  'Berlin': 'EUR',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'London': 'GBP',
  'Italy': 'EUR',
  'Rome': 'EUR',
  'Spain': 'EUR',
  'Madrid': 'EUR',
  'Netherlands': 'EUR',
  'Amsterdam': 'EUR',
  
  // Americas
  'United States': 'USD',
  'USA': 'USD',
  'New York': 'USD',
  'Canada': 'CAD',
  'Toronto': 'CAD',
  
  // Asia-Pacific
  'Japan': 'JPY',
  'Tokyo': 'JPY',
  'Australia': 'AUD',
  'Sydney': 'AUD',
  'Thailand': 'THB',
  'Bangkok': 'THB',
  'Singapore': 'SGD',
  'Malaysia': 'MYR',
  'Turkey': 'TRY',
  'Istanbul': 'TRY',
};

export function currencyCode(country: string | undefined): string {
  if (!country) return 'USD';
  
  const trimmed = country.trim();
  
  // Already an ISO code?
  if (trimmed.length === 3) return trimmed.toUpperCase();
  
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
  
  // Fallback
  return 'USD';
}