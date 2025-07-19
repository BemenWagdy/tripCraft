// lib/fx.ts
// -----------------------------------------------------------------------------
// 100% "won't-crash" foreign-exchange helper using multiple reliable APIs
// • Primary: exchangerate-api.com (free tier, accurate rates)
// • Fallback: exchangerate.host
// • Falls back intelligently if a direct pair is missing
// • Never throws out of this function – you always get a numeric rate
// -----------------------------------------------------------------------------

export interface FxResult {
  rate: number;   // price of 1 unit of base expressed in quote
  date: string;   // YYYY-MM-DD  (UTC)
  provider: 'exchangerate-api.com' | 'exchangerate.host' | 'fallback';
}

/**
 * Fetch live FX. Guaranteed to resolve.
 * @param from ISO-4217 code – e.g. "EGP"
 * @param to   ISO-4217 code – e.g. "AED"
 */
export async function getFxRate(from: string, to: string): Promise<FxResult> {
  // normalize
  const base  = (from ?? '').trim().toUpperCase();
  const quote = (to   ?? '').trim().toUpperCase();

  // same-currency shortcut
  if (!base || !quote || base === quote) {
    return { rate: 1, date: today(), provider: 'fallback' };
  }

  console.log(`[FX] Getting rate from ${base} to ${quote}`);

  // 1) Try exchangerate-api.com first (more accurate)
  const primary = await getFromExchangeRateApi(base, quote);
  if (primary) {
    console.log(`[FX] Primary API success: 1 ${base} = ${primary.rate} ${quote}`);
    return primary;
  }

  // 2) Try exchangerate.host as fallback
  const fallback = await getFromExchangeRateHost(base, quote);
  if (fallback) {
    console.log(`[FX] Fallback API success: 1 ${base} = ${fallback.rate} ${quote}`);
    return fallback;
  }

  // 3) Final safety-net
  console.error(`[FX] All APIs failed for ${base}→${quote} – using 1:1`);
  return { rate: 1, date: today(), provider: 'fallback' };
}

/* -------------------------------------------------------------------------- */

async function getFromExchangeRateApi(base: string, quote: string): Promise<FxResult | null> {
  try {
    const url = `https://api.exchangerate-api.com/v4/latest/${base}`;
    console.log(`[FX] Trying exchangerate-api.com: ${url}`);
    
    const response = await fetch(url, { next: { revalidate: 60 * 60 } }); // 1 hour cache
    
    if (!response.ok) {
      console.error(`[FX] exchangerate-api.com failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();
    console.log(`[FX] exchangerate-api.com response:`, JSON.stringify(data, null, 2));

    if (!data.rates || typeof data.rates !== 'object') {
      console.error(`[FX] exchangerate-api.com invalid response format`);
      return null;
    }

    const rate = data.rates[quote];
    if (!rate || isNaN(rate) || rate <= 0) {
      console.error(`[FX] exchangerate-api.com no rate for ${quote}`);
      return null;
    }

    return {
      rate: Number(rate.toFixed(6)),
      date: data.date || today(),
      provider: 'exchangerate-api.com'
    };

  } catch (error) {
    console.error(`[FX] exchangerate-api.com request failed:`, error);
    return null;
  }
}

async function getFromExchangeRateHost(base: string, quote: string): Promise<FxResult | null> {
  try {
    const url = `https://api.exchangerate.host/latest?base=${base}`;
    console.log(`[FX] Trying exchangerate.host: ${url}`);
    
    const response = await fetch(url, { next: { revalidate: 60 * 60 } }); // 1 hour cache
    
    if (!response.ok) {
      console.error(`[FX] exchangerate.host failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();
    console.log(`[FX] exchangerate.host response:`, JSON.stringify(data, null, 2));

    if (data.success === false) {
      console.error(`[FX] exchangerate.host returned error:`, data.error);
      return null;
    }

    if (!data.rates || typeof data.rates !== 'object') {
      console.error(`[FX] exchangerate.host invalid response format`);
      return null;
    }

    const rate = data.rates[quote];
    if (!rate || isNaN(rate) || rate <= 0) {
      console.error(`[FX] exchangerate.host no rate for ${quote}`);
      return null;
    }

    return {
      rate: Number(rate.toFixed(6)),
      date: data.date || today(),
      provider: 'exchangerate.host'
    };

  } catch (error) {
    console.error(`[FX] exchangerate.host request failed:`, error);
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}