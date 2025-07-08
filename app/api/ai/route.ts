import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
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
          cashCulture: { type: 'string' }, // Payment preferences
          tippingNorms: { type: 'string' },
          atmAvailability: { type: 'string' },
          cardAcceptance: { type: 'string' }
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

      totalCost: { type: 'string' }
    },
    required: [
      'intro', 'visa', 'currency', 'beforeYouGo', 'days'
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
          content: `You are a travel-planner tool. You MUST respond **only** by invoking the function 'generate_itinerary' with JSON that validates against its schema. Do not add properties that are not in the schema. You are an expert travel consultant with deep knowledge of visa requirements, currency exchange, local customs, and practical travel information. Create detailed, actionable itineraries with specific information based on the traveler's nationality and destination. Always use current 2025 data and be specific about application processes, fees, and requirements.`
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

            CRITICAL REQUIREMENTS:

            1. VISA INFORMATION - Be specific for ${form.country} citizens going to ${form.destination}:
               - State clearly if visa required, visa-free, visa on arrival, or eVisa
               - Provide exact application method (e.g., "Apply via VFS Global Mumbai", "TLScontact Berlin")
               - Include processing time, fees in both currencies, validity period
               - Warn about appointment availability if relevant
               - List specific requirements (photos, bank statements, etc.)

            2. CURRENCY & PAYMENTS - Direct exchange rates:
               - Show ${form.country} currency to destination currency rate
               - Show destination to ${form.country} currency rate
               - Explain local payment culture (cash vs card preference)
               - Detail tipping customs with specific amounts/percentages
               - ATM availability and fees

            3. BEFORE YOU GO CHECKLIST - Several specific and actionable items:
               - Travel insurance requirements (mandatory vs recommended)
               - Health requirements (vaccinations, health certificates)
               - Power adapter type and voltage
               - Local SIM/eSIM options with provider names
               - Seasonal packing advice for travel dates
               - Common scams specific to destination
               - Safety apps and emergency numbers
               - Banking notifications and card setup
               - Embassy registration if recommended
               - Proof of funds requirements
               - Return ticket requirements

            4. PRACTICAL INFO - Include:
               - Exact power plug types and voltage
               - Specific SIM card providers and costs
               - Emergency numbers (police, medical, fire, tourist helpline)
               - Common scams with prevention tips
               - Recommended safety apps
               - Health requirements and recommended vaccinations

            5. CULTURAL TIPS - Destination-specific etiquette:
               - Greeting customs and basic phrases
               - Dress codes for different situations
               - Religious site protocols
               - Business card etiquette if relevant
               - Dining customs and table manners
               - Bargaining culture and techniques
               - Photography restrictions and etiquette

            6. DAILY ITINERARY:
               - Each day must be COMPLETELY FILLED from 5:30 AM to 11:30 PM with detailed activities
               - NO hotel check-ins, NO airport arrivals - focus purely on exploration and experiences
               - Include 15+ activities per day with specific times and durations
               - Add detailed transportation instructions between each location
               - Schedule strategic meal times: breakfast (7:00-8:00), mid-morning snack (10:30), lunch (12:30-1:30), afternoon snack (3:30), dinner (7:30-8:30), late night snack (10:00)
               - Include multiple rest periods, photo stops, and exploration time
               - Plan activities to cover MAXIMUM area with efficient routing
               - Group nearby attractions but include diverse experiences throughout the day
               - Include morning markets, cultural sites, museums, parks, shopping areas, local neighborhoods, viewpoints, entertainment venues
               - Add specific walking routes, scenic paths, and local transportation tips
               - Include both indoor and outdoor activities for weather flexibility
               - Add local experiences like cooking classes, workshops, guided tours
               - Include evening entertainment, nightlife, sunset spots, and late-night food scenes
               - Include specific costs in local currency
               - Realistic transport options and times
               - Account for opening/closing times and plan backup activities
               - Include detailed descriptions of what to do at each location
               - Add tips for each activity (best photo spots, what to look for, local customs)
               - Consider ${form.travelVibe} pace and ${form.interests} interests
               - Match ${form.accommodation} preference and $${form.dailyBudget} budget
               - Account for ${form.groupType} group dynamics

            7. FOOD RECOMMENDATIONS:
               - Minimum 10 specific dishes/restaurants with ratings and sources
               - Include specific pricing for each item (e.g., "$8-12", "€15", "₹200-300")
               - Include ${form.dietary} options where relevant
               - Mix of price points within budget
               - Local specialties and where to find them
               - Include street food, traditional dishes, popular restaurants, local markets, desserts, and beverages
               - Provide variety across different meal types (breakfast, lunch, dinner, snacks)

            Use current 2025 information and be as specific as possible. Think like a local expert helping a first-time visitor.
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
        destinationCode: "Local Currency",
        homeToDestination: "Check current exchange rates",
        destinationToHome: "Check current exchange rates",
        cashCulture: "Research local payment preferences - some places prefer cash, others accept cards widely",
        tippingNorms: "Research local tipping customs - varies significantly by country and service type",
        atmAvailability: "ATMs widely available in cities, may be limited in rural areas",
        cardAcceptance: "Credit cards accepted at most hotels and restaurants, carry cash for small vendors"
      },

      averages: { hostel: 25, midHotel: 75, highEnd: 200 },
      
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

      days: Array.from({ length: duration }, (_, i) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        return {
          date: dateStr,
          title: i === 0 ? "Arrival & Orientation" : i === duration - 1 ? "Final Day & Departure" : `Day ${i + 1} - Local Exploration`,
          cost: `$${form?.dailyBudget || 100}`,
          steps: [
            { time: "05:30", text: "Early morning sunrise viewing at scenic viewpoint", mode: "Walk", cost: "$0" },
            { time: "06:30", text: "Morning exercise or jog in local park", mode: "Walk", cost: "$0" },
            { time: "07:00", text: "Traditional breakfast at local café with regional specialties", mode: "Walk", cost: "$8-12" },
            { time: "08:30", text: "Visit morning market and interact with local vendors", mode: "Walk", cost: "$5" },
            { time: "09:30", text: "Explore historic district and architectural landmarks", mode: "Walk", cost: "$0" },
            { time: "10:30", text: "Coffee break and local pastry tasting", mode: "Walk", cost: "$6" },
            { time: "11:00", text: "Visit main cultural attraction or museum", mode: "Public Transit", cost: "$15" },
            { time: "12:30", text: "Lunch at authentic local restaurant", mode: "Walk", cost: "$15-20" },
            { time: "14:00", text: "Guided walking tour of traditional neighborhood", mode: "Walk", cost: "$12" },
            { time: "15:30", text: "Visit local artisan workshops or craft centers", mode: "Walk", cost: "$8" },
            { time: "16:30", text: "Afternoon snack and refreshment break", mode: "Walk", cost: "$5" },
            { time: "17:00", text: "Shopping at local markets and souvenir hunting", mode: "Walk", cost: "$20" },
            { time: "18:30", text: "Sunset viewing from popular viewpoint", mode: "Public Transit", cost: "$3" },
            { time: "19:30", text: "Dinner at highly-rated local restaurant", mode: "Walk", cost: "$25-35" },
            { time: "21:00", text: "Evening entertainment - live music, cultural show, or nightlife", mode: "Walk/Transit", cost: "$15-25" },
            { time: "22:30", text: "Late night food tour or dessert tasting", mode: "Walk", cost: "$10" },
            { time: "23:30", text: "Return to accommodation via scenic route", mode: "Walk/Transit", cost: "$5" }
          ]
        };
      }),

      totalCost: `$${(form?.dailyBudget || 100) * duration}`
    };

    return new Response(
      JSON.stringify({ error: 'Itinerary generation failed. Please retry.', fallback: fallbackData }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}