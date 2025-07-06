import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const schema = {
  name: 'generate_itinerary',
  description: 'Return a fully-structured travel plan',
  parameters: {
    type: 'object',
    properties: {
      intro:  { type: 'string' },

      /* --- visa --------------------------------------------------------- */
      visa: {
        type: 'object',
        properties: {
          required:        { type: 'boolean' },
          type:            { type: 'string' },
          applicationMethod:{ type: 'string' },
          processingTime:  { type: 'string' },
          fee:             { type: 'string' },
          validityPeriod:  { type: 'string' },
          appointmentWarning: { type: 'string' },
          additionalRequirements: { 
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['required','type']
      },

      /* --- money -------------------------------------------------------- */
      currency: {
        type: 'object',
        properties: {
          destinationCode:     { type: 'string' },
          homeToDestination:   { type: 'string' },
          destinationToHome:   { type: 'string' },
          atmAvailability:     { type: 'string' },
          cardAcceptance:      { type: 'string' },
          cashCulture:         { type: 'string' },
          tippingNorms:        { type: 'string' }
        },
        required: ['destinationCode','homeToDestination','destinationToHome']
      },

      /* --- new blocks --------------------------------------------------- */
      beforeYouGo: {              // exactly 10 bullets (strings)
        type: 'array',
        minItems: 10,
        maxItems: 10,
        items: { type: 'string' }
      },

      practicalInfo: {
        type: 'object',
        properties: {
          waterSafety:   { type: 'string' },
          contactless:   { type: 'string' },
          sundayClosures:{ type: 'string' },
          scamAlerts:    { type: 'array', items: { type: 'string' } },
          simCards:      { type: 'string' }
        },
        required: ['waterSafety','contactless','sundayClosures','scamAlerts','simCards']
      },

      averages: {
        type: 'object',
        properties: {
          hostel: { type: 'number' },
          midHotel: { type: 'number' },
          highEnd: { type: 'number' }
        }
      },

      weather: { type: 'string' },

      cultureTips: {
        type: 'array',
        minItems: 8,
        maxItems: 10,
        items: { type: 'string' }
      },

      foodList: {
        type: 'array',
        minItems: 10,
        items: {
          type: 'object',
          properties: {
            name:   { type: 'string' },
            note:   { type: 'string' },
            rating: { type: 'number' },
            source: { type: 'string' }
          },
          required: ['name','note','rating','source']
        }
      },

      tips:       { type: 'string' },

      /* --- days array --------------------------------------------------- */
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
                  time: { type: 'string' },
                  text: { type: 'string' },
                  mode: { type: 'string' },
                  cost: { type: 'string' }
                },
                required: ['text']
              }
            }
          },
          required: ['date','title','steps']
        }
      },

      totalCost: { type: 'string' },
      footer:    { type: 'string' }     // NEW
    },

    /* list all absolutely-required keys here */
    required: [
      'intro',
      'beforeYouGo',
      'visa',
      'currency',
      'practicalInfo',
      'cultureTips',
      'foodList',
      'tips',
      'days',
      'footer'
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
      temperature: 0.6,
      max_tokens: 8192,
      tools: [{ type: 'function', function: schema }],
      messages: [
        {
          role: 'system',
          content: `You are a travel-planner tool. You MUST respond **only** by invoking the function 'generate_itinerary' with JSON that validates against its schema. Do not add properties that are not in the schema.

CRITICAL REQUIREMENTS:
- beforeYouGo: EXACTLY 10 items (no more, no less)
- cultureTips: 8-10 items
- foodList: EXACTLY 10 items with all required fields (name, note, rating, source)
- All required fields must be present
- Keep responses concise to avoid token limits`
        },
        {
          role: 'user',
          content: `
            Generate a comprehensive, actionable travel itinerary for a ${form.country} citizen traveling to ${form.destination}
            
            TRAVELER PROFILE:
            • Nationality/Passport: ${form.country}
            • Destination: ${form.destination}
            • Travel dates: ${form.dateRange.from} to ${form.dateRange.to} (${duration} days)
            • Daily budget: $${form.dailyBudget}
            • Group type: ${form.groupType}
            • Travel style: ${form.travelVibe}
            • Interests: ${form.interests?.join(', ') || 'General sightseeing'}
            • Dietary needs: ${form.dietary}
            • Accommodation: ${form.accommodation}
            • Transport preference: ${form.transportPref}
            • Special occasion: ${form.occasion}
            • Must-see: ${form.mustSee || 'None specified'}
            • Avoid: ${form.avoid || 'None specified'}

            REQUIREMENTS:

            1. beforeYouGo: EXACTLY 10 destination-specific preparation items
            2. visa: Accurate requirements for ${form.country} passport holders
            3. currency: Current exchange rates and payment culture
            4. practicalInfo: Include waterSafety, contactless, sundayClosures, scamAlerts (array), simCards
            5. cultureTips: 8-10 location-specific etiquette tips
            6. foodList: EXACTLY 10 must-try dishes with name, note, rating (0-5), source
            7. days: Full daily itinerary from early morning to late evening with buffer time
            8. footer: Last checked date and disclaimer

            Use current 2025 information. Be specific and actionable.
          `
        }
      ]
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];
    
    if (!toolCall?.function.arguments) {
      throw new Error('No structured response from AI');
    }

    // Enhanced error handling for JSON parsing
    try {
      const parsedResponse = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsedResponse), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (parseError) {
      console.error('[TripCraft] JSON parsing error:', parseError);
      throw new Error('Failed to parse AI response');
    }

  } catch (err: any) {
    appendError(err, 'groq-api');
    
    // Enhanced fallback response with new structure
    const startDate = new Date(form?.dateRange?.from || new Date());
    const endDate = new Date(form?.dateRange?.to || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 1000)));
    
    const fallbackData = {
      intro: `Welcome to your ${form?.destination || 'travel'} adventure! This comprehensive guide provides essential information for ${form?.country || 'international'} travelers. Please note: This is a fallback response - for the most current visa and travel requirements, consult official sources.`,
      
      beforeYouGo: [
        "Check current visa requirements on official embassy website",
        "Purchase comprehensive travel insurance with medical coverage",
        "Notify your bank of international travel plans to prevent card blocks",
        "Download offline maps (Google Maps, Maps.me) for navigation without data",
        "Research local emergency numbers and save embassy contact information",
        "Get appropriate power adapters for your electronics",
        "Check vaccination requirements and health advisories",
        "Set up international roaming or research local SIM card options",
        "Make copies of important documents (passport, visa, insurance)",
        "Research local customs and cultural etiquette"
      ],

      visa: {
        required: true,
        type: "Please verify current requirements",
        applicationMethod: "Check with nearest embassy or consulate",
        processingTime: "Varies by nationality and destination",
        fee: "Check official embassy website for current fees",
        validityPeriod: "Varies by visa type",
        appointmentWarning: "Book appointments well in advance",
        additionalRequirements: [
          "Valid passport with 6+ months validity",
          "Passport-sized photographs",
          "Proof of accommodation",
          "Return flight tickets",
          "Bank statements showing sufficient funds"
        ]
      },

      currency: {
        destinationCode: "Local Currency",
        homeToDestination: "Check current exchange rates",
        destinationToHome: "Check current exchange rates",
        cashCulture: "Research local payment preferences",
        tippingNorms: "Research local tipping customs",
        atmAvailability: "ATMs widely available in cities",
        cardAcceptance: "Credit cards accepted at most hotels and restaurants"
      },

      averages: { hostel: 25, midHotel: 75, highEnd: 200 },
      
      weather: "Check current weather conditions and seasonal patterns for your travel dates.",
      
      cultureTips: [
        "Learn basic greetings in the local language",
        "Research appropriate dress codes for religious sites",
        "Understand local dining etiquette and table manners",
        "Be aware of cultural gestures that might be considered offensive",
        "Respect photography restrictions at religious or government sites",
        "Learn about local business hours and holiday schedules",
        "Understand bargaining culture if applicable",
        "Research public transportation etiquette"
      ],
      
      foodList: [
        { name: "Local Street Food", note: "Try authentic street vendors", rating: 4.5, source: "TripAdvisor" },
        { name: "Traditional Restaurant", note: "Family-run establishment", rating: 4.2, source: "Google Maps" },
        { name: "Local Market Food", note: "Fresh ingredients", rating: 4.0, source: "Yelp" },
        { name: "Regional Specialty", note: "Must-try local dish", rating: 4.7, source: "Lonely Planet" },
        { name: "Popular Breakfast Spot", note: "Where locals start their day", rating: 4.3, source: "Google Maps" },
        { name: "Night Market", note: "Evening food scene", rating: 4.4, source: "TripAdvisor" },
        { name: "Coffee Culture", note: "Local coffee traditions", rating: 4.1, source: "Google Reviews" },
        { name: "Dessert Specialty", note: "Traditional sweets", rating: 4.6, source: "Michelin Guide" },
        { name: "Seafood Restaurant", note: "Fresh local catch", rating: 4.5, source: "Zomato" },
        { name: "Vegetarian Options", note: "Plant-based local cuisine", rating: 4.2, source: "HappyCow" }
      ],

      practicalInfo: {
        waterSafety: "Research local water safety and drinking recommendations",
        contactless: "Check contactless payment acceptance",
        sundayClosures: "Research Sunday and holiday closure patterns",
        scamAlerts: [
          "Research destination-specific common tourist scams",
          "Be wary of overly friendly strangers offering help",
          "Verify taxi meters are running or agree on price beforehand"
        ],
        simCards: "Research local mobile providers and eSIM options"
      },

      tips: "Stay flexible with your plans, keep important documents secure, trust your instincts about safety, learn a few key phrases in the local language, and always have a backup plan for transportation and accommodation.",

      days: Array.from({ length: duration }, (_, i) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        return {
          date: dateStr,
          title: i === 0 ? "Arrival & Orientation" : i === duration - 1 ? "Final Day & Departure" : `Day ${i + 1} - Local Exploration`,
          cost: `$${form?.dailyBudget || 100}`,
          steps: [
            { time: "08:00", text: i === 0 ? "Arrive and complete immigration procedures" : "Start with local breakfast", mode: i === 0 ? "Flight" : "Walk", cost: i === 0 ? "Included" : "$8" },
            { time: "10:00", text: i === 0 ? "Transport to accommodation" : "Visit main attraction", mode: i === 0 ? "Taxi/Transport" : "Public Transit", cost: i === 0 ? "$25" : "$12" },
            { time: "12:00", text: i === 0 ? "Check-in and orientation" : "Lunch at local restaurant", mode: "Walk", cost: i === 0 ? "$0" : "$15" },
            { time: "14:00", text: i === 0 ? "First local meal" : "Cultural site or museum visit", cost: "$15" },
            { time: "16:00", text: i === 0 ? "Neighborhood exploration" : "Shopping or market visit", mode: "Walk", cost: "$10" },
            { time: "18:00", text: "Evening activity or relaxation", mode: "Public Transit", cost: "$5" },
            { time: "20:00", text: "Dinner at recommended restaurant", cost: "$25" },
            { time: "22:00", text: i === duration - 1 ? "Pack and prepare for departure" : "Return to accommodation", mode: "Walk/Transit", cost: "$5" }
          ]
        };
      }),

      totalCost: `$${(form?.dailyBudget || 100) * duration}`,
      
      footer: "Last checked: Fallback response. Disclaimer: This is a fallback itinerary. Prices and exchange rates may change. Please verify current information with official sources."
    };

    return NextResponse.json(fallbackData);
  }
}