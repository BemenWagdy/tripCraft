import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';

const schema = {
  name: 'generate_itinerary',
  description: 'Return a fully-structured travel plan',
  parameters: {
    type: 'object',
    properties: {
      intro: { type: 'string' },               // 3-4 lines
      visa: { type: 'string' },               // visa rules
      currency: {
        type: 'object',
        properties: {
          code: { type: 'string' },                 // EGP
          rateUsd: { type: 'number' }                  // 30.8
        },
        required: ['code', 'rateUsd']
      },
      averages: {
        type: 'object',
        properties: {
          hostel: { type: 'number' },
          midHotel: { type: 'number' },
          highEnd: { type: 'number' }
        }
      },
      weather: { type: 'string' },               // typical temps, rain
      culture: { type: 'string' },               // etiquette, dress
      food: { type: 'string' },               // must-try dishes
      tips: { type: 'string' },               // packing, scams, etc.
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },                  // "2025-07-01"
            title: { type: 'string' },                  // "Arrival & Acclimation"
            cost: { type: 'string' },                  // "$80"
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },             // "09:00"
                  text: { type: 'string' },             // "Check in …"
                  mode: { type: 'string' },             // "Taxi", "Walk"
                  cost: { type: 'string' }              // "$15"
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
    required: ['intro', 'visa', 'currency', 'weather', 'culture', 'food', 'tips', 'days']
  }
};

export async function POST(req: Request) {
  try {
    const form = await req.json();
    
    // Convert string dates to Date objects before calculating duration
    const startDate = new Date(form.dateRange.from);
    const endDate = new Date(form.dateRange.to);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const prompt = `Generate a comprehensive budget itinerary for ${form.destination}
Travel dates: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}
Duration: ${duration} days
Group type: ${form.groupType}
Daily budget: $${form.dailyBudget}
Travel vibe: ${form.travelVibe}
Interests: ${form.interests?.join(', ') || 'General sightseeing'}
Dietary preferences: ${form.dietary || form.foodStyle}
Accommodation style: ${form.accommodation}
Transportation preference: ${form.transportPref}
Special occasion: ${form.occasion}
Must-see spots: ${form.mustSee || 'None specified'}
Things to avoid: ${form.avoid || 'None specified'}

Create a detailed itinerary that includes:
- Practical travel information (visa, currency, weather)
- Accommodation price ranges for different budgets
- Cultural etiquette and local customs
- Must-try local dishes and food recommendations
- Helpful travel tips and common scams to avoid
- Day-by-day schedule with specific times, activities, transportation modes, and costs
- Ensure daily costs align with the $${form.dailyBudget} budget
- Include ${form.travelVibe} activities that match their interests in ${form.interests?.join(', ') || 'general sightseeing'}
- Consider their ${form.groupType} group type and ${form.accommodation} accommodation preference
- Account for ${form.transportPref} transportation preference
${form.dietary && form.dietary !== 'None' ? `- Include ${form.dietary} dining options` : ''}
${form.occasion && form.occasion !== 'None' ? `- Add special touches for their ${form.occasion} celebration` : ''}
${form.mustSee ? `- Make sure to include: ${form.mustSee}` : ''}
${form.avoid ? `- Avoid or minimize: ${form.avoid}` : ''}

Output MUST call the function "generate_itinerary" with all required fields.`;

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
    
    // Fallback response with structured format
    const form = await req.json().catch(() => ({ destination: 'Unknown', dailyBudget: 100 }));
    const fallbackData = {
      intro: `Welcome to your ${form.destination} adventure! This sample itinerary provides a taste of what awaits you.`,
      visa: "Check current visa requirements for your nationality before travel.",
      currency: { code: "USD", rateUsd: 1 },
      averages: { hostel: 25, midHotel: 75, highEnd: 200 },
      weather: "Check current weather conditions and seasonal patterns for your travel dates.",
      culture: "Research local customs, dress codes, and cultural etiquette before your trip.",
      food: "Explore local cuisine and try traditional dishes at recommended restaurants.",
      tips: "Keep copies of important documents, stay aware of your surroundings, and learn basic local phrases.",
      days: [
        {
          date: new Date().toISOString().split('T')[0],
          title: "Arrival & Exploration",
          cost: `$${form.dailyBudget || 100}`,
          steps: [
            { time: "09:00", text: "Arrive and check into accommodation", mode: "Taxi", cost: "$25" },
            { time: "14:00", text: "Explore city center and main attractions", mode: "Walk", cost: "$20" },
            { time: "19:00", text: "Dinner at local restaurant", cost: "$30" }
          ]
        }
      ],
      totalCost: `$${(form.dailyBudget || 100) * 3}`
    };

    return NextResponse.json(fallbackData);
  }
}