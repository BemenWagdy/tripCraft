import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';

// ─── 🛠️  Prompt-builder ───────────────────────────────────────────
type TripForm = {
  destination: string;          // "Cairo, Egypt"
  dateRange:  { from: string; to: string };   // ISO strings
  homeAirport?: string;         // "LHR" - optional
  arrivalEta?: string;          // "14:25" - optional
  groupType: string;            // "Solo", "Couple", etc.
  dailyBudget: number;          // 100
  currency?: string;            // "USD" - optional, default to USD
  interests: string[];          // ["Food", "History"]
  travelVibe: string;           // "Relaxed", "Balanced", "Adventure"
  accommodation: string;        // "Hostel", "Budget", "Boutique", etc.
  transportPref: string;        // "Public Transit", etc.
  dietary?: string;             // "Vegetarian", etc.
  occasion?: string;            // "Honeymoon", etc.
  mustSee?: string;             // Optional must-see spots
  avoid?: string;               // Optional things to avoid
};

function buildPrompt(f: TripForm) {
  const interestsStr = Array.isArray(f.interests) ? f.interests.join(', ') : f.interests;
  const currency = f.currency || 'USD';
  const groupDesc = f.groupType === 'Solo' ? '1 adult' : f.groupType.toLowerCase();
  
  return `
You are an expert travel planner AI. Build a **comprehensive, practical, and update-proof itinerary** for the following trip:

• Destination(s): ${f.destination}
• Dates & length: ${f.dateRange.from} – ${f.dateRange.to}
• Group profile: ${groupDesc}
• Daily budget target (per person) in ${currency}: ${f.dailyBudget}
• Interests / must-dos: ${interestsStr}
• Travel vibe: ${f.travelVibe}
• Accommodation style: ${f.accommodation}
• Transportation preference: ${f.transportPref}
${f.dietary && f.dietary !== 'None' ? `• Dietary requirements: ${f.dietary}` : ''}
${f.occasion && f.occasion !== 'None' ? `• Special occasion: ${f.occasion}` : ''}
${f.mustSee ? `• Must-see spots: ${f.mustSee}` : ''}
${f.avoid ? `• Things to avoid: ${f.avoid}` : ''}

**CRITICAL: You MUST call the generate_itinerary function with structured JSON data that matches the schema exactly.**

**REQUIREMENTS:**
1. **beforeYouGo**: Provide 8-10 essential pre-travel tips (visa requirements, SIM cards, cash needs, safety alerts, weather prep, cultural awareness, health/insurance, emergency contacts)

2. **cultureTips**: Provide 10-15 specific local etiquette tips (greetings, dress codes, tipping customs, dining etiquette, religious site behavior, bargaining practices, gesture awareness, public transport manners, photography restrictions, social norms)

3. **foodList**: Provide 10-20 must-try food items with:
   - name: dish or restaurant name
   - note: brief description or location
   - rating: numerical rating 0-5 (realistic, based on actual reviews)
   - source: rating source like "Google Maps", "TripAdvisor", "Yelp", "Lonely Planet"

4. **days**: Each day must have 8+ detailed steps covering early morning to late night:
   - Include specific times (e.g., "08:30", "14:00")
   - Realistic transportation modes and costs
   - Specific locations and activities
   - Meal suggestions with estimated costs
   - Consider the ${f.travelVibe} pace and ${f.accommodation} accommodation level

5. **currency**: Provide accurate exchange rate for local currency to USD (2025 rates)

6. **averages**: Realistic accommodation costs per night:
   - hostel: budget dormitory/shared room
   - midHotel: 3-star hotel or boutique accommodation  
   - highEnd: 4-5 star luxury accommodation

7. **visa**: Current visa requirements and entry rules

8. **weather**: Seasonal weather patterns and what to expect during travel dates

9. **tips**: Practical travel tips specific to the destination

10. **totalCost**: Estimated total trip cost based on daily budget and duration

**FORMATTING:**
- All dates in YYYY-MM-DD format
- Costs in local currency with USD equivalent when helpful
- Be specific with locations, times, and practical details
- Account for ${f.dailyBudget} daily budget constraint
- Match ${f.travelVibe} energy level in activity planning
- Consider ${f.groupType} group dynamics in recommendations
`.trim();
}

const schema = {
  name: 'generate_itinerary',
  description: 'Return a fully-structured travel plan',
  parameters: {
    type: 'object',
    properties: {
      intro:   { type: 'string' },

      beforeYouGo: {                      // ⬅️  new block
        type: 'array',
        description: '8-10 key facts to know before arrival',
        items: { type: 'string' },
        minItems: 8,  maxItems: 10
      },

      visa:    { type: 'string' },

      currency: {
        type: 'object',
        properties: {
          code:    { type: 'string' },
          rateUsd: { type: 'number' }
        },
        required: ['code', 'rateUsd']
      },

      averages: {
        type: 'object',
        properties: {
          hostel:   { type: 'number' },
          midHotel: { type: 'number' },
          highEnd:  { type: 'number' }
        }
      },

      weather: { type: 'string' },

      cultureTips: {                     // ⬅️  now 10 items
        type: 'array',
        description: 'Local etiquette, dress, bargaining, etc.',
        items: { type: 'string' },
        minItems: 10, maxItems: 15
      },

      foodList: {                        // ⬅️  rated food list
        type: 'array',
        description: 'Must-try dishes or restaurants with rating & source',
        items: {
          type: 'object',
          properties: {
            name:   { type: 'string' },
            note:   { type: 'string' },  // "Koshari from Abou Tarek"
            rating: { type: 'number' },  // 4.8
            source: { type: 'string' }   // "Google Maps"
          },
          required: ['name', 'rating', 'source']
        },
        minItems: 10, maxItems: 20
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
                  time: { type: 'string' },  // e.g. "06:30"
                  text: { type: 'string' },
                  mode: { type: 'string' },
                  cost: { type: 'string' }
                },
                required: ['text']
              },
              minItems: 8         // ⬅️  early morning → late night
            }
          },
          required: ['date', 'title', 'steps']
        }
      },

      totalCost: { type: 'string' }
    },
    required: [
      'intro', 'beforeYouGo', 'visa', 'currency', 'weather',
      'cultureTips', 'foodList', 'tips', 'days'
    ]
  }
};

export async function POST(req: Request) {
  try {
    const form = await req.json();
    
    // Convert string dates to Date objects before calculating duration
    const startDate = new Date(form.dateRange.from);
    const endDate = new Date(form.dateRange.to);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Build enhanced prompt using the helper
    const prompt = buildPrompt(form as TripForm);

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.7,
      tools: [{ type: 'function', function: schema }],
      messages: [
        {
          role: 'system',
          content: 'You are an expert travel planner who creates detailed, practical itineraries. Always use the generate_itinerary function to return structured data. Provide specific recommendations with estimated costs and practical tips.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];
    
    if (!toolCall?.function.arguments) {
      throw new Error('No structured response from AI');
    }

    return new Response(toolCall.function.arguments, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    appendError(err, 'groq-api');
    
    // Enhanced fallback response with new structure
    const form = await req.json().catch(() => ({ destination: 'Unknown', dailyBudget: 100 }));
    const fallbackData = {
      intro: `Welcome to your ${form.destination} adventure! This sample itinerary provides a taste of what awaits you in this incredible destination.`,
      beforeYouGo: [
        "Check visa requirements for your nationality",
        "Get travel insurance before departure",
        "Notify your bank of travel plans",
        "Download offline maps and translation apps",
        "Pack appropriate clothing for the climate",
        "Bring universal power adapters",
        "Keep digital copies of important documents",
        "Research local emergency numbers"
      ],
      visa: "Check current visa requirements for your nationality before travel. Some countries offer visa-on-arrival or e-visa options.",
      currency: { code: "USD", rateUsd: 1 },
      averages: { hostel: 25, midHotel: 75, highEnd: 200 },
      weather: "Check current weather conditions and seasonal patterns for your travel dates. Pack accordingly for temperature and precipitation.",
      cultureTips: [
        "Learn basic greetings in the local language",
        "Research appropriate dress codes for religious sites",
        "Understand local tipping customs and expectations",
        "Be aware of cultural gestures that might be offensive",
        "Respect photography restrictions in certain areas",
        "Learn about local dining etiquette and meal times",
        "Understand bargaining practices in markets",
        "Be mindful of personal space and physical contact norms",
        "Research local holidays that might affect opening hours",
        "Understand appropriate behavior in public transportation"
      ],
      foodList: [
        { name: "Local Street Food", note: "Try authentic street vendors", rating: 4.5, source: "TripAdvisor" },
        { name: "Traditional Restaurant", note: "Family-run establishment", rating: 4.2, source: "Google Maps" },
        { name: "Local Market Food", note: "Fresh ingredients and local flavors", rating: 4.0, source: "Yelp" },
        { name: "Regional Specialty", note: "Must-try local dish", rating: 4.7, source: "Lonely Planet" },
        { name: "Breakfast Spot", note: "Popular morning destination", rating: 4.3, source: "Google Maps" }
      ],
      tips: "Keep copies of important documents, stay aware of your surroundings, learn basic local phrases, and always have emergency contacts readily available.",
      days: [
        {
          date: new Date().toISOString().split('T')[0],
          title: "Arrival & Exploration",
          cost: `$${form.dailyBudget || 100}`,
          steps: [
            { time: "08:00", text: "Arrive at airport and complete immigration", mode: "Flight", cost: "Included" },
            { time: "10:00", text: "Take transport to accommodation", mode: "Taxi", cost: "$25" },
            { time: "12:00", text: "Check into accommodation and freshen up", mode: "Walk", cost: "$0" },
            { time: "14:00", text: "Lunch at nearby local restaurant", cost: "$15" },
            { time: "16:00", text: "Explore immediate neighborhood", mode: "Walk", cost: "$0" },
            { time: "18:00", text: "Visit main city center or landmark", mode: "Public Transit", cost: "$5" },
            { time: "20:00", text: "Dinner at recommended restaurant", cost: "$25" },
            { time: "22:00", text: "Return to accommodation and rest", mode: "Public Transit", cost: "$5" }
          ]
        }
      ],
      totalCost: `$${(form.dailyBudget || 100) * 3}`
    };

    return NextResponse.json(fallbackData);
  }
}