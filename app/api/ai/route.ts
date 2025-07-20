import { FormValues } from '@/types';
import { getFxRate } from '@/lib/fx';
import { currencyCode } from '@/lib/currency';
import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { parseCost } from '@/lib/costParser';

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
                  cost: { type: 'string' },
                  costLocal: { type: 'string' },
                  costDestination: { type: 'string' }
                },
                required: ['text']
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
    required: [
      'intro', 'visa', 'currency', 'beforeYouGo', 'days'
    ]
  }
};

export async function POST(req: Request) {
  let form: FormValues;
  
  // Check if GROQ API key is available
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'GROQ API key is not configured. Please add GROQ_API_KEY to your environment variables.' },
      { status: 500 }
    );
  }

  // Declare variables outside try block to prevent ReferenceError in catch
  let homeIso = 'USD';
  let destIso = 'USD'; 
  let fxHomeToDest = 1;
  let fxDestToHome = 1;
  let fxDate = '';
  let fxNote = '';
  
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

    // Currency conversion logic
    homeIso = currencyCode(form.country) || 'USD';
    destIso = currencyCode(form.destination) || 'USD';
    
    // 8. Noise reduction - gate console logs in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] Currency mapping:`);
      console.log(`[API] Country: "${form.country}" → ${homeIso}`);
      console.log(`[API] Destination: "${form.destination}" → ${destIso}`);
    }

    // Make API calls if currencies are different
    if (homeIso !== destIso) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] Making Fixer.io API calls for ${homeIso} → ${destIso}`);
      }
      
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] Getting ${homeIso} → ${destIso} rate`);
        }
        const homeToDestResult = await getFxRate(homeIso, destIso);
        fxHomeToDest = homeToDestResult.rate;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] Getting ${destIso} → ${homeIso} rate`);
        }
        const destToHomeResult = await getFxRate(destIso, homeIso);
        fxDestToHome = destToHomeResult.rate;
        
        fxDate = homeToDestResult.date;
        fxNote = `Exchange rates updated ${fxDate}`;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] Final rates: 1 ${homeIso} = ${fxHomeToDest} ${destIso}`);
          console.log(`[API] Final rates: 1 ${destIso} = ${fxDestToHome} ${homeIso}`);
        }
        
      } catch (err) {
        console.error('[API] FX lookup failed:', err);
        fxNote = 'Exchange rates unavailable';
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] Same currency, no conversion needed`);
      }
      fxNote = 'Same currency';
    }

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
            • Daily budget: $${form.budgetPerDay}
            • Group type: ${form.groupType}
            • Travel style: ${form.travelVibe}
            • Interests: ${form.interests?.join(', ') || 'General sightseeing'}
            • Dietary needs: ${form.dietary}
            • Accommodation: ${form.accommodation}
            • Transport preference: ${form.transportPref}
            • Special occasion: ${form.occasion}
            • Must-see: ${form.mustSee || 'None specified'}
            • Avoid: ${form.avoid || 'None specified'}

            CURRENCY INFORMATION:
            • Traveler's home currency: ${homeIso}
            • Destination currency: ${destIso}
            • Exchange rate: 1 ${homeIso} = ${fxHomeToDest.toFixed(4)} ${destIso}
            • Reverse rate: 1 ${destIso} = ${fxDestToHome.toFixed(4)} ${homeIso}
            • ${fxNote}

            CRITICAL REQUIREMENTS:

            MANDATORY: You MUST provide exactly 10 food recommendations. No exceptions. Generate 10 distinct, specific food items/restaurants.
            1. VISA INFORMATION - Be specific for ${form.country} citizens going to ${form.destination}:
               - State clearly if visa required, visa-free, visa on arrival, or eVisa
               - Provide exact application method (e.g., "Apply via VFS Global Mumbai", "TLScontact Berlin")
               - Include processing time, fees in both currencies, validity period
               - Warn about appointment availability if relevant
               - List specific requirements (photos, bank statements, etc.)

            2. CURRENCY & PAYMENTS - Direct exchange rates:
               - Show ${form.country} currency to destination currency rate: ${fxNote}
               - Show exchange rate: 1 ${homeIso} = ${fxHomeToDest.toFixed(4)} ${destIso}
               - Show reverse rate: 1 ${destIso} = ${fxDestToHome.toFixed(4)} ${homeIso}
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

            4. EMERGENCY NUMBERS - Provide as STRINGS not numbers:
               - All emergency contact numbers must be strings (e.g., "911", "112", "100")
               - Include country code if international calling is needed
               - Format: {"police": "122", "medical": "123", "fire": "180", "tourist": "126"}

            5. PRACTICAL INFO - Include:
               - Exact power plug types and voltage
               - Specific SIM card providers and costs
               - Emergency numbers (police, medical, fire, tourist helpline)
               - Common scams with prevention tips
               - Recommended safety apps
               - Health requirements and recommended vaccinations

            6. CULTURAL TIPS - Destination-specific etiquette:
               - Greeting customs and basic phrases
               - Dress codes for different situations
               - Religious site protocols
               - Business card etiquette if relevant
               - Dining customs and table manners
               - Bargaining culture and techniques
               - Photography restrictions and etiquette

            7. DAILY ITINERARY:
               - Each day needs detailed steps from early morning (6:00 AM) to late night (11:00 PM)
               - MINIMUM 6 ACTIVITIES per day - no exceptions
               - Include specific times for each activity with realistic durations
              - DO NOT include airport transfers or accommodation costs in daily activities
              - Start from the city center, assume accommodation is already booked separately
               - Add 15-30 minute buffer times between activities for transportation
               - Schedule proper meal times: breakfast (7:30-8:30), lunch (12:30-1:30), dinner (7:00-8:00)
               - Include snack breaks and rest periods
               - Plan activities to cover maximum area efficiently with logical routing
               - Group nearby attractions together to minimize travel time
               
               ACTIVITY REQUIREMENTS PER DAY:
               - Morning activity (9:00-11:00)
               - Pre-lunch activity (11:00-12:30)
               - Afternoon activity (14:00-16:00)
               - Late afternoon activity (16:00-17:30)
               - Evening activity (19:00-21:00)
               - Night activity (21:00-23:00)
               - Plus meals, transport, and rest periods
               
               MANDATORY COST REQUIREMENTS:
               - EVERY SINGLE ACTIVITY must have a cost in BOTH currencies
               - Daily total MUST EQUAL EXACTLY $${form.budgetPerDay} USD
               - Daily total MUST EQUAL EXACTLY ${Math.round(form.budgetPerDay * fxHomeToDest)} ${destIso}
               - Format daily costs as: "${Math.round(form.budgetPerDay * fxHomeToDest)} ${destIso} ($${form.budgetPerDay} USD)"
               - Format activity costs as: "Amount ${destIso} ($Amount USD)" - no $ with local currency
               - All step costs within a day must add up to the daily total
               - Distribute costs logically: meals 40%, activities 35%, transport 15%, misc 10%
               
               - Realistic transport options and times
               - Account for opening/closing times of attractions
               - Include evening activities and nightlife options
               - Consider ${form.travelVibe} pace and ${form.interests} interests
               - Match ${form.accommodation} preference and $${form.budgetPerDay} budget
               - Account for ${form.groupType} group dynamics

            8. FOOD RECOMMENDATIONS (MANDATORY 10 ITEMS):
               - EXACTLY 10 specific dishes/restaurants with ratings, sources AND prices
               - Must include: 2 street food items, 2 local restaurants, 2 traditional dishes, 2 popular chains/cafes, 1 fine dining, 1 local dessert/beverage
               - Include specific pricing in BOTH currencies scaled to budget: "price": "Amount ${destIso} ($Amount ${homeIso})"
               - Example: "price": "${Math.round(25 * fxHomeToDest)} ${destIso} ($25 ${homeIso})" for street food
               - Example: "price": "${Math.round(120 * fxHomeToDest)} ${destIso} ($120 ${homeIso})" for restaurant meal
               - Include ${form.dietary} options where relevant
               - Mix of price points within budget
               - Local specialties and where to find them
               - Include street food, traditional dishes, popular restaurants, local markets, desserts, and beverages
               - Provide variety across different meal types (breakfast, lunch, dinner, snacks)
               - Price format: "Amount ${destIso} ($Amount USD)" - no $ symbol with local currency

            CRITICAL BUDGET & CURRENCY REQUIREMENTS:
            - EVERY activity cost must show both currencies: "Amount ${destIso} ($Amount ${homeIso})"
            - For local/destination currency: DO NOT use $ symbol, use only the local currency symbol or code
            - For USD amounts: Always use $ symbol
            - Example formats: "150 EGP ($5 USD)" or "25 EUR ($27 USD)" - never "150 $EGP"
            - Use the exchange rates: 1 ${homeIso} = ${fxHomeToDest.toFixed(4)} ${destIso}
            - Daily activity costs MUST total EXACTLY $${form.budgetPerDay} USD (${Math.round(form.budgetPerDay * fxHomeToDest)} ${destIso})
            - EXCLUDE airport transfers and accommodation from the daily budget calculations
            - Grand total MUST be: $${form.budgetPerDay * duration} USD (${Math.round(form.budgetPerDay * duration * fxHomeToDest)} ${destIso})
            - Be mathematically precise throughout the entire itinerary
            - Include costs for: meals, local transportation, activities, entrance fees, shopping, entertainment
            - DO NOT include: airport transfers, accommodation costs (these are separate from daily budget)

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
      
      // 2. Daily totals - fix cost calculations server-side
      if (parsedResponse.days && Array.isArray(parsedResponse.days)) {
        let grandTotalDest = 0;
        let grandTotalHome = 0;
        
        parsedResponse.days = parsedResponse.days.map((day: any, index: number) => {
          const dailyBudgetUSD = form.budgetPerDay || 100;
          
          // Sum all paid steps using parseCost helper
          let dayTotalDest = 0;
          let dayTotalHome = 0;
          let paidSteps: any[] = [];
          
          if (day.steps && Array.isArray(day.steps)) {
            day.steps.forEach((step: any) => {
              if (step.cost && step.cost !== 'Free' && step.cost !== 'Included') {
                const parsed = parseCost(step.cost, destIso, homeIso);
                dayTotalDest += parsed.dest;
                dayTotalHome += parsed.home;
                paidSteps.push(step);
              }
            });
          }
          
          // If sum ≠ target budgetPerDay (USD), adjust the last paid step
          if (dayTotalHome !== dailyBudgetUSD && paidSteps.length > 0) {
            const adjustment = dailyBudgetUSD - dayTotalHome;
            const lastPaidStep = paidSteps[paidSteps.length - 1];
            
            const currentParsed = parseCost(lastPaidStep.cost, destIso, homeIso);
            const newHomeAmount = Math.max(0, currentParsed.home + adjustment);
            const newDestAmount = Math.round(newHomeAmount * fxHomeToDest);
            
            lastPaidStep.cost = `${newDestAmount} ${destIso} ($${newHomeAmount} ${homeIso})`;
            
            // Recalculate day totals
            dayTotalDest = 0;
            dayTotalHome = 0;
            day.steps.forEach((step: any) => {
              if (step.cost && step.cost !== 'Free' && step.cost !== 'Included') {
                const parsed = parseCost(step.cost, destIso, homeIso);
                dayTotalDest += parsed.dest;
                dayTotalHome += parsed.home;
              }
            });
          }
          
          // Write real sum back to day.cost in dual-currency format
          day.cost = `${Math.round(dayTotalDest)} ${destIso} ($${Math.round(dayTotalHome)} USD)`;
          
          grandTotalDest += dayTotalDest;
          grandTotalHome += dayTotalHome;
          
          return day;
        });
        
        // 4. Currency sanity check
        const expectedDestFromHome = grandTotalHome * fxHomeToDest;
        if (Math.abs(grandTotalDest - expectedDestFromHome) > 1) {
          // Tweak the first paid day by the difference
          const difference = expectedDestFromHome - grandTotalDest;
          const firstDay = parsedResponse.days.find((day: any) => 
            day.steps && day.steps.some((step: any) => 
              step.cost && step.cost !== 'Free' && step.cost !== 'Included'
            )
          );
          
          if (firstDay) {
            const firstPaidStep = firstDay.steps.find((step: any) => 
              step.cost && step.cost !== 'Free' && step.cost !== 'Included'
            );
            
            if (firstPaidStep) {
              const currentParsed = parseCost(firstPaidStep.cost, destIso, homeIso);
              const newDestAmount = Math.max(0, currentParsed.dest + difference);
              const newHomeAmount = Math.round(newDestAmount / fxHomeToDest);
              
              firstPaidStep.cost = `${Math.round(newDestAmount)} ${destIso} ($${newHomeAmount} USD)`;
              grandTotalDest = expectedDestFromHome;
            }
          }
        }
        
        // 3. Grand total - compute from actual sums, no shortcuts
        parsedResponse.totalCost = `$${Math.round(grandTotalHome)} USD`;
        parsedResponse.totalCostLocal = `$${Math.round(grandTotalHome)} USD`;
        parsedResponse.totalCostDestination = `${Math.round(grandTotalDest)} ${destIso} ($${Math.round(grandTotalHome)} USD)`;
      }
      
      // 5. Schema safety - force arrays and guarantee minimums
      if (parsedResponse.visa) {
        // Force additionalRequirements to be an array
        if (!parsedResponse.visa.additionalRequirements) {
          parsedResponse.visa.additionalRequirements = [];
        } else if (typeof parsedResponse.visa.additionalRequirements === 'string') {
          parsedResponse.visa.additionalRequirements = [parsedResponse.visa.additionalRequirements];
        } else if (!Array.isArray(parsedResponse.visa.additionalRequirements)) {
          parsedResponse.visa.additionalRequirements = [];
        }
      }
      
      // Guarantee beforeYouGo has ≥ 6 items
      if (!parsedResponse.beforeYouGo) {
        parsedResponse.beforeYouGo = [];
      }
      
      const beforeYouGoDefaults = [
        "Check current visa requirements on official embassy website",
        "Purchase comprehensive travel insurance with medical coverage", 
        "Notify your bank of international travel plans to prevent card blocks",
        "Download offline maps and translation apps for navigation",
        "Research local emergency numbers and save embassy contact information",
        "Get appropriate power adapters and check voltage requirements"
      ];
      
      while (parsedResponse.beforeYouGo.length < 6) {
        const defaultIndex = parsedResponse.beforeYouGo.length % beforeYouGoDefaults.length;
        parsedResponse.beforeYouGo.push(beforeYouGoDefaults[defaultIndex]);
      }
      
      // Post-process foodList to ensure minimum 10 items
      if (parsedResponse.foodList && parsedResponse.foodList.length < 10) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AI] Only ${parsedResponse.foodList.length} food items generated, adding fallbacks`);
        }
        
        // Better fallback food items with proper pricing
        const fallbackFoods = [
          { name: "Local Street Food Vendor", note: "Popular street-side snack", type: "street" },
          { name: "Traditional Family Restaurant", note: "Authentic local cuisine", type: "restaurant" },
          { name: "Local Coffee Shop", note: "Traditional coffee and pastries", type: "cafe" },
          { name: "Popular Local Chain", note: "Well-known local restaurant chain", type: "chain" },
          { name: "Traditional Dessert Shop", note: "Local sweets and desserts", type: "dessert" },
          { name: "Local Market Food Stall", note: "Fresh market foods", type: "market" },
          { name: "Casual Dining Restaurant", note: "Mid-range local restaurant", type: "restaurant" },
          { name: "Local Breakfast Spot", note: "Where locals start their day", type: "breakfast" },
          { name: "Traditional Beverage Shop", note: "Local drinks and refreshments", type: "beverage" },
          { name: "Fine Dining Restaurant", note: "Upscale local cuisine", type: "fine" }
        ];
        
        while (parsedResponse.foodList.length < 10) {
          const itemNumber = parsedResponse.foodList.length + 1;
          const fallbackIndex = (itemNumber - 1) % fallbackFoods.length;
          const fallbackFood = fallbackFoods[fallbackIndex];
          
          // Calculate realistic costs based on food type and budget
          let costPercentage;
          switch (fallbackFood.type) {
            case 'street': costPercentage = 0.08; break;  // 8% of daily budget
            case 'cafe': case 'breakfast': case 'beverage': costPercentage = 0.12; break;  // 12%
            case 'market': case 'dessert': costPercentage = 0.10; break;  // 10%
            case 'restaurant': case 'chain': costPercentage = 0.20; break;  // 20%
            case 'fine': costPercentage = 0.35; break;  // 35%
            default: costPercentage = 0.15; break;
          }
          
          const baseCostUSD = Math.round((form?.budgetPerDay || 100) * costPercentage);
          const baseCostDest = Math.round(baseCostUSD * fxHomeToDest);
          
          parsedResponse.foodList.push({
            name: fallbackFood.name,
            note: fallbackFood.note,
            rating: 4.0,
            price: `${baseCostDest} ${destIso} ($${baseCostUSD} ${homeIso})`,
            source: 'Local recommendation'
          });
        }
      }
      
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
        destinationCode: destIso || 'USD',
        homeToDestination: `1 ${homeIso || 'USD'} = ${fxHomeToDest.toFixed(4)} ${destIso || 'USD'}`,
        destinationToHome: `1 ${destIso || 'USD'} = ${fxDestToHome.toFixed(4)} ${homeIso || 'USD'}`,
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
          cost: `$${form?.budgetPerDay || 100}`,
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

      totalCost: `$${(form?.budgetPerDay || 100) * duration}`,
      totalCostLocal: `$${(form?.budgetPerDay || 100) * duration} USD`,
      totalCostDestination: `${Math.round((form?.budgetPerDay || 100) * duration * fxHomeToDest)} ${destIso}`,
      currencies: { home: homeIso, destination: destIso, rate: fxHomeToDest },
      lastUpdated: fxDate
    };

    return new Response(
      JSON.stringify({ error: 'Itinerary generation failed. Please retry.', fallback: fallbackData }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}