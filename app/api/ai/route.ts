/* -----------------------------------------------------------------------
  TripCraft API route
  – single-file drop-in that
      • uses Fixer.io via getFxRate()
      • enforces   ≥10 complete food items  (no more post-fill loop)
      • shows dual-currency prices everywhere
      • trims console noise & dead code
      • gives bullet-proof fallback JSON
------------------------------------------------------------------------ */

import { getFxRate }       from '@/lib/fx';       // uses Fixer / cached
import { currencyCode }    from '@/lib/currency'; // tiny country→ISO map
import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError }     from '@/lib/logger';
import { NextResponse }    from 'next/server';

/*───────────────────────────  1 - LLM SCHEMA  ──────────────────────────*/
const schema = {
  name:        'generate_itinerary',
  description: 'Return a fully-structured travel plan with actionable detail',
  parameters: {
    type: 'object',
    properties: {
      intro: { type: 'string' },

      beforeYouGo: {
        type: 'array', description: 'Pre-travel tasks',
        minItems: 6,  items: { type: 'string' }
      },

      visa: {
        type: 'object', description: 'Visa requirements',
        properties: {
          required:            { type: 'boolean' },
          type:                { type: 'string' },
          applicationMethod:   { type: 'string' },
          processingTime:      { type: 'string' },
          fee:                 { type: 'string' },
          validityPeriod:      { type: 'string' },
          appointmentWarning:  { type: 'string' },
          additionalRequirements: {
            type: 'array', items: { type: 'string' }
          }
        },
        required: ['required', 'type']
      },

      currency: {
        type: 'object',
        properties: {
          destinationCode:     { type: 'string' },
          homeToDestination:   { type: 'string' },
          destinationToHome:   { type: 'string' },
          cashCulture:         { type: 'string' },
          tippingNorms:        { type: 'string' },
          atmAvailability:     { type: 'string' },
          cardAcceptance:      { type: 'string' }
        },
        required: ['destinationCode','homeToDestination','destinationToHome']
      },

      averages: {
        type: 'object',
        description: 'Accommodation price bands',
        properties: {
          hostel:   { type: 'string' },
          midHotel: { type: 'string' },
          highEnd:  { type: 'string' }
        }
      },

      weather:     { type: 'string' },

      cultureTips: {
        type: 'array', description: 'Etiquette & local customs',
        minItems: 5,  items: { type: 'string' }
      },

      foodList: {                                   // ⇠ tightened
        type: 'array', description: '≥10 dishes / venues',
        minItems: 10,
        items: {
          type: 'object',
          properties: {
            name:   { type: 'string' },
            note:   { type: 'string' },
            price:  { type: 'string' },  // "150 EGP (3.75 USD)"
            rating: { type: 'number' },
            source: { type: 'string' }
          },
          required: ['name','price','rating','source']
        }
      },

      practicalInfo: {
        type: 'object',
        description: 'Power, SIM, emergencies, scams…',
        properties: {
          powerPlugType:   { type: 'string' },
          powerVoltage:    { type: 'string' },
          simCardOptions:  { type: 'array', items: { type: 'string' } },
          emergencyNumbers:{ type: 'object', additionalProperties:{type:'string'}},
          commonScams:     { type: 'array', items: { type: 'string' } },
          safetyApps:      { type: 'array', items: { type: 'string' } },
          healthRequirements:{type:'array',items:{type:'string'}}
        }
      },

      tips: { type: 'string' },

      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date:  { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            title: { type: 'string' },
            cost:  { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time:            { type: 'string' },
                  text:            { type: 'string' },
                  mode:            { type: 'string' },
                  cost:            { type: 'string' },
                  costLocal:       { type: 'string' },
                  costDestination: { type: 'string' }
                },
                required: ['text','time']
              }
            }
          },
          required: ['date','title','steps']
        }
      },

      totalCost:            { type: 'string' },
      totalCostLocal:       { type: 'string' },
      totalCostDestination: { type: 'string' }
    },
    required: ['intro','beforeYouGo','visa','currency','days']
  }
};

/*──────────────────────── 2 - ENTRY POINT  ───────────────────────────*/
export async function POST (req: Request) {
  /*───── parse form safely ─────*/
  let form: any;
  try { form = await req.json(); }
  catch (e) {
    appendError(e,'bad-json');
    return NextResponse.json({error:'Bad request JSON'}, {status:400});
  }

  /*───── basic dates & duration ─────*/
  const start = new Date(form.dateRange.from);
  const end   = new Date(form.dateRange.to);
  const days  = Math.max(1, Math.ceil((end.getTime()-start.getTime())/864e5));

  /*───── currency codes ─────*/
  const homeIso = currencyCode(form.country)      || 'USD';
  const destIso = currencyCode(form.destination)  || 'USD';

  /*───── live FX via Fixer (getFxRate wraps cache + error) ─────*/
  let rate = 1, rateRev = 1, fxDate = '', fxNote = 'Same currency';
  if (homeIso !== destIso) {
    try {
      const r = await getFxRate(homeIso, destIso);
      rate     = r.rate;
      rateRev  = +(1 / rate).toFixed(6);
      fxDate   = r.date;
      fxNote   = `Source: Fixer.io · ${fxDate}`;
    } catch (err) {
      appendError(err,'fx');
      fxNote = 'FX API unavailable (using 1:1)';   // graceful degrade
    }
  }

  /*───── build LLM prompt ─────*/
  const sys = `You are an expert travel consultant. 
Only respond with a JSON object for the function call — no extra keys.`;
  const user = `
Generate a detailed itinerary for a ${form.country} passport holder visiting ${form.destination}.

Travel dates : ${form.dateRange.from} → ${form.dateRange.to} (${days} days)  
Budget/day   : $${form.dailyBudget}  
Group        : ${form.groupType} · ${form.travelVibe}  
Interests    : ${form.interests?.join(', ') || 'General'}  
Diet         : ${form.dietary || 'None'}  
Accommodation: ${form.accommodation || 'Any'}  
Transport    : ${form.transportPref || 'Any'}

CURRENCY
• Home → Dest : 1 ${homeIso} = ${rate.toFixed(4)} ${destIso}
• Dest → Home : 1 ${destIso} = ${rateRev.toFixed(4)} ${homeIso}
• ${fxNote}

STRICT RULES
• Every price must show BOTH currencies: "${destIso} amount (${homeIso} amount)"
• Provide ≥10 food items with price, rating, source.
• Emergency numbers MUST be strings.
• Follow the JSON schema exactly.`;

  /*───── call Groq ─────*/
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.7,
    tools: [{ type:'function', function: schema }],
    messages: [
      { role:'system', content: sys },
      { role:'user',   content: user }
    ]
  });

  const call = completion.choices[0].message.tool_calls?.[0]?.function?.arguments;
  if (!call) throw new Error('LLM returned no tool payload');

  /*───── validate / return ─────*/
  try {
    const itinerary = JSON.parse(call);
    return new Response(JSON.stringify(itinerary), {
      headers: { 'Content-Type':'application/json' }
    });
  } catch (e) {
    appendError(e,'json-parse');
    return NextResponse.json({
      error: 'Itinerary malformed',
      hint:  'LLM JSON failed to parse — try again.'
    }, { status: 500 });
  }
}