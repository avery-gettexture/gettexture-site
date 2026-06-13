import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { subject } = await req.json();
    
    const cleanSubject = {
      year: subject.year,
      month: subject.month,
      day: subject.day,
      hour: subject.hour,
      minute: subject.minute,
      latitude: subject.latitude,
      longitude: subject.longitude,
    };

    const response = await fetch('https://astrology-proxy.vercel.app/api/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: cleanSubject }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Proxy error body:', errText);
      return NextResponse.json(
        { error: `Proxy error: ${response.status}`, detail: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Proxy response:', JSON.stringify(data));
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
