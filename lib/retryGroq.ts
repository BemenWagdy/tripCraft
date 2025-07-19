/* lib/retryGroq.ts
   Simple exponential-back-off (max 3 tries, 2s cap) */
import { groq, GROQ_MODEL } from '@/lib/groq';

export async function chatWithRetry(payload: any, max = 3) {
  let delay = 500;                                 // first wait 0.5 s
  for (let i = 0; i < max; i++) {
    try {
      return await groq.chat.completions.create(payload);
    } catch (err: any) {
      const code = err?.status || err?.code || '';
      if (i === max - 1 || code === 400) throw err; // config error => don't retry
      console.warn(`[Groq-retry] ${code} → retrying in ${delay} ms`);
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 2000);            // exponential up to 2 s
    }
  }
}