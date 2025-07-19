/* app/lib/fx.ts
   ------------------------------------------------------------------
   Bullet-proof FX helper: ➊ tries exchangerate.host (free, no key)
                           ➋ falls back to Fixer *only* if you set
                              FIXER_API_KEY in .env.local
                           ➌ if both fail → returns 1 so app still runs
   ------------------------------------------------------------------ */

export interface FxResult {
  rate: number          // price of ONE unit of base in quote
  date: string          // YYYY-MM-DD
  provider: string      // 'exchangerate.host' | 'fixer' | 'fallback'
}

const one = (d = new Date()) => d.toISOString().slice(0, 10)

export async function getFxRate (base: string, quote: string): Promise<FxResult> {
  base  = base?.trim().toUpperCase()
  quote = quote?.trim().toUpperCase()

  /* Same-currency shortcut ------------------------------------------------ */
  if (!base || !quote || base === quote) {
    return { rate: 1, date: one(), provider: 'fallback' }
  }

  /* 1️⃣ exchangerate.host -------------------------------------------------- */
  try {
    const url = `https://api.exchangerate.host/convert?from=${base}&to=${quote}`
    const r   = await fetch(url, { next: { revalidate: 3600 } }) // 1 h cache
    if (!r.ok) throw new Error(`status ${r.status}`)
    const j   = await r.json()
    const rate = j?.result ?? j?.info?.rate
    if (rate) return { rate, date: j.date ?? one(), provider: 'exchangerate.host' }
  } catch (e) {
    console.warn('[FX] exchangerate.host failed →', e)
  }

  /* 2️⃣ Fixer (requires key) --------------------------------------------- */
  const fixerKey = process.env.FIXER_API_KEY
  if (fixerKey) {
    try {
      const url = `https://data.fixer.io/api/latest?access_key=${fixerKey}&base=${base}&symbols=${quote}`
      const r   = await fetch(url)
      const j   = await r.json()
      if (j?.success && j.rates?.[quote]) {
        return { rate: j.rates[quote], date: j.date ?? one(), provider: 'fixer' }
      }
      throw new Error(`Fixer error: ${j?.error?.code ?? 'unknown'}`)
    } catch (e) {
      console.warn('[FX] Fixer failed →', e)
    }
  }

  /* 3️⃣ Hard fallback ------------------------------------------------------ */
  console.error('[FX] ALL sources failed – returning 1:1')
  return { rate: 1, date: one(), provider: 'fallback' }
}