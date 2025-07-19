// lib/fx.ts
// -----------------------------------------------------------------------------
// SIMPLIFIED: Using only Fixer.io with API key for reliable exchange rates
// Target rates: 1 EGP ≈ 0.074 AED, 1 AED ≈ 13.46 EGP
// -----------------------------------------------------------------------------

export interface FxResult {
  rate: number;   // price of 1 unit of base expressed in quote
  date: string;   // YYYY-MM-DD  (UTC)
  provider: 'fixer' | 'fallback';
}

/**
 * Fetch live FX from Fixer.io only. Guaranteed to resolve.
 * @param from ISO-4217 code – e.g. "EGP"
 * @param to   ISO-4217 code – e.g. "AED"
 */
export async function getFxRate(from: string, to: string): Promise<FxResult> {
  const base  = (from ?? '').trim().toUpperCase();
  const quote = (to   ?? '').trim().toUpperCase();

  console.log(`[FX] STARTING: Getting rate from ${base} to ${quote}`);

  // same-currency shortcut
  if (!base || !quote || base === quote) {
    console.log('[FX] Same currency, returning 1:1');
    return { rate: 1, date: today(), provider: 'fallback' };
  }

  // Try Fixer.io with API key
  try {
    const result = await getFromFixerIo(base, quote);
    if (result) {
      console.log(`[FX] SUCCESS with Fixer.io: 1 ${base} = ${result.rate} ${quote}`);
      
      // Validate the rate makes sense for EGP/AED
      if (base === 'EGP' && quote === 'AED') {
        if (result.rate < 0.05 || result.rate > 0.15) {
          console.warn(`[FX] EGP->AED rate ${result.rate} seems wrong, expected ~0.074`);
          throw new Error(`Invalid EGP->AED rate: ${result.rate}`);
        }
      }
      if (base === 'AED' && quote === 'EGP') {
        if (result.rate < 10 || result.rate > 20) {
          console.warn(`[FX] AED->EGP rate ${result.rate} seems wrong, expected ~13.46`);
          throw new Error(`Invalid AED->EGP rate: ${result.rate}`);
        }
      }
      
      return result;
    }
  } catch (error) {
    console.error(`[FX] Fixer.io failed:`, error);
  }

  // Fallback if Fixer.io fails
  console.error(`[FX] Fixer.io failed for ${base}→${quote} – using fallback`);
  return { rate: 1, date: today(), provider: 'fallback' };
}

/* -------------------------------------------------------------------------- */

async function getFromFixerIo(base: string, quote: string): Promise<FxResult | null> {
  try {
    // Fixer.io API with provided API key
    const apiKey = 'e873239c9944dc25c2b59d1d01d71d77';
    const url = `https://api.fixer.io/latest?access_key=${apiKey}&base=${base}&symbols=${quote}`;
    console.log(`[FX] Fixer.io request: ${url}`);
    
    const response = await fetch(url, { 
      next: { revalidate: 300 },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripCraft/1.0'
      }
    });
    
    if (!response.ok) {
      console.error(`[FX] Fixer.io failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();
    console.log(`[FX] Fixer.io response:`, JSON.stringify(data, null, 2));

    if (!data.success) {
      console.error(`[FX] Fixer.io API error:`, data.error);
      return null;
    }

    if (!data.rates || typeof data.rates !== 'object') {
      console.error(`[FX] Fixer.io invalid response format`);
      return null;
    }

    const rate = data.rates[quote];
    if (!rate || isNaN(rate) || rate <= 0) {
      console.error(`[FX] Fixer.io no rate for ${quote}`);
      return null;
    }

    return {
      rate: Number(rate.toFixed(6)),
      date: data.date || today(),
      provider: 'fixer'
    };

  } catch (error) {
    console.error(`[FX] Fixer.io request failed:`, error);
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}