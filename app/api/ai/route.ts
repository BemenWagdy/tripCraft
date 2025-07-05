import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const schema = {
  name: 'generate_itinerary',
  description: 'Return a fully-structured travel plan',
  parameters: {
    type: 'object',
    properties: {
      intro: { type: 'string' },

      // — BEFORE-YOU-GO —
      visa: {                                     // ← replaces duplicate / generic text
        type: 'object',
        properties: {
          required:        { type: 'boolean' },   // true / false
          howToApply:      { type: 'string' },    // TLS, VFS, eVisa portal, etc.
          processingTime:  { type: 'string' },    // "15 business days"
          cost:            { type: 'string' },    // local + USD equiv
          notes:           { type: 'string' }     // appointment tips, docs list
        },
        required: ['required', 'howToApply']
      },

      currency: {                                 // home-to-destination FX
        type: 'object',
        properties: {
          homeCode:       { type: 'string' },     // e.g. "EGP"
          destCode:       { type: 'string' },     // e.g. "EUR"
          homeToDest:     { type: 'number' },     // 1 home = ? dest
          destToHome:     { type: 'number' }      // 1 dest = ? home
        },
        required: ['homeCode', 'destCode', 'homeToDest', 'destToHome']
      },

      weather:  { type: 'string' },
      culture:  { type: 'string' },
      food:     { type: 'string' },
      tips:     { type: 'string' },

      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date:  { type: 'string' },
            title: { type: 'string' },
            cost:  { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },
                  text: { type: 'string' },
                  mode: { type: 'string' },
                  cost: { type: 'string' }
                },
                required: ['text']
              }
            }
          },
          required: ['date', 'title', 'steps']
        }
      },

      beforeYouGoExtra: {
        type: 'array',
        items: { type: 'string' },                // 8-10 extra prep tips
        minItems: 8
      },

      totalCost: { type: 'string' }
    },
    required: [
      'intro', 'visa', 'currency', 'weather',
      'culture', 'food', 'tips', 'days'
    ]
  }
};

export async function POST(req: Request) {
  let body;
  
  try {
    body = await req.json();
  } catch (parseError) {
    appendError(parseError, 'request-parsing');
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.7,
      tools: [{ type: 'function', function: schema }],
      messages: [
        {
          role: 'user',
          content: `
Generate a comprehensive, practical itinerary that follows **rules #1, #2, #3, and #5** from our style guide.

Traveller profile:
  • Destination(s): ${body.destination}
  • Dates: ${body.dateRange}
  • Home citizenship: ${body.citizenship}
  • Budget per day (local): ${body.budget}
  • Interests: ${body.interests}
  
Your reply **must** call the function "generate_itinerary".`
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
    const fallbackData = {
      intro: `Welcome to your ${body?.destination || 'travel'} adventure! This sample itinerary provides a taste of what awaits you in this incredible destination. Please note: This is a fallback response due to temporary service unavailability.`,
      visa: {
        required: true,
        howToApply: "Check with your local embassy or consulate for current requirements",
        processingTime: "7-15 business days",
        cost: "Varies by nationality",
        notes: "Apply well in advance and ensure passport validity"
      },
      currency: {
        homeCode: "USD",
        destCode: "USD", 
        homeToDest: 1,
        destToHome: 1
      },
      weather: "Check current weather conditions and seasonal patterns for your travel dates. Pack accordingly for temperature and precipitation.",
      culture: "Research local customs, dress codes, and social etiquette to show respect for the local culture.",
      food: "Try local specialties and street food, but ensure food safety by choosing busy, reputable vendors.",
      tips: "Keep copies of important documents, stay aware of your surroundings, and always have emergency contacts readily available.",
      days: [
        {
          date: new Date().toISOString().split('T')[0],
          title: "Arrival & Exploration",
          cost: `$${body?.budget || 100}`,
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
      beforeYouGoExtra: [
        "Research local emergency numbers and embassy contacts",
        "Download offline maps and translation apps",
        "Get comprehensive travel insurance",
        "Notify your bank of travel plans",
        "Pack appropriate clothing for local customs",
        "Learn basic phrases in the local language",
        "Research local transportation options",
        "Understand local tipping customs"
      ],
      totalCost: `$${body?.budget || 100}`
    };

    return NextResponse.json(fallbackData);
  }
}