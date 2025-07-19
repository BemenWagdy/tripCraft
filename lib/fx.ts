// lib/fx.ts
// -----------------------------------------------------------------------------
// REAL Fixer.io API integration - Uses working pattern from test
// -----------------------------------------------------------------------------

export interface FxResult {
  rate: number;   
  date: string;   
  provider: 'fixer';
}

export async function getFxRate(from: string, to: string): Promise<FxResult> {
  const base  = (from ?? '').trim().toUpperCase();
  const quote = (to   ?? '').trim().toUpperCase();

  console.log(`[FX] ===== STARTING FX LOOKUP =====`);
  console.log(`[FX] From: ${base} -> To: ${quote}`);

  // Same currency shortcut
  if (!base || !quote || base === quote) {
    console.log('[FX] Same currency, returning 1:1');
    return { rate: 1, date: today(), provider: 'fixer' };
  }

  // MAKE REAL API REQUEST TO FIXER.IO
  const apiKey = 'e873239c9944dc25c2b59d1d01d71d77';
  
  try {
    console.log(`[FX] 🌐 Making real API request to Fixer.io for ${base} -> ${quote}`);
    
    // Use EUR as base and get both currencies
    const url = `https://api.fixer.io/latest?access_key=${apiKey}&symbols=${base},${quote}`;
    console.log(`[FX] 📡 Request URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripCraft/1.0'
      }
    });
    
    console.log(`[FX] 📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Fixer.io API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[FX] 📦 Fixer.io response:`, JSON.stringify(data, null, 2));
    
    if (!data.success) {
      throw new Error(`Fixer.io API error: ${data.error?.info || 'Unknown error'}`);
    }
    
    if (!data.rates || !data.rates[base] || !data.rates[quote]) {
      throw new Error(`Missing rates for ${base} or ${quote} in Fixer.io response`);
    }
    
    // Calculate cross rate: base -> quote
    const eurToBase = data.rates[base];  // 1 EUR = X base
    const eurToQuote = data.rates[quote]; // 1 EUR = Y quote
    
    // 1 base = ? quote
    // If 1 EUR = X base and 1 EUR = Y quote
    // Then 1 base = Y/X quote
    const rate = eurToQuote / eurToBase;
    
    console.log(`[FX] 🧮 Calculation: 1 ${base} = ${eurToQuote}/${eurToBase} = ${rate} ${quote}`);
    
    return {
      rate: Number(rate.toFixed(6)),
      date: data.date || today(),
      provider: 'fixer'
    };
    
  } catch (error) {
    console.error(`[FX] 💥 Fixer.io API request failed:`, error);
    throw error; // Re-throw the error instead of using fallback
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}