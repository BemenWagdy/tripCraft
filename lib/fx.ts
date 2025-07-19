// lib/fx.ts
// -----------------------------------------------------------------------------
// 100% "won't-crash" foreign-exchange helper using exchangerate.host /latest API
// • Works with ~170 ISO-4217 currencies via exchangerate.host
// • Falls back intelligently if a direct pair is missing
// • Never throws out of this function – you always get a numeric rate
// -----------------------------------------------------------------------------

export interface FxResult {
  rate: number;   // price of 1 unit of base expressed in quote
  date: string;   // YYYY-MM-DD  (UTC)
  provider: 'exchangerate.host' | 'fallback';
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

  // 1) Try getting rates with base currency
  const direct = await getLatestRates(base, quote);
  if (direct) {
    console.log(`[FX] Direct rate found: 1 ${base} = ${direct.rate} ${quote}`);
    return direct;
  }

  // 2) Try USD as base and calculate cross rate
  const usdRates = await getLatestRates('USD', null);
  if (usdRates && usdRates.rates) {
    const baseToUsd = usdRates.rates[base];
    const quoteToUsd = usdRates.rates[quote];
    
    if (baseToUsd && quoteToUsd) {
      // If USD rates are available, calculate cross rate
      // Rate = (1 base / baseToUsd) * quoteToUsd = quoteToUsd / baseToUsd
      const crossRate = quoteToUsd / baseToUsd;
      console.log(`[FX] Cross rate calculated: 1 ${base} = ${crossRate} ${quote} (via USD)`);
      return {
        rate: Number(crossRate.toFixed(6)),
        date: usdRates.date,
        provider: 'exchangerate.host'
      };
    }
  }

  // 3) Final safety-net
  console.error(`[FX] No rate found for ${base}→${quote} – using 1:1`);
  return { rate: 1, date: today(), provider: 'fallback' };
}

/* -------------------------------------------------------------------------- */

interface LatestRatesResponse {
  rates: { [currency: string]: number };
  date: string;
}

async function getLatestRates(baseCurrency: string, targetCurrency?: string | null): Promise<FxResult | LatestRatesResponse | null> {
  const url = `https://api.exchangerate.host/latest?base=${baseCurrency}`;
  
  try {
    console.log(`[FX] Fetching: ${url}`);
    const response = await fetch(url, { next: { revalidate: 60 * 60 } }); // 1 hour cache
    
    if (!response.ok) {
      console.error(`[FX] API request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: any = await response.json();
    console.log(`[FX] API Response:`, JSON.stringify(data, null, 2));

    // Check if the API response indicates success
    if (data.success === false) {
      console.error(`[FX] API returned error:`, data.error);
      return null;
    }

    if (!data.rates || typeof data.rates !== 'object') {
      console.error(`[FX] Invalid response format - no rates object`);
      return null;
    }

    // If we're looking for a specific target currency, return FxResult
    if (targetCurrency) {
      const rate = data.rates[targetCurrency];
      if (rate && !isNaN(rate) && rate > 0) {
        return {
          rate: Number(rate.toFixed(6)),
          date: data.date || today(),
          provider: 'exchangerate.host'
        };
      }
      return null;
    }

    // Otherwise return the full rates response for cross-calculation
    return {
      rates: data.rates,
      date: data.date || today()
    };

  } catch (error) {
    console.error(`[FX] Request failed:`, error);
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}