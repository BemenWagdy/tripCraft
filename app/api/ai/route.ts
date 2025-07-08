import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { generateItinerarySchema } from '@/lib/schemas';
import { NextResponse } from 'next/server';

const schema = {
  name: 'generate_itinerary',
  description: 'Return a fully-structured travel plan with specific, actionable information',
  parameters: {
    type: 'object',
    properties: {
      intro: { type: 'string' },

      beforeYouGo: {
        type: 'array',
        description: 'Specific, actionable pre-travel tasks',
        minItems: 10,
        items: { type: 'string' }
      },

      visa: {
        type: 'object',
        description: 'Specific visa requirements based on traveler nationality',
        properties: {
          required: { type: 'boolean' },
          type: { type: 'string' }, // e.g., "Tourist visa", "Visa on arrival", "eVisa", "Visa-free"
          applicationMethod: { type: 'string' }, // e.g., "Apply via TLScontact Cairo", "VFS Global New Delhi"
          processingTime: { type: 'string' }, // e.g., "5-10 business days"
          fee: { type: 'string' }, // e.g., "$60 USD (₹5,000 INR)"
          validityPeriod: { type: 'string' }, // e.g., "90 days from entry"
          appointmentWarning: { type: 'string' }, // e.g., "Slots fill 4-6 weeks out"
          additionalRequirements: { 
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['required', 'type']
      },

      currency: {
        type: 'object',
        properties: {
          destinationCode: { type: 'string' },
          homeToDestination: { type: 'string' }, // e.g., "1 USD = 83.2 INR"
          destinationToHome: { type: 'string' }, // e.g., "1 INR = 0.012 USD"
          lastUpdated: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, // YYYY-MM-DD format
          cashCulture: { type: 'string' }, // Payment preferences
          tippingNorms: { type: 'string' },
          atmAvailability: { type: 'string' },
          cardAcceptance: { type: 'string' }
        },
        required: ['destinationCode', 'homeToDestination', 'destinationToHome', 'lastUpdated']
      },

      averages: {
        type: 'object',
        properties: {
          hostel: { type: 'number' },
          midHotel: { type: 'number' },
          highEnd: { type: 'number' }
        }
      },

      accommodation: {
        type: 'object',
        description: 'Accommodation examples with pricing',
        properties: {
          hostelExamples: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                nightlyPrice: { type: 'string' }
              },
              required: ['name', 'nightlyPrice']
            }
          },
          midExamples: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                nightlyPrice: { type: 'string' }
              },
              required: ['name', 'nightlyPrice']
            }
          },
          highExamples: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                nightlyPrice: { type: 'string' }
              },
              required: ['name', 'nightlyPrice']
            }
          }
        },
        required: ['hostelExamples', 'midExamples', 'highExamples']
      },

      weather: { type: 'string' },

      cultureTips: {
        type: 'array',
        description: 'Local etiquette, dress, bargaining, etc.',
        items: { type: 'string' }
      },

      foodList: {
        type: 'array',
        description: 'Must-try dishes or restaurants with rating & source',
        minItems: 10,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            note: { type: 'string' },
            price: { type: 'string' },
            rating: { type: 'number' },
            source: { type: 'string' }
          },
          required: ['name']
        }
      },

      practicalInfo: {
        type: 'object',
        description: 'Essential practical information',
        properties: {
          powerPlugType: { type: 'string' }, // e.g., "Type C & F (European), 230V"
          powerVoltage: { type: 'string' },
          simCardOptions: { 
            type: 'array',
            items: { type: 'string' }
          },
          emergencyNumbers: {
            type: 'object',
            additionalProperties: { type: 'string' }
          },
          commonScams: {
            type: 'array',
            items: { type: 'string' }
          },
          safetyApps: {
            type: 'array',
            items: { type: 'string' }
          },
          healthRequirements: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },

      tips: { type: 'string' },

      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            title: { type: 'string' },
            cost: { type: 'string' },
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

      footer: {
        type: 'object',
        description: 'Footer information with disclaimers',
        properties: {
          disclaimers: { 
            type: 'string',
            description: '3-line string about price variability and per-person costs'
          }
        },
        required: ['disclaimers']
      },

      totalCost: { type: 'string' }
    },
    required: [
      'intro', 'visa', 'currency', 'beforeYouGo', 'accommodation', 'days', 'footer'
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
          content: `You are a JSON-only API. Respond with a single line of pure JSON that **validates against the generate_itinerary schema**. NEVER add comments, never wrap in markdown, never escape.

CRITICAL RULES:
• If you don't know a value, return an empty string ("") or [] – do NOT invent keys.
• Use Western numerals for all numbers (0-9), even in Arabic text.
• Maximum 15k tokens – truncate low-priority arrays first (foodList, cultureTips).
• Use \\n inside strings for newlines, never raw new lines.
• Return only the keys defined in the schema. If a section is empty, still return the key with an empty string or [].

REQUIRED STRUCTURE:
{
  "intro": "",
  "visa": {
    "required": false,
    "type": "",
    "applicationMethod": "",
    "processingTime": "",
    "fee": "",
    "validityPeriod": ""
  },
  "currency": {
    "destinationCode": "",
    "homeToDestination": "",
    "destinationToHome": "",
    "lastUpdated": "",
    "atmAvailability": "",
    "cardAcceptance": "",
    "cashCulture": "",
    "tippingNorms": ""
  },
  "beforeYouGo": [],
  "accommodation": {
    "hostelExamples": [],
    "midExamples": [],
    "highExamples": []
  },
  "days": [],
  "foodList": [],
  "practicalInfo": {
    "commonScams": [],
    "emergencyNumbers": {},
    "powerPlugType": "",
    "powerVoltage": "",
    "safetyApps": []
  },
  "footer": {
    "disclaimers": ""
  },
  "tips": "",
  "totalCost": ""
}

Your reply must validate against this exact shape. You are an expert travel consultant creating detailed, actionable itineraries.`
        }
      ]
    }
    )
  }
}

Respond only with the JSON that fulfils these rules.`
        },
        {
          role: 'user',
          content: `
            Create a detailed travel itinerary for a ${form.country} citizen visiting ${form.destination}.
            
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
            • Output language: ${form.language}
            • Must-see: ${form.mustSee || 'None specified'}
            • Avoid: ${form.avoid || 'None specified'}

            REQUIREMENTS:

            • Generate all content in ${form.language}
            • Provide specific visa requirements for ${form.country} citizens
            • Include current exchange rates and payment culture
            • Create detailed daily schedules with times and costs
            • Recommend local food with prices and ratings
            • Include practical travel information and cultural tips

            Use current 2025 information and provide specific, actionable details.
          `
        }
      ],
      response_format: { type: 'json_object' }
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];
    
    if (!toolCall?.function.arguments) {
      throw new Error('No structured response from AI');
    }

    // Enhanced error handling for JSON parsing
    try {
      const rawJson = JSON.parse(toolCall.function.arguments);
      const validatedResponse = generateItinerarySchema.parse(rawJson);
      return new Response(JSON.stringify(validatedResponse), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (parseError: any) {
      console.error('[TripCraft] JSON parsing/validation error:', parseError);
      appendError(parseError, 'json-validation');
      throw new Error(\`Failed to parse/validate AI response: ${parseError.message}`);
    }

  } catch (err: any) {
    appendError(err, 'groq-api');
    
    // Enhanced fallback response with new structure
    const startDate = new Date(form?.dateRange?.from || new Date());
    const endDate = new Date(form?.dateRange?.to || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 1000)));
    
    const fallbackData = {
      intro: \`Welcome to your ${form?.destination || 'travel'} adventure! This comprehensive guide provides essential information for ${form?.country || 'international'} travelers. Please note: This is a fallback response - for the most current visa and travel requirements, consult official sources.`,
      
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
        "Research local customs and cultural etiquette",
        "Check weather forecast and pack appropriate clothing",
        "Arrange airport transfers or research public transport options"
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
        destinationCode: "USD",
        homeToDestination: "1 USD = 1 USD",
        destinationToHome: "1 USD = 1 USD", 
        lastUpdated: new Date().toISOString().split('T')[0],
        lastUpdated: "2025-01-08",
        cashCulture: "Research local payment preferences - some places prefer cash, others accept cards widely",
        tippingNorms: "Research local tipping customs - varies significantly by country and service type",
        atmAvailability: "ATMs widely available in cities, may be limited in rural areas",
        cardAcceptance: "Credit cards accepted at most hotels and restaurants, carry cash for small vendors"
      },

      accommodation: {
        hostelExamples: [
          { name: "Budget Hostel", nightlyPrice: "$25" },
          { name: "Backpacker Lodge", nightlyPrice: "$30" }
        ],
        midExamples: [
          { name: "Mid-range Hotel", nightlyPrice: "$75" },
          { name: "Boutique Inn", nightlyPrice: "$85" }
        ],
        highExamples: [
          { name: "Luxury Hotel", nightlyPrice: "$200" },
          { name: "Premium Resort", nightlyPrice: "$250" }
        ]
      },

      averages: { hostel: 25, midHotel: 75, highEnd: 200 },
      
      accommodation: {
        hostelExamples: [
          { name: "Budget Backpacker Hostel", nightlyPrice: "$25-35" },
          { name: "City Center Youth Hostel", nightlyPrice: "$30-40" }
        ],
        midExamples: [
          { name: "Boutique Hotel Downtown", nightlyPrice: "$75-95" },
          { name: "Business Hotel Central", nightlyPrice: "$80-100" }
        ],
        highExamples: [
          { name: "Luxury Resort & Spa", nightlyPrice: "$200-300" },
          { name: "Five-Star City Hotel", nightlyPrice: "$250-350" }
        ]
      },
      
      weather: "Check current weather conditions and seasonal patterns for your travel dates. Pack layers and weather-appropriate clothing. Consider the rainy season and any extreme weather patterns typical for this time of year.",
      
      cultureTips: [
        "Learn basic greetings in the local language - locals appreciate the effort",
        "Research appropriate dress codes, especially for religious sites",
        "Understand local dining etiquette and table manners",
        "Be aware of cultural gestures that might be considered offensive",
        "Respect photography restrictions, especially at religious or government sites",
        "Learn about local business hours and holiday schedules",
        "Understand bargaining culture if applicable to your destination"
      ],
      
      foodList: [
        { name: "Local Street Food", note: "Try authentic street vendors for genuine local flavors", price: "$3-8", rating: 4.5, source: "TripAdvisor" },
        { name: "Traditional Restaurant", note: "Family-run establishment with authentic recipes", price: "$15-25", rating: 4.2, source: "Google Maps" },
        { name: "Local Market Food", note: "Fresh ingredients and local specialties", price: "$5-10", rating: 4.0, source: "Yelp" },
        { name: "Regional Specialty", note: "Must-try dish unique to this region", price: "$12-18", rating: 4.7, source: "Lonely Planet" },
        { name: "Popular Breakfast Spot", note: "Where locals start their day", price: "$8-12", rating: 4.3, source: "Google Maps" },
        { name: "Night Market", note: "Evening food scene with variety", price: "$6-15", rating: 4.4, source: "TripAdvisor" },
        { name: "Local Coffee Shop", note: "Traditional coffee and pastries", price: "$4-8", rating: 4.1, source: "Foursquare" },
        { name: "Seafood Restaurant", note: "Fresh catch of the day", price: "$20-35", rating: 4.6, source: "Zomato" },
        { name: "Dessert Parlor", note: "Traditional sweets and desserts", price: "$5-12", rating: 4.4, source: "TripAdvisor" },
        { name: "Local Brewery/Bar", note: "Craft drinks and local atmosphere", price: "$8-15", rating: 4.2, source: "Google Maps" }
      ],

      practicalInfo: {
        powerPlugType: "Check destination-specific power plug requirements",
        powerVoltage: "Check local voltage requirements",
        simCardOptions: [
          "Research local mobile providers",
          "Consider international roaming plans",
          "Look into eSIM options for compatible devices"
        ],
        emergencyNumbers: {
          police: "Check local emergency numbers",
          medical: "Research medical emergency contacts",
          fire: "Find local fire emergency number",
          tourist: "Look up tourist police or helpline"
        },
        commonScams: [
          "Research destination-specific common tourist scams",
          "Be wary of overly friendly strangers offering help",
          "Verify taxi meters are running or agree on price beforehand",
          "Be cautious with ATMs in isolated areas"
        ],
        safetyApps: [
          "Download embassy app if available",
          "Consider safety apps like bSafe or SkyAlert",
          "Save emergency contacts in your phone"
        ],
        healthRequirements: [
          "Check vaccination requirements",
          "Research health advisories",
          "Consider travel health insurance"
        ]
      },

      tips: "Stay flexible with your plans, keep important documents secure, trust your instincts about safety, learn a few key phrases in the local language, and always have a backup plan for transportation and accommodation.",

      footer: {
        disclaimers: "All prices are approximate and vary by season and availability.\\nCosts are per person unless stated otherwise.\\nPlease double-check exchange rates and opening hours before travel."
      },

      days: Array.from({ length: duration }, (_, i) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        return {
          date: dateStr,
          title: i === 0 ? "Arrival & Orientation" : i === duration - 1 ? "Final Day & Departure" : \`Day ${i + 1} - Local Exploration`,
          cost: \`$${form?.dailyBudget || 100}`,
          steps: [
            { time: "06:00", text: i === 0 ? "Arrive and complete immigration procedures" : "Early morning walk/exercise", mode: i === 0 ? "Flight" : "Walk", cost: i === 0 ? "Included" : "$0" },
            { time: "07:30", text: "Breakfast at local café", mode: "Walk", cost: "$8-12" },
            { time: "09:00", text: i === 0 ? "Transport to accommodation and check-in" : "Visit main attraction", mode: i === 0 ? "Taxi/Transport" : "Public Transit", cost: i === 0 ? "$25" : "$15" },
            { time: "11:30", text: "Coffee break and rest", mode: "Walk", cost: "$5" },
            { time: "12:30", text: "Lunch at local restaurant", mode: "Walk", cost: "$15-20" },
            { time: "14:00", text: i === 0 ? "Neighborhood exploration" : "Cultural site or museum visit", mode: "Walk", cost: "$12" },
            { time: "16:00", text: "Shopping or market visit", mode: "Public Transit", cost: "$10" },
            { time: "17:30", text: "Snack and refreshment break", mode: "Walk", cost: "$6" },
            { time: "19:00", text: "Dinner at recommended restaurant", mode: "Walk/Transit", cost: "$25-35" },
            { time: "21:00", text: i === duration - 1 ? "Pack and prepare for departure" : "Evening entertainment or nightlife", mode: "Walk/Transit", cost: "$15" },
            { time: "23:00", text: "Return to accommodation", mode: "Walk/Transit", cost: "$8" }
          ]
        };
      }),

      footer: {
        disclaimers: "Prices are estimates and may vary based on season, availability, and booking timing.\nAll costs are per person unless otherwise specified.\nExchange rates and local prices subject to change - verify current rates before travel."
      },

      totalCost: \`$${(form?.dailyBudget || 100) * duration}`
    };

    return new Response(
      JSON.stringify({ error: 'Itinerary generation failed. Please retry.', fallback: fallbackData }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}