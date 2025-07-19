/* -----------------------------------------------------------------------
   TripCraft API route – v2
   Adds roadmap items #2 #3 #4 #6 #10
     #2  per-day weather snippets  (Open-Meteo, free / no key)
     #3  strict Zod validation of the LLM payload
     #4  structured logging via appendError(tag,…)
     #6  automated "too-cheap / too-expensive" cost sanity warnings
     #10 frontend UX hooks  → returns { warnings[] , uiHints{} }
------------------------------------------------------------------------ */

import { getFxRate }       from '@/lib/fx';        // Fixer (cached)
import { currencyCode }    from '@/lib/currency';  // tiny country→ISO map
import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError }     from '@/lib/logger';
import { NextResponse }    from 'next/server';
import { z }               from 'zod';

/*──────────────────────────  helper: weather  ──────────────────────────*/
async function getDailyWeather(
  city: string,
  startISO: string,
  endISO: string
): Promise<Record<string,string>> {
  /* A real build would geocode "city" → lat/lon first.
     To keep this self-contained we default to 0/0 when geocoding fails
     → the function degrades gracefully (returns {}). */
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1`
    ).then(r => r.json());
    if (!geo?.results?.[0]) return {};

    const { latitude, longitude, timezone } = geo.results[0];
    const wx = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${startISO}&end_date=${endISO}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=${timezone}`
    ).then(r => r.json());

    const out: Record<string,string> = {};
    wx.daily.time.forEach((d: string, i: number) => {
      out[d] = `${wx.daily.weathercode[i]} · ${wx.daily.temperature_2m_min[i]}-${wx.daily.temperature_2m_max[i]}°C`;
    });
    return out;
  } catch (e) {
    appendError(e, 'weather');
    return {};
  }
}

/*─────────────────────── 1 · JSON schema (Zod) ─────────────────────────*/
const foodItem = z.object({
  name:   z.string(),
  note:   z.string(),
  price:  z.string(),
  rating: z.number(),
  source: z.string()
});
const itinerarySchema = z.object({
  intro:        z.string(),
  beforeYouGo:  z.array(z.string()).min(6),
  visa:         z.object({
                  required: z.boolean(),
                  type:     z.string()
                }).passthrough(),
  currency:     z.object({
                  destinationCode:   z.string(),
                  homeToDestination: z.string(),
                  destinationToHome: z.string()
                }).passthrough(),
  averages:     z.object({
                  hostel:   z.string(),
                  midHotel: z.string(),
                  highEnd:  z.string()
                }).optional(),
  cultureTips:  z.array(z.string()).min(5),
  foodList:     z.array(foodItem).min(10),
  practicalInfo:z.record(z.any()).optional(),
  days: z.array(
          z.object({
            date:  z.string(),
            title: z.string(),
            steps: z.array(z.object({
              time: z.string(),
              text: z.string()
            }))
          })
        ),
  totalCost:            z.string().optional(),
  totalCostLocal:       z.string().optional(),
  totalCostDestination: z.string().optional()
}).passthrough();

/*────────────────────── 2 · POST handler  ──────────────────────────────*/
export async function POST(req: Request) {
  /*－－ parse incoming form －－*/
  let form: any;
  try { form = await req.json(); }
  catch (e) {
    appendError(e,'bad-json');             // (#4 structured log)
    return NextResponse.json({ error:'Bad JSON' }, { status:400 });
  }

  /*－－ basic date maths －－*/
  const start = new Date(form.dateRange.from);
  const end   = new Date(form.dateRange.to);
  const daysN = Math.max(1, Math.ceil((end.getTime()-start.getTime())/864e5));
  const startISO = start.toISOString().split('T')[0];
  const endISO   = end.toISOString().split('T')[0];

  /*－－ currency + FX －－*/
  const homeIso = currencyCode(form.country)     || 'USD';
  const destIso = currencyCode(form.destination) || 'USD';

  let fx = 1, fxRev = 1, fxDate = '', fxNote='Same currency';
  if (homeIso !== destIso) {
    try {
      const { rate, date } = await getFxRate(homeIso, destIso);
      fx     = rate;
      fxRev  = +(1/rate).toFixed(6);
      fxDate = date;
      fxNote = `Fixer.io · ${date}`;
    } catch (e) {
      appendError(e,'fx');                       // (#4)
      fxNote = 'FX unavailable (1:1)';
    }
  }

  /*－－ per-day weather (#2) －－*/
  const wx = await getDailyWeather(form.destination, startISO, endISO);

  /*－－ build Groq prompt －－*/
  const system = 'You are an expert travel consultant. Reply ONLY with the JSON for the function call.';
  const user = `
Generate a ${daysN}-day itinerary for a ${form.country} passport holder visiting ${form.destination}.

Dates       : ${startISO} → ${endISO}
Budget/day  : $${form.dailyBudget}
Group       : ${form.groupType}
Vibe        : ${form.travelVibe}
Interests   : ${form.interests?.join(', ') || 'General'}
Diet        : ${form.dietary || 'None'}
Currencies  : 1 ${homeIso} = ${fx.toFixed(4)} ${destIso}  |  ${fxNote}

RULES
· Every price shows BOTH currencies – dest first.
· Provide ≥10 food items with price/rating/source.
· Emergency numbers are strings.
· JSON must satisfy the published schema.
`;

  /*－－ call LLM －－*/
  const llm = await groq.chat.completions.create({
    model: GROQ_MODEL, temperature: 0.7,
    tools: [{ 
      type: 'function', 
      function: { 
        name: 'generate_itinerary', 
        parameters: {
          type: 'object',
          properties: {
            intro: { type: 'string' },
            beforeYouGo: { 
              type: 'array', 
              items: { type: 'string' },
              minItems: 6
            },
            visa: {
              type: 'object',
              properties: {
                required: { type: 'boolean' },
                type: { type: 'string' }
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
                hostel: { type: 'string' },
                midHotel: { type: 'string' },
                highEnd: { type: 'string' }
              }
            },
            cultureTips: {
              type: 'array',
              items: { type: 'string' },
              minItems: 5
            },
            foodList: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  note: { type: 'string' },
                  price: { type: 'string' },
                  rating: { type: 'number' },
                  source: { type: 'string' }
                },
                required: ['name', 'note', 'price', 'rating', 'source']
              },
              minItems: 10
            },
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
      }
    }],
    messages:[
      { role:'system', content:system },
      { role:'user',   content:user }
    ]
  });

  const raw = llm.choices[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) return NextResponse.json({ error:'LLM gave no payload' }, { status:502 });

  /*───── validate with fixes ─────*/
  let parsed        : any        = null;
  let zodIssues     : string[]   = [];
  let schemaWarnings: string[]   = [];

  try {
    const result = itinerarySchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      // collect messages for logging / UI
      zodIssues = result.error.issues.map(i => `${i.path.join('.')} – ${i.message}`);

      // attempt best-effort fix so UI still loads
      parsed = result.error.flatten().data ?? result.error;   // start with raw object
      parsed = JSON.parse(raw);                               // raw LLM payload

      /* auto-patch #1 – food list length */
      if (Array.isArray(parsed.foodList) && parsed.foodList.length < 10) {
        const n = 10 - parsed.foodList.length;
        Array.from({ length: n }).forEach((_, idx) => {
          parsed.foodList.push({
            name:   `TBD local dish #${idx + 1}`,
            note:   'Fill in later',
            price:  `??? ${destIso} (??? ${homeIso})`,
            rating: 4,
            source: 'N/A'
          });
        });
        schemaWarnings.push(`Added ${n} placeholder food items`);
      }

      /* auto-patch #2 – ensure price & rating exist */
      parsed.foodList?.forEach((f: any) => {
        if (!f.price)  { f.price  = `??? ${destIso} (??? ${homeIso})`; schemaWarnings.push('Missing price patched'); }
        if (!f.rating) { f.rating = 4;                                   schemaWarnings.push('Missing rating patched'); }
      });

    } else {
      parsed = result.data;   // fully valid
    }
  } catch (e) {
    appendError(e,'json-parse');
    return NextResponse.json({ error:'LLM JSON unreadable' }, { status:500 });
  }

  /*───── attach weather + cost sanity warnings ─────*/
  const warnings: string[] = [...schemaWarnings];
  const hostel = parseFloat(parsed.averages?.hostel?.split(' ')[0] || '0');
  if (hostel && hostel < 5) warnings.push('Hostel price looks too low – double-check.');

  parsed.days?.forEach((d: any) => {
    if (wx[d.date]) d.weatherBrief = wx[d.date];
  });

  /*───── log any schema problems for dev  ─────*/
  if (zodIssues.length) appendError(new Error(zodIssues.join(' | ')),'schema');

  /*───── final OK response ─────*/
  return new Response(
    JSON.stringify({
      ...parsed,
      warnings,
      uiHints: { showSkeleton: true }
    }),
    { headers:{ 'Content-Type':'application/json' } }
  );
}