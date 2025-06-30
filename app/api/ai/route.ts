import { groq, GROQ_MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const form = await req.json();
    
    const prompt = `Create a detailed travel itinerary based on these preferences:

Destination: ${form.destination}
Travel Dates: ${form.dateRange ? `${new Date(form.dateRange.from).toLocaleDateString()} to ${new Date(form.dateRange.to).toLocaleDateString()}` : 'Not specified'}
Duration: ${form.duration} days
Group Type: ${form.groupType}
Daily Budget: $${form.dailyBudget}
Travel Vibe: ${form.travelVibe}
Interests: ${form.interests?.join(', ') || 'General sightseeing'}
Dietary Preferences: ${form.dietary || form.foodStyle}
Accommodation Style: ${form.accommodation}
Transportation Preference: ${form.transportPref}
Special Occasion: ${form.occasion}
Must-See Spots: ${form.mustSee || 'None specified'}
Things to Avoid: ${form.avoid || 'None specified'}

Please provide a comprehensive itinerary in markdown format with:
- A brief introduction to the destination
- Day-by-day breakdown with activities, meals, and accommodation suggestions
- Budget estimates for each day that align with the $${form.dailyBudget} daily budget
- Local tips and recommendations
- Transportation suggestions based on their preference for ${form.transportPref}
- Recommendations that match their ${form.travelVibe} travel vibe
- Activities that cater to their interests in ${form.interests?.join(', ') || 'general sightseeing'}
- ${form.dietary && form.dietary !== 'None' ? `Dining options that accommodate ${form.dietary} dietary requirements` : ''}
- ${form.occasion && form.occasion !== 'None' ? `Special considerations for their ${form.occasion} celebration` : ''}
- ${form.mustSee ? `Make sure to include: ${form.mustSee}` : ''}
- ${form.avoid ? `Avoid or minimize: ${form.avoid}` : ''}

Format the response as clean markdown with headers, bullet points, and clear sections. Make it personal and specific to their preferences.`;

    const chat = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert travel planner who creates detailed, practical itineraries. Provide specific recommendations with estimated costs and practical tips. Always consider the traveler\'s specific preferences, budget, and requirements.' 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return NextResponse.json({ 
      markdown: chat.choices[0].message.content || 'No content generated'
    });
  } catch (err) {
    appendError(err, 'groq-api');
    
    // Fallback response
    const form = await req.json().catch(() => ({ destination: 'Unknown' }));
    return NextResponse.json({
      markdown: `# ${form.destination} Travel Itinerary

## Day 1: Arrival & Exploration
- **Morning**: Arrive and check into accommodation
- **Afternoon**: Explore the city center and main attractions  
- **Evening**: Dinner at a local restaurant
- **Budget**: $80-120

## Day 2: Cultural Immersion  
- **Morning**: Visit museums and cultural sites
- **Afternoon**: Food tour or cooking class
- **Evening**: Local entertainment or nightlife
- **Budget**: $70-100

## Day 3: Adventure & Relaxation
- **Morning**: Outdoor activities or excursions
- **Afternoon**: Shopping and local markets
- **Evening**: Farewell dinner
- **Budget**: $90-130

*Note: This is a sample itinerary. The AI service is temporarily unavailable.*`,
      note: 'Fallback itinerary - Groq service unavailable'
    });
  }
}