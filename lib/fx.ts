// lib/fx.ts
// -----------------------------------------------------------------------------
// COMPLETELY REWRITTEN: Fixed exchange rate API using reliable source
// Testing with EGP to AED should show: 1 EGP ≈ 0.074 AED, 1 AED ≈ 13.46 EGP
// -----------------------------------------------------------------------------

export interface FxResult {
  rate: number;   // price of 1 unit of base expressed in quote
  date: string;   // YYYY-MM-DD  (UTC)
  provider: 'exchange-api' | 'freeconvert' | 'fallback';
}

/**
 * Fetch live FX. Guaranteed to resolve.
 * @param from ISO-4217 code – e.g. "EGP"
 * @param to   ISO-4217 code – e.g. "AED"
 */
export async function getFxRate(from: string, to: string): Promise<FxResult> {
  const base  = (from ?? '').trim().toUpperCase();
  const quote = (to   ?? '').trim().toUpperCase();

  console.log(`[FX] Getting rate from ${base} to ${quote}`);

  // same-currency shortcut
  if (!base || !quote || base === quote) {
    console.log('[FX] Same currency, returning 1:1');
    return { rate: 1, date: today(), provider: 'fallback' };
  }

  // 1) Try exchange-api.com (more reliable for Middle East currencies)
  const primary = await getFromExchangeApi(base, quote);
  if (primary) {
    console.log(`[FX] Primary API success: 1 ${base} = ${primary.rate} ${quote}`);
    return primary;
  }

  // 2) Try freeconvertapi as fallback
  const fallback = await getFromFreeConvertApi(base, quote);
  if (fallback) {
    console.log(`[FX] Fallback API success: 1 ${base} = ${fallback.rate} ${quote}`);
    return fallback;
  }

  // 3) Final safety-net
  console.error(`[FX] All APIs failed for ${base}→${quote} – using 1:1`);
  return { rate: 1, date: today(), provider: 'fallback' };
}

/* -------------------------------------------------------------------------- */

async function getFromExchangeApi(base: string, quote: string): Promise<FxResult | null> {
  try {
    // Use exchange-api.com which is more reliable for EGP/AED rates
    const url = `https://api.exchangerate-api.com/v4/latest/${base}`;
    console.log(`[FX] Trying exchange-api.com: ${url}`);
    
    const response = await fetch(url, { 
      next: { revalidate: 300 }, // 5 minute cache
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripCraft/1.0'
      }
    });
    
    if (!response.ok) {
      console.error(`[FX] exchange-api.com failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();
    console.log(`[FX] exchange-api.com response for ${base}:`, JSON.stringify(data, null, 2));

    if (!data.rates || typeof data.rates !== 'object') {
      console.error(`[FX] exchange-api.com invalid response format`);
      return null;
    }

    const rate = data.rates[quote];
    if (!rate || isNaN(rate) || rate <= 0) {
      console.error(`[FX] exchange-api.com no rate for ${quote}, available rates:`, Object.keys(data.rates));
      return null;
    }

    // Validate the rate makes sense for EGP->AED (should be around 0.074)
    if (base === 'EGP' && quote === 'AED' && (rate < 0.05 || rate > 0.15)) {
      console.warn(`[FX] EGP->AED rate ${rate} seems suspicious, expected ~0.074`);
    }

    // Validate the rate makes sense for AED->EGP (should be around 13.46)
    if (base === 'AED' && quote === 'EGP' && (rate < 10 || rate > 20)) {
      console.warn(`[FX] AED->EGP rate ${rate} seems suspicious, expected ~13.46`);
    }

    return {
      rate: Number(rate.toFixed(6)),
      date: data.date || today(),
      provider: 'exchange-api'
    };

  } catch (error) {
    console.error(`[FX] exchange-api.com request failed:`, error);
    return null;
  }
}

async function getFromFreeConvertApi(base: string, quote: string): Promise<FxResult | null> {
  try {
    // Use different endpoint for cross-validation
    const url = `https://api.freeconvert.com/v1/currencies/convert?from=${base}&to=${quote}&amount=1`;
    console.log(`[FX] Trying freeconvert API: ${url}`);
    
    const response = await fetch(url, { 
      next: { revalidate: 300 },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[FX] freeconvert API failed: ${response.status}`);
      return null;
    }

    const data: any = await response.json();
    console.log(`[FX] freeconvert API response:`, JSON.stringify(data, null, 2));

    const rate = data.result;
    if (!rate || isNaN(rate) || rate <= 0) {
      console.error(`[FX] freeconvert API invalid rate:`, rate);
      return null;
    }

    return {
      rate: Number(rate.toFixed(6)),
      date: today(),
      provider: 'freeconvert'
    };

  } catch (error) {
    console.error(`[FX] freeconvert API request failed:`, error);
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}