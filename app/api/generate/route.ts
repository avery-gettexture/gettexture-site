import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  PLACEMENTS,
  generateNatalPlacement,
} from '@/lib/natal-generation/generate-piece.mjs';
import { NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS } from '@/lib/config';

// ── Supabase (server-side with service role for writes) ────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Route handler ──────────────────────────────────────────────────────────
//
// Assembly and generation live in lib/natal-generation/ (SPEC §16, "complete
// natal generation" — Stage 1/Stage 2), mirroring the transit side's
// structured-module pattern rather than building the per-placement input
// ad-hoc here. 13 placements (SPEC §4.1): 10 planets, Ascendant, Midheaven,
// and one combined Nodes axis request writing to the `nodes` column — no
// path here writes north_node/south_node.

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    // Fetch reading from Supabase
    const { data: reading, error: fetchError } = await supabase
      .from('readings')
      .select('*')
      .eq('slug', slug)
      .single();

    if (fetchError || !reading) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    // Generate first placement to warm cache, then the rest in parallel
    const [first, ...rest] = PLACEMENTS;

    try {
      const { prose } = await generateNatalPlacement(first.id, reading, NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS);
      results[first.dbCol] = prose;
      await supabase.from('readings').update({ [first.dbCol]: prose }).eq('slug', slug);
    } catch (e: any) {
      errors[first.name] = e.message;
    }

    // Rest in parallel — cache should be warm now
    await Promise.allSettled(
      rest.map(async (placement) => {
        try {
          const { prose } = await generateNatalPlacement(placement.id, reading, NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS);
          results[placement.dbCol] = prose;
          await supabase.from('readings').update({ [placement.dbCol]: prose }).eq('slug', slug);
        } catch (e: any) {
          errors[placement.name] = e.message;
        }
      })
    );

    return NextResponse.json({
      success: true,
      generated: Object.keys(results).length,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
