// Standalone dogfood test: generates real transit content for the one
// dogfood chart (Saturn, Mercury, Nodes) via the shared generation module
// at lib/transit-generation/generate-piece.mjs, and writes it to
// transit_pieces. This is a test script, not the production subscription
// route -- that comes later.
//
// Usage:
//   node --env-file=.env.local scripts/generate-transits.mjs --dry-run
//   node --env-file=.env.local scripts/generate-transits.mjs

import { createClient } from '@supabase/supabase-js';
import {
  CALL1_PROMPT, CALL2_PROMPT, MODEL, CALL1_MAX_TOKENS, CALL2_MAX_TOKENS,
  assembleGenerationInputs, generateTransitPiece,
} from '../lib/transit-generation/generate-piece.mjs';

const DOGFOOD_READING_SLUG = 'hejkhjq1zns5';
const BODIES = ['Saturn', 'Mercury', 'Nodes'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function printDivider(label) {
  console.log(`\n${'='.repeat(78)}\n${label}\n${'='.repeat(78)}\n`);
}

async function loadReading(slug) {
  const { data, error } = await supabase
    .from('readings')
    .select('chart_data, birth_time_known, name')
    .eq('slug', slug)
    .single();
  if (error || !data) throw new Error(`Could not load reading: ${error?.message}`);
  return data;
}

// ── Dry run: assemble and print every input, no API call ───────────────────

async function dryRun(reading) {
  printDivider('CALL 1 SYSTEM PROMPT (transit_c1_prompt.txt) -- identical for every body');
  console.log(CALL1_PROMPT);
  printDivider('CALL 2 SYSTEM PROMPT (transit_c2_prompt.txt) -- identical for every body');
  console.log(CALL2_PROMPT);
  console.log(`\nModel: ${MODEL}  |  Call 1 max_tokens: ${CALL1_MAX_TOKENS}  |  Call 2 max_tokens: ${CALL2_MAX_TOKENS}`);

  for (const body of BODIES) {
    const { userMessage, call2FieldBlock, counts, meta, entryIds } = await assembleGenerationInputs(body, reading);

    printDivider(`${body} -- CALL 1 USER MESSAGE`);
    console.log(userMessage);

    printDivider(`${body} -- CALL 2 USER MESSAGE (field-block portion)`);
    console.log(call2FieldBlock);
    console.log(
      '\n[Call 2\'s user message continues with:]\nBRIEF:\n' +
      '<Call 1\'s raw output would go here -- not available in a dry run; no API call has been made>',
    );

    console.log(`\n[meta] ${JSON.stringify(meta)}`);
    console.log(`[entryIds] (${entryIds.length}): ${entryIds.join(', ')}`);
    console.log(`[counts] ${JSON.stringify(counts)}`);
  }

  printDivider('DRY RUN COMPLETE -- no API calls were made');
}

// ── Real run: generate, store, then re-read to confirm state ───────────────

async function realRun(reading) {
  const results = {};
  const errors = {};

  // Generate the first body alone to warm the prompt cache, then the rest
  // in parallel -- mirrors app/api/generate/route.ts's pattern.
  const [first, ...rest] = BODIES;

  try {
    results[first] = await generateTransitPiece(first, reading, DOGFOOD_READING_SLUG);
    const { error } = await supabase.from('transit_pieces').upsert(results[first].row, { onConflict: 'id' });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  } catch (e) {
    errors[first] = e.message;
  }

  await Promise.allSettled(rest.map(async (body) => {
    try {
      results[body] = await generateTransitPiece(body, reading, DOGFOOD_READING_SLUG);
      const { error } = await supabase.from('transit_pieces').upsert(results[body].row, { onConflict: 'id' });
      if (error) throw new Error(`Upsert failed: ${error.message}`);
    } catch (e) {
      errors[body] = e.message;
    }
  }));

  if (Object.keys(errors).length > 0) {
    printDivider('GENERATION ERRORS');
    for (const [body, msg] of Object.entries(errors)) {
      console.error(`${body}: ${msg}`);
    }
  }

  // Never trust the script's own success log -- re-read the rows back.
  const { data: rows, error: readError } = await supabase
    .from('transit_pieces')
    .select('*')
    .eq('reading_slug', DOGFOOD_READING_SLUG)
    .in('body', BODIES.map(b => b.toLowerCase()));
  if (readError) throw new Error(`Could not re-read transit_pieces: ${readError.message}`);

  printDivider('CONFIRMED STATE (re-read from Supabase, not the script\'s own log)');
  for (const row of rows) {
    console.log(`-- ${row.body} --`);
    console.log(`  id: ${row.id}`);
    console.log(`  trigger_id: ${row.trigger_id}`);
    console.log(`  phase: ${row.phase_opened_date} .. ${row.phase_end_date}`);
    console.log(`  sign/motion: ${row.sign ?? 'null'} / ${row.motion ?? 'null'}   north/south: ${row.north_sign ?? 'null'} / ${row.south_sign ?? 'null'}`);
    console.log(`\n  synthesis_prose:\n  ${row.synthesis_prose}\n`);
    console.log(`  timeline_entries (${row.timeline_entries.length}):`);
    for (const e of row.timeline_entries) {
      console.log(`    [${e.id}]\n    ${e.prose}\n`);
    }

    const bodyKey = BODIES.find(b => b.toLowerCase() === row.body);
    const result = bodyKey ? results[bodyKey] : undefined;
    if (result) {
      const u = result.diagnostics.totalUsage;
      console.log(`  token usage -- input: ${u.inputTokens}, output: ${u.outputTokens}, cache_write: ${u.cacheCreationInputTokens}, cache_read: ${u.cacheReadInputTokens}`);
      console.log(`  computed cost: $${result.diagnostics.cost.toFixed(4)} (using current lib/config.ts placeholder rates)`);
    }
    console.log('');
  }

  const confirmedBodies = new Set(rows.map(r => r.body));
  const expectedBodies = BODIES.map(b => b.toLowerCase());
  const missing = expectedBodies.filter(b => !confirmedBodies.has(b));
  if (missing.length > 0) {
    console.error(`WARNING: no confirmed row for: ${missing.join(', ')} -- check the generation errors above.`);
  }
}

async function main() {
  const dryRunFlag = process.argv.includes('--dry-run');

  if (!dryRunFlag && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in this environment.');
    console.error('It may only be set in Vercel -- pull it into .env.local, then re-run:');
    console.error('  node --env-file=.env.local scripts/generate-transits.mjs');
    process.exit(1);
  }

  const reading = await loadReading(DOGFOOD_READING_SLUG);

  if (dryRunFlag) {
    await dryRun(reading);
  } else {
    await realRun(reading);
  }
}

main().catch(err => {
  console.error(err.stack ?? err);
  process.exit(1);
});
