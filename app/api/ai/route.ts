/* ---------------------------------------------------------------------
   TripCraft – resilient itinerary endpoint (Groq-only)
------------------------------------------------------------------------ */

import { getFxRate }     from '@/lib/fx';
import { currencyCode }  from '@/lib/currency';
import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError }   from '@/lib/logger';
import { NextResponse }  from 'next/server';

/* ───── 0 – helper: Groq with 3-try exponential back-off ───────────── */
async function chatWithRetry(payload: any, tries = 3) {
  let delay = 500;
  for (let i = 0; i < tries; i++) {
    try { return await groq.chat.completions.create(payload); }
    catch (err: any) {
      const code = err?.status || err?.code || '';
      if (i === tries - 1 || code === 400) throw err;   // 400 = bad payload
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 2000);
    }
  }
}

/* ───── 1 – JSON schema ────────────────────────────────────────────── */
const schema = {
  name: 'generate_itinerary',
  parameters: {
    type: 'object',
    properties: {
      intro: { type: 'string' },
      beforeYouGo: { 
        type: 'array', 
        items: { type: 'string' }
      },
      visa: {
        type: 'object',
        properties: {
          required: { type: 'boolean' },
          type: { type: 'string' },
          applicationMethod: { type: 'string' },
          processingTime: { type: 'string' },
          fee: { type: 'string' },
          validityPeriod: { type: 'string' },
          appointmentWarning: { type: 'string' },
          additionalRequirements: { type: 'string' }
        },
        required: ['required', 'type']
      },
      currency: {
        type: 'object',
        properties: {
          destinationCode: { type: 'string' },
          homeToDestination: { type: 'string' },
          destinationToHome: { type: 'string' }
        },
        required: ['destinationCode', 'homeToDestination', 'destinationToHome']
      },
      averages: {
        type: 'object',
        properties: {
          hostel: { type: 'number' },
          midHotel: { type: 'number' },
          highEnd: { type: 'number' }
        }
      },
      cultureTips: {
        type: 'array',
        items: { type: 'string' }
      },
      foodList: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            note: { type: 'string' },
            rating: { type: 'number' },
            source: { type: 'string' }
          },
          required: ['name', 'rating', 'source']
        }
      },
      practicalInfo: {
        type: 'object',
        properties: {
          powerPlugType: { type: 'string' },
          simCardOptions: { type: 'string' },
          emergencyNumbers: { type: 'string' },
          commonScams: { type: 'string' },
          safetyApps: { type: 'string' },
          healthRequirements: { type: 'string' }
        }
      },
      tips: { type: 'string' },
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            title: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },
                  text: { type: 'string' }
                },
                required: ['time', 'text']
              }
            }
          },
          required: ['date', 'title', 'steps']
        }
      },
      totalCost: { type: 'string' },
      totalCostLocal: { type: 'string' },
      totalCostDestination: { type: 'string' }
    },
    required: ['intro', 'beforeYouGo', 'visa', 'currency', 'cultureTips', 'foodList', 'days']
  }
};

/* ───── 2 – handler ───────────────────────────────────────────────── */
export async function POST(req: Request) {
  /* a) safe-parse form */
  let form: any;
  try { form = await req.json(); }
  catch (e) {
    appendError(e,'bad-json');
    return NextResponse.json({ error:'Invalid JSON' },{ status:400 });
  }

  /* b) dates */
  const start = new Date(form.dateRange.from);
  const end   = new Date(form.dateRange.to);
  const days  = Math.max(1, Math.ceil((end.getTime()-start.getTime())/864e5));

  /* c) currency */
  const homeIso = currencyCode(form.country)     || 'USD';
  const destIso = currencyCode(form.destination) || 'USD';
  let fx = 1, fxRev = 1, fxDate = '', fxNote = 'Same currency';
  if (homeIso !== destIso) {
    try {
      const r = await getFxRate(homeIso, destIso);
      fx     = r.rate;
      fxRev  = +(1/fx).toFixed(6);
      fxDate = r.date;
      fxNote = `Fixer.io · ${fxDate}`;
    } catch (e) { appendError(e,'fx'); }
  }

  /* d) build prompt (enriched Before-You-Go, Visa, city snapshot) */
  const sys = `You are an expert travel consultant.
Return ONLY the JSON object for the function call – nothing else.`;

  const user = `
Write a 2-sentence snapshot highlighting what makes **${form.destination}** special.

Before-You-Go:
• List 8-10 *country-specific* actions: vaccines, embassy reg, mandatory apps,
  SIM/eSIM hacks, toll passes, driving permits, advance attraction bookings, etc.

Visa (for ${form.country} citizens):
• Status, exact type, cost in BOTH currencies, how/where to apply,
  processing time, and ≥3 additional requirements (photos, funds, insurance…).

Then produce the full itinerary per attached JSON schema.

TRIP INFO
Dates   : ${form.dateRange.from} → ${form.dateRange.to} (${days} days)
Budget  : $${form.dailyBudget}/day
Group   : ${form.groupType} · ${form.travelVibe}
Interests: ${form.interests?.join(', ') || 'General'}
Diet    : ${form.dietary || 'None'}

CURRENCY
1 ${homeIso} = ${fx.toFixed(4)} ${destIso}
1 ${destIso} = ${fxRev.toFixed(4)} ${homeIso}
${fxNote}

RULES
• ≥10 food items; each needs price, rating, source.
• EVERY price shows BOTH currencies: "${destIso} amount (${homeIso} amount)".
• Emergency numbers must be *strings*.
• Follow the JSON schema exactly.
`;

  const payload = {
    model: GROQ_MODEL,
    temperature: 0.7,
    tools: [{ type:'function', function: schema }],
    messages: [
      { role:'system', content: sys },
      { role:'user',   content: user }
    ]
  };

  /* e) Groq with retry */
  let callArgs: string | undefined;
  try {
    const c = await chatWithRetry(payload);
    callArgs = c.choices[0].message.tool_calls?.[0]?.function?.arguments;
  } catch (err) {
    appendError(err,'groq-fail');
    return NextResponse.json(
      { error:'AI service temporarily unavailable. Please try again.' },
      { status:503 }
    );
  }

  /* f) validate + respond */
  try {
    const itinerary = JSON.parse(callArgs ?? '{}');
    return new Response(JSON.stringify(itinerary), {
      headers:{ 'Content-Type':'application/json' }
    });
  } catch (e) {
    appendError(e,'json-parse');
    return NextResponse.json(
      { error:'Malformed AI JSON – please retry.' },
      { status:500 }
    );
  }
}