export interface FxResult { rate: number; date: string }

export async function getFxRate(from: string, to: string): Promise<FxResult> {
  const base  = from.trim().toUpperCase();
  const quote = to.trim().toUpperCase();

  // same-currency shortcut
  if (base === quote) return { rate: 1, date: new Date().toISOString().slice(0,10) };

  const url = `https://api.exchangerate.host/convert?from=${base}&to=${quote}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });   // 1 h cache
  if (!res.ok) throw new Error(`FX request failed – ${res.status}`);

  const j = await res.json();   // { result: number|null, date: "YYYY-MM-DD", … }

  if (typeof j.result === 'number') return { rate: j.result, date: j.date };
  throw new Error('Rate not found');
}