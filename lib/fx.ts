export interface FxResult {
  rate: number;
  date: string;
}

/**
 * Fetches a live foreign-exchange rate using exchangerate.host.
 * Falls back to 1 : 1 if the rate is unavailable.
 *
 * @param from ISO-4217 currency you are converting **from** (e.g. "USD")
 * @param to   ISO-4217 currency you are converting **to**   (e.g. "EUR")
 */
export async function getFxRate(from: string, to: string): Promise<FxResult> {
  if (from.toUpperCase() === to.toUpperCase()) {
    return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  }

  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(
    from
  )}&symbols=${encodeURIComponent(to)}`;

  const res = await fetch(url, { next: { revalidate: 60 * 60 } }); // 1 h cache
  if (!res.ok) throw new Error(`FX request failed – ${res.status}`);

  const json = await res.json();
  const rate = json?.rates?.[to.toUpperCase()];
  if (!rate) throw new Error('Rate not found');

  return { rate, date: json.date ?? new Date().toISOString().slice(0, 10) };
}