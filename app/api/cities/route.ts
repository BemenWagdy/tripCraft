import { NextResponse } from 'next/server';

const API = 'https://wft-geo-db.p.rapidapi.com/v1/geo/cities';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  if (!q) return NextResponse.json([]);

  try {
    const res = await fetch(`${API}?limit=10&namePrefix=${encodeURIComponent(q)}`, {
      headers: {
        'X-RapidAPI-Key': process.env.GEODB_API_KEY || 'f700ed8c38msh9b750446a747eefp169a29jsn3fe98a275f61',
        'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      // Fallback for demo purposes
      return NextResponse.json([
        { label: `${q}, Demo Country`, value: `${q}, Demo Country` }
      ]);
    }

    const { data = [] } = await res.json();
    return NextResponse.json(
      data.map((c: any) => ({
        label: `${c.city}, ${c.region}, ${c.country}`,
        value: `${c.city}, ${c.country}`,
      }))
    );
  } catch (error) {
    // Fallback for demo purposes
    return NextResponse.json([
      { label: `${q}, Demo Country`, value: `${q}, Demo Country` }
    ]);
  }
}