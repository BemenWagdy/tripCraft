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

  const url = `https://api.exchangerate.host/convert?from=${base}&to=${quote}&amount=1`;
  const res = await fetch(url, { next: { revalidate: TTL / 1000 } });
  if (!res.ok) throw new Error(`FX fetch failed ${res.status}`);

  const { result } = (await res.json()) as { result: number | null };
  if (!result) throw new Error(`Pair ${base}/${quote} not supported`);

  cache[key] = { ts: now, rate: result };
  return result;
}