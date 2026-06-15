import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

  const { data, error } = await supabase
    .from('readings')
    .select('slug')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !data) return NextResponse.json({ slug: null });
  return NextResponse.json({ slug: data.slug });
}
