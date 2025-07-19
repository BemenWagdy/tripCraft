// lib/fx.ts
// Only Fixer.io API integration
export interface FxResult {
  rate: number;   
  date: string;   
  provider: 'fixer';
}

export async function getFxRate(from: string, to: string): Promise<FxResult> {
  const base = (from ?? '').trim().toUpperCase();
  const quote = (to ?? '').trim().toUpperCase();

  console.log(`[FX] Getting rate from ${base} to ${quote}`);

  // Same currency
  if (!base || !quote || base === quote) {
    console.log('[FX] Same currency, returning 1:1');
    return { rate: 1, date: today(), provider: 'fixer' };
  }

  // Make real API request to Fixer.io
  const apiKey = 'e873239c9944dc25c2b59d1d01d71d77';
  
  try {
    console.log(`[FX] Making Fixer.io API request...`);
    
    // Get EUR rates for both currencies
    const url = `https://api.fixer.io/latest?access_key=${apiKey}&symbols=${base},${quote}`;
    console.log(`[FX] URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripCraft/1.0'
      }
    });
    
    console.log(`[FX] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Fixer.io API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[FX] Fixer.io response:`, data);
    
    if (!data.success) {
      throw new Error(`Fixer.io API error: ${data.error?.info || 'Unknown error'}`);
    }
    
    if (!data.rates || !data.rates[base] || !data.rates[quote]) {
      throw new Error(`Missing rates for ${base} or ${quote} in Fixer.io response`);
    }
    
    // Calculate cross rate
    const eurToBase = data.rates[base];
    const eurToQuote = data.rates[quote];
    const rate = eurToQuote / eurToBase;
    
    console.log(`[FX] Calculated: 1 ${base} = ${rate} ${quote}`);
    
    return {
      rate: Number(rate.toFixed(6)),
      date: data.date || today(),
      provider: 'fixer'
    };
    
  } catch (error) {
    console.error(`[FX] Error:`, error);
    throw error;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}