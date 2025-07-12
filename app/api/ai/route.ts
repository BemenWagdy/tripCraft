import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { callGroq } from '@/lib/callGroq';
import { generateMapLink } from '@/lib/qr';
import type { MetaBlock, Day, ExtrasBlock } from '@/lib/groqSchema';

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

    // 1️⃣ Meta & practical blocks
    const metaRes = await callGroq('meta', form, duration);
    const meta = metaRes.data as MetaBlock;

    // 2️⃣ Day blocks, 5 days per cursor page
    let cursor = 0;
    let allDays: Day[] = [];
    
    do {
      const daysRes = await callGroq('days', form, duration, cursor, meta);
      const daysData = daysRes.data as { days: Day[]; nextCursor: number | null };
      allDays.push(...daysData.days);
      cursor = daysData.nextCursor ?? -1; // Use -1 to break the loop when null
    } while (cursor !== -1 && allDays.length < duration);

    // 3️⃣ Food list, tips, footer, etc.
    const extrasRes = await callGroq('extras', form, duration, 0, meta);
    const extras = extrasRes.data as ExtrasBlock;

    // Add map links to each step
    const enhancedDays = allDays.map(day => ({
      ...day,
      steps: day.steps?.map(step => ({
        ...step,
        mapLink: generateMapLink(`${step.text} ${form.destination}`)
      }))
    }));

    const itinerary = {
      ...meta,
      destination: form.destination,
      dateRange: new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }) + ' – ' + new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      days: enhancedDays,
      ...extras
    };

    return new Response(JSON.stringify(itinerary), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    appendError(err, 'groq-api');
    
    // Enhanced fallback response
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

      destination: form?.destination || 'Unknown Destination',
      dateRange: startDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }) + ' – ' + endDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),

      totalCost: `$${(form?.dailyBudget || 100) * duration}`
    };

    return new Response(
      JSON.stringify({ error: 'Itinerary generation failed. Please retry.', fallback: fallbackData }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}