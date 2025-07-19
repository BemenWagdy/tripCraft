// lib/fx.ts
// -----------------------------------------------------------------------------
// 100 % "won't-crash" foreign-exchange helper.
// • Works with ~170 ISO-4217 currencies (and BTC/ETH) via exchangerate.host
// • Falls back intelligently if a direct pair is missing
// • Never throws out of this function – you always get a numeric rate
// -----------------------------------------------------------------------------

export interface FxResult {
  rate: number;   // price of 1 unit of base expressed in quote
  date: string;   // YYYY-MM-DD  (UTC)
  provider: 'exchangerate.host' | 'fallback';
}

/**
 * Fetch live FX.  Guaranteed to resolve.
 * @param from ISO-4217 code – e.g. "EGP"
 * @param to   ISO-4217 code – e.g. "AED"
 */
export async function getFxRate(from: string, to: string): Promise<FxResult> {
  // ­­­normalise ­­­
  const base  = (from ?? '').trim().toUpperCase();
  const quote = (to   ?? '').trim().toUpperCase();

  // same-currency shortcut
  if (!base || !quote || base === quote) {
    return { rate: 1, date: today(), provider: 'fallback' };
  }

  // 1) try direct pair
  const direct = await call(`/convert?from=${base}&to=${quote}`);
  if (direct) return direct;

  // 2) cross-via-USD (rare exotic pairs)
  const leg1 = await call(`/convert?from=${base}&to=USD`);
  const leg2 = await call(`/convert?from=USD&to=${quote}`);
  if (leg1 && leg2) {
    return {
      rate: Number((leg1.rate * leg2.rate).toFixed(6)),
      date: leg1.date,                    // both legs have the same date
      provider: 'exchangerate.host',
    };
  }

  // 3) final safety-net
  console.error(`[FX] totally missing pair ${base}→${quote} – using 1:1.`);
  return { rate: 1, date: today(), provider: 'fallback' };
}

/* -------------------------------------------------------------------------- */

async function call(endpoint: string): Promise<FxResult | null> {
  const url = `https://api.exchangerate.host${endpoint}`;
  try {
    const r = await fetch(url, { next: { revalidate: 60 * 60 } }); // 1 h cache
    
    if (!r.ok) {
      console.error(`[FX] API request failed: ${r.status} ${r.statusText}`);
      return null;
    }
    
    const j: any = await r.json();
    
    // Debug logging to see what the API actually returns
    console.log(`[FX] API Response for ${endpoint}:`, JSON.stringify(j, null, 2));
    
    // Check if the API response indicates success
    if (j.success === false) {
      console.error(`[FX] API returned error:`, j.error);
      return null;
    }
    
    const val = Number(j.result ?? j.info?.rate);
    
    if (!val || Number.isNaN(val) || val <= 0) {
      console.error(`[FX] Invalid rate value:`, val, 'from response:', j);
      return null;
    }
    
    const dt  = (j.date || j.info?.timestamp
                 ? new Date(j.date ?? j.info.timestamp * 1000)
                 : new Date()).toISOString().slice(0, 10);
                 
    console.log(`[FX] Parsed rate: ${val}, date: ${dt}`);
    return { rate: val, date: dt, provider: 'exchangerate.host' };
  } catch (error) {
    console.error(`[FX] Request failed for ${endpoint}:`, error);
    return null;                         // swallow – we handle fallback above
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}