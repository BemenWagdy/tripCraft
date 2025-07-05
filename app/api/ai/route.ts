import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const schema = {
  name: 'generate_itinerary',
  description: 'Return a fully-structured travel plan',
  parameters: {
    type: 'object',
    properties: {
      intro:   { type: 'string' },

      beforeYouGo: {
        type: 'array',
        description: '1-10 key facts to know before arrival',
        items: { type: 'string' },
        minItems: 1,  maxItems: 10
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

      cultureTips: {
        type: 'array',
        description: 'Local etiquette, dress, bargaining, etc.',
        items: { type: 'string' },
        minItems: 3, maxItems: 15
      },

      foodList: {
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
        minItems: 3, maxItems: 20
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
              minItems: 5         // ⬅️  early morning → late night
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
  let form;
  
  try {
    form = await req.json();
  } catch (parseError) {
    appendError(parseError, 'request-parsing');
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  try {
    // Convert string dates to Date objects before calculating duration
    const startDate = new Date(form.dateRange.from);
    const endDate = new Date(form.dateRange.to);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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
          content: `
            Generate a detailed budget itinerary for ${form.destination}
            • Date range: ${form.dateRange.from} to ${form.dateRange.to}
            • Daily budget: $${form.dailyBudget}
            • Duration: ${duration} days
            • Traveller nationality: ${form.country}
            • Group type: ${form.groupType}
            • Travel vibe: ${form.travelVibe}
            • Interests: ${form.interests?.join(', ') || 'General sightseeing'}
            • Dietary preferences: ${form.dietary}
            • Accommodation: ${form.accommodation}
            • Transportation: ${form.transportPref}
            • Special occasion: ${form.occasion}
            • Must-see: ${form.mustSee || 'None'}
            • Avoid: ${form.avoid || 'None'}

            REQUIREMENTS
            1. Call the function "generate_itinerary" with JSON that matches the schema.
            2. "beforeYouGo": 1-10 key bullets (safety, SIM cards, cash, etc.).
            3. "cultureTips": at least 3 concise etiquette tips.
            4. "foodList": 3-20 items. Each must include rating (0-5) and rating source.
            5. Each day must have 5+ steps covering early morning to late night with
               realistic transport modes and prices checked against 2025 data.
            6. All dates must be ISO-8601 YYYY-MM-DD format.
            7. Consider their ${form.travelVibe} vibe and ${form.interests?.join(', ')} interests.
            8. Match their $${form.dailyBudget} daily budget and ${form.accommodation} accommodation preference.
            9. Account for ${form.transportPref} transportation and ${form.groupType} group type.
            10. Use their nationality (${form.country}) for visa requirements and currency information.
            ${form.dietary && form.dietary !== 'None' ? `11. Include ${form.dietary} dining options.` : ''}
            ${form.occasion && form.occasion !== 'None' ? `12. Add special touches for ${form.occasion}.` : ''}
            ${form.mustSee ? `13. Include: ${form.mustSee}` : ''}
            ${form.avoid ? `14. Avoid: ${form.avoid}` : ''}
          `
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

  } catch (err: any) {
    appendError(err, 'groq-api');
    
    // Check if it's a 503 service unavailable error
    if (err.message?.includes('503') || err.message?.includes('Service unavailable')) {
      console.warn('Groq API is temporarily unavailable (503). Using fallback response.');
    }
    
    // Enhanced fallback response with new structure
    const startDate = new Date(form?.dateRange?.from || new Date());
    const endDate = new Date(form?.dateRange?.to || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const fallbackData = {
      intro: `Welcome to your ${form?.destination || 'travel'} adventure! This sample itinerary provides a taste of what awaits you in this incredible destination. Please note: This is a fallback response due to temporary service unavailability.`,
      beforeYouGo: [
        "Check visa requirements for your nationality",
        "Get comprehensive travel insurance before departure",
        "Notify your bank of travel plans to avoid card blocks",
        "Research local emergency numbers and embassy contacts",
        "Download offline maps and translation apps"
      ],
      visa: "Check current visa requirements for your nationality before travel. Some countries offer visa-on-arrival or e-visa options. Visit your destination's official embassy website for the most up-to-date information.",
      currency: { code: "USD", rateUsd: 1 },
      averages: { hostel: 25, midHotel: 75, highEnd: 200 },
      weather: "Check current weather conditions and seasonal patterns for your travel dates. Pack accordingly for temperature and precipitation. Consider the rainy season and extreme weather patterns.",
      cultureTips: [
        "Learn basic greetings in the local language - locals appreciate the effort",
        "Research appropriate dress codes for religious sites and conservative areas",
        "Understand local tipping customs and expectations to avoid awkward situations",
        "Be aware of cultural gestures that might be offensive in the local context",
        "Respect photography restrictions in certain areas, especially religious sites",
        "Learn about local dining etiquette and table manners"
      ],
      foodList: [
        { name: "Local Street Food", note: "Try authentic street vendors for the real local experience", rating: 4.5, source: "TripAdvisor" },
        { name: "Traditional Family Restaurant", note: "Family-run establishment with authentic recipes", rating: 4.2, source: "Google Maps" },
        { name: "Local Market Food", note: "Fresh ingredients and local flavors at great prices", rating: 4.0, source: "Yelp" },
        { name: "Regional Specialty Dish", note: "Must-try local dish unique to the region", rating: 4.7, source: "Lonely Planet" },
        { name: "Popular Breakfast Spot", note: "Where locals start their day", rating: 4.3, source: "Google Maps" },
        { name: "Night Market Food", note: "Evening food scene with variety of options", rating: 4.4, source: "TripAdvisor" }
      ],
      tips: "Keep copies of important documents in separate locations, stay aware of your surroundings especially in crowded areas, learn basic local phrases for emergencies, always have emergency contacts readily available, and trust your instincts if something feels unsafe.",
      days: Array.from({ length: duration }, (_, i) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        return {
          date: dateStr,
          title: i === 0 ? "Arrival & First Exploration" : i === duration - 1 ? "Final Day & Departure" : `Day ${i + 1} - Local Discovery`,
          cost: `$${form?.dailyBudget || 100}`,
          steps: [
            { time: "08:00", text: i === 0 ? "Arrive at airport and complete immigration" : "Start day with local breakfast", mode: i === 0 ? "Flight" : "Walk", cost: i === 0 ? "Included" : "$8" },
            { time: "10:00", text: i === 0 ? "Take transport to accommodation" : "Visit main attraction or landmark", mode: i === 0 ? "Taxi" : "Public Transit", cost: i === 0 ? "$25" : "$12" },
            { time: "12:00", text: i === 0 ? "Check into accommodation and freshen up" : "Lunch at local restaurant", mode: "Walk", cost: i === 0 ? "$0" : "$15" },
            { time: "14:00", text: i === 0 ? "Lunch at nearby local restaurant" : "Explore cultural sites or museums", cost: "$15" },
            { time: "16:00", text: i === 0 ? "Explore immediate neighborhood" : "Shopping or local market visit", mode: "Walk", cost: i === 0 ? "$0" : "$20" },
            { time: "18:00", text: i === 0 ? "Visit main city center or landmark" : "Relax at accommodation or local café", mode: "Public Transit", cost: "$5" },
            { time: "20:00", text: "Dinner at recommended restaurant", cost: "$25" },
            { time: "22:00", text: i === duration - 1 ? "Pack and prepare for departure" : "Return to accommodation and rest", mode: "Public Transit", cost: "$5" }
          ]
        };
      }),
      totalCost: `$${(form?.dailyBudget || 100) * duration}`
    };

    return NextResponse.json(fallbackData);
  }
}