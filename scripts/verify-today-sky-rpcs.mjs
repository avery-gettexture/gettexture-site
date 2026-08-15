// Read-only check (writes nothing): calls the two new Today's Sky RPCs
// using the PUBLIC ANON KEY (same credential a browser visitor has), to
// confirm the open-RPC pattern actually works end-to-end and returns a
// tightly-scoped result, not the whole table.
//
// Usage: node --env-file=.env.local scripts/verify-today-sky-rpcs.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { data: positions, error: posErr } = await supabase.rpc('get_current_sky_positions');
if (posErr) {
  console.error('get_current_sky_positions FAILED:', posErr);
} else {
  console.log(`get_current_sky_positions: ${positions.length} rows`);
  console.table(positions);
}

const { data: aspects, error: aspErr } = await supabase.rpc('get_current_sky_aspects');
if (aspErr) {
  console.error('get_current_sky_aspects FAILED:', aspErr);
} else {
  console.log(`get_current_sky_aspects: ${aspects.length} rows`);
  console.table(aspects);
}

// Confirm direct table reads are still refused for the anon key
// (the RPCs are the only path in, same as get_reading_by_slug).
const { error: directPosErr } = await supabase.from('sky_positions').select('*').limit(1);
console.log('direct sky_positions read (should be refused):', directPosErr?.message ?? 'UNEXPECTEDLY SUCCEEDED');

const { error: directAspErr } = await supabase.from('aspect_calendar').select('*').limit(1);
console.log('direct aspect_calendar read (should be refused):', directAspErr?.message ?? 'UNEXPECTEDLY SUCCEEDED');
