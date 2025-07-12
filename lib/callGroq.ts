import { groq } from './groq';
import { itinerarySchema, type Section, type MetaBlock } from './groqSchema';

const systemMessage = {
  role: 'system' as const,
  content: `You are a travel-planner tool. You MUST respond **only** by invoking the function 'generate_itinerary' with JSON that validates against its schema. Do not add properties that are not in the schema. You are an expert travel consultant with deep knowledge of visa requirements, currency exchange, local customs, and practical travel information. Create detailed, actionable itineraries with specific information based on the traveler's nationality and destination. Always use current 2025 data and be specific about application processes, fees, and requirements.`
};

const itinerarySchemaJson = {
  name: 'generate_itinerary',
  description: 'Return a section of the travel itinerary',
  parameters: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        enum: ['meta', 'days', 'extras']
      },
      data: {
        type: 'object',
        description: 'The section data payload'
      }
    },
    required: ['section', 'data']
  }
};

function buildUserPrompt(
  section: Section, 
  form: any, 
  duration: number, 
  cursor = 0, 
  meta?: MetaBlock
) {
  const base = `
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

    Use current 2025 information and be as specific as possible. Think like a local expert helping a first-time visitor.
  `;

  switch (section) {
    case 'meta':
      return {
        role: 'user' as const,
        content: base + `
          
          CRITICAL REQUIREMENTS FOR META SECTION:

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

          6. ACCOMMODATION AVERAGES - Provide realistic pricing for different accommodation types

          7. WEATHER - Current weather conditions and what to expect during travel dates

          Return ONLY the meta blocks: intro, visa, currency, beforeYouGo, practicalInfo, cultureTips, averages, weather.

          Wrap them in { "section":"meta", "data": { intro, visa, currency, beforeYouGo, practicalInfo, cultureTips, averages, weather } }
        `
      };

    case 'days':
      return {
        role: 'user' as const,
        content: base + `
          
          DAILY ITINERARY REQUIREMENTS:
          - Each day needs detailed steps from early morning (6:00 AM) to late night (11:00 PM)
          - Include specific times for each activity with realistic durations
          - Add 15-30 minute buffer times between activities for transportation
          - Schedule proper meal times: breakfast (7:30-8:30), lunch (12:30-1:30), dinner (7:00-8:00)
          - Include snack breaks and rest periods
          - Plan activities to cover maximum area efficiently with logical routing
          - Group nearby attractions together to minimize travel time
          - Include specific costs in local currency
          - Realistic transport options and times
          - Account for opening/closing times of attractions
          - Include evening activities and nightlife options
          - Consider ${form.travelVibe} pace and ${form.interests} interests
          - Match ${form.accommodation} preference and $${form.dailyBudget} budget
          - Account for ${form.groupType} group dynamics

          Return ONLY up to 5 day objects starting at day ${cursor + 1}.
          If there are more days after these 5, set nextCursor to ${cursor + 5}, otherwise set it to null.

          Meta summary for context: ${JSON.stringify(meta || {}).slice(0, 800)}

          Wrap them in { "section":"days", "data": { "days":[...], "nextCursor": <int|null> } }
        `
      };

    case 'extras':
      return {
        role: 'user' as const,
        content: base + `
          
          FOOD & EXTRAS REQUIREMENTS:
          - Minimum 10 specific dishes/restaurants with ratings and sources
          - Include specific pricing for each item (e.g., "$8-12", "€15", "₹200-300")
          - Include ${form.dietary} options where relevant
          - Mix of price points within budget
          - Local specialties and where to find them
          - Include street food, traditional dishes, popular restaurants, local markets, desserts, and beverages
          - Provide variety across different meal types (breakfast, lunch, dinner, snacks)
          - General travel tips and tricks
          - Total estimated cost for the entire trip

          Return ONLY foodList (≥10 items), tips, and totalCost.

          Wrap in { "section":"extras", "data": { foodList, tips, totalCost } }
        `
      };
  }
}

export async function callGroq(
  section: Section,
  form: any,
  duration: number,
  cursor: number = 0,
  meta?: MetaBlock
) {
  const messageBlock = buildUserPrompt(section, form, duration, cursor, meta);

  const res = await groq.chat.completions.create({
    model: 'llama3-70b-8192',
    temperature: 0.4,
    tools: [{ type: 'function', function: itinerarySchemaJson }],
    messages: [
      systemMessage,
      messageBlock
    ],
    max_tokens: 2800
  });

  const tool = res.choices[0].message.tool_calls?.[0];
  if (!tool?.function.arguments) {
    throw new Error('No tool call response from Groq');
  }

  return itinerarySchema.parse(JSON.parse(tool.function.arguments));
}