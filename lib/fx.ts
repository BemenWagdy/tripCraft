export async function getFxRate(
  from: string,
  to: string
): Promise<number> {
  if (!from || !to || from === to) return 1;

  const res = await fetch(
    `https://api.exchangerate.host/convert?from=${from}&to=${to}`
  );

  if (!res.ok) throw new Error(`FX request failed (${res.status})`);

  const json = await res.json();

  // exchangerate.host returns { result: number | null }
  if (json.result == null)
    throw new Error(`Rate not found for ${from}→${to}`);

  return json.result as number;
}