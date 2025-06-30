import { groq, MODEL } from '@/lib/groq';
import { appendError } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const form = await req.json();

  /* derive tripLength from range (if provided) */
  const days =
    form.dateRange?.from && form.dateRange?.to
      ? Math.ceil(
          (new Date(form.dateRange.to).getTime() -
            new Date(form.dateRange.from).getTime()) /
            86_400_000
        ) + 1
      : 0; // 0 = AI picks

  /* ---------- GROQ CHAT COMPLETION ---------- */
  try {
    const chat = await groq.chat.completions.create({
      model: MODEL, // 'llama3-70b-8192'
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: [
            'You are TripCraft, an award-winning travel planner.',
            'Always write in **markdown** and group content with clear headings.',
            'Format each day as **Morning / Afternoon / Evening** bullet lists.',
            'Add local eateries, hidden gems, budget estimates and pro tips.',
            'Prefer second-person voice ("You will start your day at…").',
            'Currency: US $ unless otherwise noted.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: `
Destination : ${form.destination}

Dates     : ${
            form.dateRange?.from && form.dateRange?.to
              ? `${form.dateRange.from.slice(0, 10)} → ${form.dateRange.to.slice(
                  0,
                  10
                )}  (${days} days)`
              : 'Not fixed – suggest anytime in the next 6 months'
          }

Group type : ${form.groupType}
Ages    : ${form.ages?.join('-')}
Budget/day : $${form.budgetPerDay}
Accommodation: ${form.accommodation.join(', ')}
Pace    : ${form.travelPace}
Interests  : ${form.interests.join(', ')}
Dietary   : ${form.dietary}
Activity lvl: ${form.activityLevel}/5
Mobility  : ${form.mobilityNeeds?.join(', ') || 'None'}
Transport  : ${form.transportPref}
Language  : ${form.language}
Eco-pref  : ${form.sustainability ? 'Yes' : 'No'}
Occasion  : ${form.specialOccasion}
Must-see  : ${form.mustSee || '—'}
Avoid    : ${form.avoid || '—'}

TASK → Craft a **${days || '2-4'}-day** itinerary that feels PERSONAL and wow-worthy.  
Include a short intro, daily schedule, nightly hotel suggestion and a per-day budget table.  
Finish with local tips & transport advice.  Use markdown headings. Do NOT output code fences.
`.trim(),
        },
      ],
    });

    return NextResponse.json({ markdown: chat.choices[0].message.content });
  } catch (err) {
    appendError(err, 'ai');
    return NextResponse.json(
      { error: 'AI request failed, please try again.' },
      { status: 500 }
    );
  }
}