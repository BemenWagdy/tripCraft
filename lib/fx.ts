// lib/fx.ts
// Lightweight wrapper around ExchangeRate.host with 15-min in-memory cache.

type CacheEntry = { ts: number; rate: number };
const cache: Record<string, CacheEntry> = {};
const TTL = 1000 * 60 * 15; // 15 minutes

export async function getFxRate(
  base: string,
  quote: string
): Promise<number> {
  const key = `${base}_${quote}`.toUpperCase();
  const now = Date.now();

  // return cached
  if (cache[key] && now - cache[key].ts < TTL) return cache[key].rate;

  const url = `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`;
  const res = await fetch(url, { next: { revalidate: TTL / 1000 } });
  if (!res.ok) throw new Error(`FX fetch failed ${res.status}`);

  const { rates } = (await res.json()) as { rates: Record<string, number> };
  const rate = rates?.[quote.toUpperCase()];
  if (!rate) throw new Error('Rate not found');

  cache[key] = { ts: now, rate };
  return rate;
}