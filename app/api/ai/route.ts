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
        description: '8-10 specific, actionable pre-travel tasks for the destination',
        items: { type: 'string' },
        minItems: 8,
        maxItems: 10
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
        description: '8-10 location-precise cultural etiquette tips',
        items: { type: 'string' },
        minItems: 8,
        maxItems: 10
      },

      foodList: {
        type: 'array',
        description: 'At least 10 must-try dishes or restaurants with rating & source',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            note: { type: 'string' },
            rating: { type: 'number' },
            source: { type: 'string' }
          },
          required: ['name']
        },
        minItems: 10
      },

      practicalInfo: {
        type: 'object',
        description: 'Enhanced practical information',
        properties: {
          powerPlugType: { type: 'string' }, // e.g., "Type C & F (European), 230V"
          waterSafety: { type: 'string' }, // e.g., "Tap water safe in Brussels, filter advisable"
          contactless: { type: 'string' }, // e.g., "Apple/Google Pay accepted almost everywhere"
          sundayClosures: { type: 'string' }, // shops, supermarkets, museums
          scamAlerts: { 
            type: 'array',
            items: { type: 'string' }
          },
          simCards: { type: 'string' }, // best e-SIM & physical SIM options + price
          emergencyNumbers: {
            type: 'object',
            additionalProperties: { type: 'string' }
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

      tips: { type: 'string', description: '5-8 smart traveller hacks' },

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

      totalCost: { type: 'string' },
      
      footer: { type: 'string', description: 'Last checked date, disclaimer, and tourism site link' }
    },
    required: [
      'intro', 'beforeYouGo', 'visa', 'currency', 'weather', 'cultureTips', 'foodList', 'practicalInfo', 'tips', 'days', 'footer'
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
      tools: [{ type: 'function', function: schema }],
      messages: [
        {
          role: 'system',
          content: `You are "TripCraft Formatter v2", a specialist travel-planning agent.
When you are asked to call the function generate_itinerary you must fill every field in the schema – but with the following upgraded content rules:

1 Before-You-Go checklist
	•	Provide 8-10 bullet items that a traveller should prepare other than visas.
	•	Make every item specific to the destination country (no global clichés).
– Examples: local SIM brands & data prices; cash-only quirk for small cafés; mandatory travel insurance portal; seat-reservation rule on inter-city trains; seasonal clothing nuance; public-holiday closures; common taxi scams & mitigation; card–PIN length issue; tap-water safety; accepted power-plug type.

2 Visa block
	•	If visa.required = true, supply the current fee in destination currency, the official application channel (e.g. "TLScontact Berlin" or "VFS Global Nairobi") and realistic processing time, verified as of today.
	•	If the traveller's nationality is visa-exempt, set required = false and give a 1-sentence explanation in type.

3 Currency block
	•	Populate both directions: homeToDestination and destinationToHome with today's live mid-market rate; no USD intermediary.
	•	Add short notes for atmAvailability, cardAcceptance, cashCulture, tippingNorms, all tuned to the destination.

4 Practical information

Replace the old emergency/apps/health trio with a richer object:

practicalInfo:
  waterSafety:   string   # e.g. "Tap water safe in Brussels, filter advisable"
  contactless:   string   # e.g. "Apple/Google Pay accepted almost everywhere"
  sundayClosures:string   # shops, supermarkets, museums
  scamAlerts:    string[] # 2-3 common scams + avoidance tip each
  simCards:      string   # best e-SIM & physical SIM options + price

5 Culture tips

Return 8-10 location-precise tips (greetings, queue etiquette, dining pace, language quirks, public-transport etiquette, smoking zones, etc.).

6 Food list

foodList must contain at least 10 "must-try" dishes/drinks, each with:
	•	name, note (what to expect or best place/neighbourhood),
	•	rating (0-5 decimal),
	•	source ("Google Reviews", "Michelin Guide 2025", etc.).

7 Tips & tricks

Write 5-8 smart "traveller hacks" (e.g. cheapest airport-city ticket machines, museum late-night free slot, unlimited-weekend rail pass, secret viewpoint).

8 Footer note

Add a final key footer (string) with:
	•	"Last checked: ",
	•	disclaimer that prices/exchange rates may change,
	•	link text for the destination's official tourism site.

Remember:
	•	Produce only a valid JSON object wrapped in the required tool_call.
	•	Do not invent fields that aren't in the schema, except the new footer inside the root object.
	•	Fail gracefully (empty string) for data you truly cannot find.
	•	Keep responses concise but comprehensive to avoid generation limits.`
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

            1. DAILY ITINERARY - Make each day comprehensive from early morning to late evening:
               - Start around 7:00-8:00 AM with breakfast/morning routine
               - Include buffer time between activities (15-30 minutes)
               - End around 10:00-11:00 PM with evening activities
               - Each day needs detailed steps with realistic timing
               - Include specific costs in local currency
               - Consider ${form.travelVibe} pace and ${form.interests} interests
               - Match ${form.accommodation} preference and $${form.dailyBudget} budget
               - Account for ${form.groupType} group dynamics

            2. BEFORE YOU GO - 8-10 destination-specific items (not generic):
               - Local SIM card providers and data costs
               - Specific cultural customs for ${form.destination}
               - Local payment preferences and card acceptance
               - Transportation quirks and booking requirements
               - Seasonal considerations for travel dates
               - Local emergency numbers and safety apps
               - Power adapter requirements
               - Health and vaccination requirements
               - Local laws and customs to be aware of
               - Specific scam warnings and prevention

            3. VISA INFORMATION - Be accurate for ${form.country} citizens going to ${form.destination}:
               - Current 2025 requirements and fees
               - Exact application process and locations
               - Processing times and appointment availability
               - Required documents and specifications

            4. CURRENCY - Use current 2025 exchange rates:
               - Direct ${form.country} currency to destination currency
               - Reverse rate for easy calculation
               - Local payment culture and tipping customs
               - ATM availability and fees

            5. FOOD RECOMMENDATIONS - At least 10 specific dishes/restaurants:
               - Include ${form.dietary} options where relevant
               - Mix of price points within budget
               - Specific locations and neighborhoods
               - Ratings from credible sources

            6. CULTURAL TIPS - 8-10 location-specific etiquette:
               - Greeting customs and basic phrases
               - Dining and social customs
               - Religious and cultural sensitivities
               - Business and social etiquette
               - Photography restrictions

            7. PRACTICAL INFO - Enhanced details:
               - Water safety and drinking recommendations
               - Contactless payment acceptance
               - Sunday/holiday closure patterns
               - Common scams with prevention tips
               - Best SIM card and data options

            8. TIPS & TRICKS - 5-8 insider knowledge:
               - Money-saving hacks
               - Time-saving shortcuts
               - Hidden gems and local secrets
               - Transportation tips
               - Best times to visit attractions

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
        powerPlugType: "Check destination-specific power plug requirements",
        waterSafety: "Research local water safety and drinking recommendations",
        contactless: "Check contactless payment acceptance",
        sundayClosures: "Research Sunday and holiday closure patterns",
        scamAlerts: [
          "Research destination-specific common tourist scams",
          "Be wary of overly friendly strangers offering help",
          "Verify taxi meters are running or agree on price beforehand"
        ],
        simCards: "Research local mobile providers and eSIM options",
        emergencyNumbers: {
          police: "Check local emergency numbers",
          medical: "Research medical emergency contacts",
          fire: "Find local fire emergency number",
          tourist: "Look up tourist police or helpline"
        },
        safetyApps: [
          "Download embassy app if available",
          "Consider safety apps like bSafe or SkyAlert"
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

    return new Response(
      JSON.stringify({ error: 'Itinerary generation failed. Please retry.', fallback: fallbackData }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}