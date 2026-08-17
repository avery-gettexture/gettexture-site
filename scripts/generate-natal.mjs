// Natal generation test/regeneration script for the one dogfood chart,
// mirroring scripts/generate-transits.mjs's shape: --dry-run assembles and
// prints every placement's input with zero API calls; the real run
// generates all 13 placements (single reading, not a batch) and re-reads
// the row from Supabase to confirm state before trusting its own log
// (AGENTS.md hard rule).
//
// Usage:
//   node --env-file=.env.local scripts/generate-natal.mjs --dry-run
//   node --env-file=.env.local scripts/generate-natal.mjs

import { createClient } from '@supabase/supabase-js';
import {
  PLACEMENTS, MODEL, CALL1_MAX_TOKENS, CALL2_MAX_TOKENS,
  assembleGenerationInputs, generateNatalPlacement,
} from '../lib/natal-generation/generate-piece.mjs';
import { DOGFOOD_READING_SLUG, NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS } from '../lib/config.ts';

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
  console.log(`Chart: ${reading.name} (slug ${DOGFOOD_READING_SLUG}). birth_time_known: ${reading.birth_time_known}`);
  console.log(`Model: ${MODEL}  |  Call 1 max_tokens: ${CALL1_MAX_TOKENS}  |  Call 2 max_tokens: ${CALL2_MAX_TOKENS}`);
  console.log(`chart_data.subject.is_diurnal (proxy's own horizon-math sect, for cross-check only): ${reading.chart_data?.subject?.is_diurnal}`);

  for (const placement of PLACEMENTS) {
    const { userMessage } = await assembleGenerationInputs(placement.id, reading);
    printDivider(`${placement.name} (id: ${placement.id}, writes to readings.${placement.dbCol}) -- CALL 1 USER MESSAGE`);
    console.log(userMessage);
  }

  printDivider('DRY RUN COMPLETE -- no API calls were made, no prompts were loaded (Stage 1: lib/prompts/ not yet wired)');
}

// ── Real run: generate, store, then re-read to confirm state ───────────────

async function realRun(reading) {
  const rates = NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS;
  const results = {};
  const errors = {};

  const [first, ...rest] = PLACEMENTS;

  try {
    results[first.id] = await generateNatalPlacement(first.id, reading, rates);
    const { error } = await supabase.from('readings')
      .update({ [first.dbCol]: results[first.id].prose })
      .eq('slug', DOGFOOD_READING_SLUG);
    if (error) throw new Error(`Update failed: ${error.message}`);
  } catch (e) {
    errors[first.id] = e.message;
  }

  await Promise.allSettled(rest.map(async (placement) => {
    try {
      results[placement.id] = await generateNatalPlacement(placement.id, reading, rates);
      const { error } = await supabase.from('readings')
        .update({ [placement.dbCol]: results[placement.id].prose })
        .eq('slug', DOGFOOD_READING_SLUG);
      if (error) throw new Error(`Update failed: ${error.message}`);
    } catch (e) {
      errors[placement.id] = e.message;
    }
  }));

  if (Object.keys(errors).length > 0) {
    printDivider('GENERATION ERRORS');
    for (const [id, msg] of Object.entries(errors)) {
      console.error(`${id}: ${msg}`);
    }
  }

  // Never trust the script's own success log -- re-read the row back.
  const dbCols = PLACEMENTS.map(p => p.dbCol).join(', ');
  const { data: row, error: readError } = await supabase
    .from('readings')
    .select(`slug, ${dbCols}`)
    .eq('slug', DOGFOOD_READING_SLUG)
    .single();
  if (readError) throw new Error(`Could not re-read readings row: ${readError.message}`);

  printDivider('CONFIRMED STATE (re-read from Supabase, not the script\'s own log)');
  for (const placement of PLACEMENTS) {
    const content = row[placement.dbCol];
    console.log(`-- ${placement.name} (readings.${placement.dbCol}) --`);
    console.log(content ? content : '[EMPTY]');
    const result = results[placement.id];
    if (result) {
      const u = result.diagnostics.totalUsage;
      console.log(`  token usage -- input: ${u.inputTokens}, output: ${u.outputTokens}, cache_write: ${u.cacheCreationInputTokens}, cache_read: ${u.cacheReadInputTokens}`);
      console.log(`  computed cost: $${result.diagnostics.cost.toFixed(4)} (using current lib/config.ts placeholder rates)`);
    }
    console.log('');
  }

  const missing = PLACEMENTS.filter(p => !row[p.dbCol]).map(p => p.id);
  if (missing.length > 0) {
    console.error(`WARNING: no confirmed content for: ${missing.join(', ')} -- check the generation errors above.`);
  }
}

async function main() {
  const dryRunFlag = process.argv.includes('--dry-run');

  if (!dryRunFlag && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in this environment.');
    console.error('It may only be set in Vercel -- pull it into .env.local, then re-run:');
    console.error('  node --env-file=.env.local scripts/generate-natal.mjs');
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
