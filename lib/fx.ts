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

  console.log(`[FX] ===== STARTING FX LOOKUP =====`);
  console.log(`[FX] From: ${base} -> To: ${quote}`);
  console.log(`[FX] About to call Fixer.io API...`);

  // same-currency shortcut
  if (!base || !quote || base === quote) {
    console.log('[FX] Same currency, returning 1:1');
    return { rate: 1, date: today(), provider: 'fallback' };
  }

  // Try Fixer.io with API key
  try {
    console.log(`[FX] Calling Fixer.io for ${base} -> ${quote}`);
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
    console.error(`[FX] Fixer.io FAILED with error:`, error);
  }

  // Fallback if Fixer.io fails
  console.error(`[FX] ALL APIs FAILED for ${base}→${quote} – using fallback rate 1:1`);
  return { rate: 1, date: today(), provider: 'fallback' };
}

/* -------------------------------------------------------------------------- */

async function getFromFixerIo(base: string, quote: string): Promise<FxResult | null> {
  try {
    console.log(`[FX] === FIXER.IO API CALL ===`);
    // Fixer.io API with provided API key
    const apiKey = 'e873239c9944dc25c2b59d1d01d71d77';
    const url = `https://api.fixer.io/latest?access_key=${apiKey}&base=${base}&symbols=${quote}`;
    console.log(`[FX] Making HTTP request to: ${url}`);
    console.log(`[FX] Using API key: ${apiKey}`);
    
    console.log(`[FX] About to call fetch()...`);
    const response = await fetch(url, { 
      next: { revalidate: 300 },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripCraft/1.0'
      }
    });
    console.log(`[FX] Fetch completed. Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`[FX] Fixer.io HTTP error: ${response.status} ${response.statusText}`);
      return null;
    }

    console.log(`[FX] Parsing JSON response...`);
    const data: any = await response.json();
    console.log(`[FX] Fixer.io full response:`, JSON.stringify(data, null, 2));

    if (!data.success) {
      console.error(`[FX] Fixer.io API returned success=false`);
      console.error(`[FX] Error details:`, data.error);
      return null;
    }

    if (!data.rates || typeof data.rates !== 'object') {
      console.error(`[FX] Fixer.io invalid response format`);
      return null;
    }

    const rate = data.rates[quote];
    if (!rate || isNaN(rate) || rate <= 0) {
      console.error(`[FX] No valid rate found for ${quote} in response rates:`, data.rates);
      console.error(`[FX] Fixer.io no rate for ${quote}`);
      return null;
    }

    return {
      rate: Number(rate.toFixed(6)),
      date: data.date || today(),
      provider: 'fixer'
    };

  } catch (error) {
    console.error(`[FX] Fixer.io request COMPLETELY FAILED:`, error);
    console.error(`[FX] Error stack:`, error instanceof Error ? error.stack : 'No stack');
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}