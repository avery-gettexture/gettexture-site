// Admin script: create + generate an example reading WITHOUT going through
// Stripe. Reuses the exact same chart-fetch and generation code as the real
// purchase path -- it does not reinvent either.
//
// Mirrors app/api/stripe-webhook/route.ts (minus the Stripe charge and the
// Resend confirmation email -- there is no real payment and no real
// recipient for a public-figure example reading). Mirrors
// scripts/generate-natal.mjs for generation, but parameterized by slug
// instead of hardcoded to DOGFOOD_READING_SLUG, reusing its underlying
// lib/natal-generation/generate-piece.mjs functions unmodified.
//
// Usage:
//   node --env-file=.env.local scripts/create-example-reading.mjs \
//     --slug=exampleslug1 \
//     --name="Marilyn Monroe" \
//     --birth-date=1926-06-01 \
//     --birth-time="9:30 AM" \
//     --birth-location="Los Angeles, CA" \
//     --birth-lat=34.0522 \
//     --birth-lng=-118.2437 \
//     [--birth-time-known=false]   (default true)
//     [--dry-run]                  (compute chart + print generation inputs, no writes, no API calls)

import { createClient } from '@supabase/supabase-js';
import {
  PLACEMENTS, assembleGenerationInputs, generateNatalPlacement,
} from '../lib/natal-generation/generate-piece.mjs';
import { NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS } from '../lib/config.ts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function printDivider(label) {
  console.log(`\n${'='.repeat(78)}\n${label}\n${'='.repeat(78)}\n`);
}

// ── CLI args ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') { args.dryRun = true; continue; }
    const match = arg.match(/^--([a-z-]+)=(.*)$/);
    if (!match) continue;
    args[match[1]] = match[2];
  }

  const required = ['slug', 'name', 'birth-date', 'birth-time', 'birth-location', 'birth-lat', 'birth-lng'];
  const missing = required.filter(key => !args[key]);
  if (missing.length > 0) {
    console.error(`Missing required flags: ${missing.map(k => `--${k}`).join(', ')}`);
    process.exit(1);
  }

  return {
    slug: args.slug,
    name: args.name,
    birthDate: args['birth-date'],
    birthTime: args['birth-time'],
    birthLocation: args['birth-location'],
    birthLat: parseFloat(args['birth-lat']),
    birthLng: parseFloat(args['birth-lng']),
    birthTimeKnown: args['birth-time-known'] === undefined ? true : args['birth-time-known'] === 'true',
    dryRun: !!args.dryRun,
  };
}

// Same parsing as app/api/stripe-webhook/route.ts (lines 49-58) -- duplicated
// rather than imported, since the webhook route isn't a shared module.
function parseBirthDateTime(birthDate, birthTime) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [timePart, ampm] = birthTime.split(' ');
  const [rawHour, minute] = timePart.split(':').map(Number);
  let hour = rawHour;
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return { year, month, day, hour, minute };
}

// ── Chart fetch (same proxy path the webhook uses) ──────────────────────

async function computeChartData(subject) {
  const chartRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject }),
  });
  if (!chartRes.ok) {
    const errText = await chartRes.text();
    throw new Error(`/api/chart failed (${chartRes.status}): ${errText}`);
  }
  const chartJson = await chartRes.json();
  return chartJson?.chart_data ?? chartJson;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const cli = parseArgs();

  if (!cli.dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in this environment.');
    console.error('Pull it into .env.local, then re-run with --env-file=.env.local.');
    process.exit(1);
  }

  const { year, month, day, hour, minute } = parseBirthDateTime(cli.birthDate, cli.birthTime);
  const subject = { year, month, day, hour, minute, latitude: cli.birthLat, longitude: cli.birthLng };

  console.log(`Figure: ${cli.name} (slug: ${cli.slug})`);
  console.log(`Birth: ${cli.birthDate} ${cli.birthTime} at ${cli.birthLocation} (${cli.birthLat}, ${cli.birthLng}), birth_time_known: ${cli.birthTimeKnown}`);

  printDivider('Computing chart_data via /api/chart (requires local dev server running)');
  const chartData = await computeChartData(subject);
  console.log(`chart_data.subject.is_diurnal: ${chartData?.subject?.is_diurnal}`);

  const reading = { chart_data: chartData, birth_time_known: cli.birthTimeKnown, name: cli.name };

  if (cli.dryRun) {
    for (const placement of PLACEMENTS) {
      const { userMessage } = await assembleGenerationInputs(placement.id, reading);
      printDivider(`${placement.name} (id: ${placement.id}, writes to readings.${placement.dbCol}) -- CALL 1 USER MESSAGE`);
      console.log(userMessage);
    }
    printDivider('DRY RUN COMPLETE -- no Supabase writes, no Anthropic calls were made');
    return;
  }

  // Slug must not already exist -- this script never overwrites.
  const { data: existing } = await supabase.from('readings').select('slug').eq('slug', cli.slug).single();
  if (existing) {
    console.error(`Slug "${cli.slug}" already exists in readings. Choose a different slug.`);
    process.exit(1);
  }

  printDivider('Inserting readings row');
  const { data: newReading, error: insertError } = await supabase
    .from('readings')
    .insert({
      slug: cli.slug,
      name: cli.name,
      birth_date: cli.birthDate,
      birth_time: cli.birthTime,
      birth_location: cli.birthLocation,
      birth_lat: cli.birthLat,
      birth_lng: cli.birthLng,
      birth_time_known: cli.birthTimeKnown,
      chart_data: chartData,
    })
    .select('id')
    .single();
  if (insertError) throw new Error(`Supabase insert error: ${insertError.message}`);
  console.log(`readings row created, id: ${newReading.id}`);

  // reading_contacts.email is NOT NULL and there is no real customer for a
  // public-figure example reading -- placeholder value, flagged for Avery's
  // review rather than decided silently.
  const placeholderEmail = `example+${cli.slug}@gettexture.app`;
  printDivider(`Inserting reading_contacts row (placeholder email: ${placeholderEmail})`);
  const { error: contactError } = await supabase.from('reading_contacts').insert({
    reading_id: newReading.id,
    email: placeholderEmail,
  });
  if (contactError) throw new Error(`Supabase reading_contacts insert error: ${contactError.message}`);
  console.log('reading_contacts row created.');

  // ── Generation: same shape as generate-natal.mjs's realRun ─────────────
  const rates = NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS;
  const results = {};
  const errors = {};

  const [first, ...rest] = PLACEMENTS;

  printDivider('Generating all 13 placements');

  try {
    results[first.id] = await generateNatalPlacement(first.id, reading, rates);
    const { error } = await supabase.from('readings')
      .update({ [first.dbCol]: results[first.id].prose })
      .eq('slug', cli.slug);
    if (error) throw new Error(`Update failed: ${error.message}`);
  } catch (e) {
    errors[first.id] = e.message;
  }

  await Promise.allSettled(rest.map(async (placement) => {
    try {
      results[placement.id] = await generateNatalPlacement(placement.id, reading, rates);
      const { error } = await supabase.from('readings')
        .update({ [placement.dbCol]: results[placement.id].prose })
        .eq('slug', cli.slug);
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
    .select(`slug, chart_data, north_node, south_node, ${dbCols}`)
    .eq('slug', cli.slug)
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

  console.log(`Legacy north_node/south_node columns -- north_node: ${row.north_node === null ? '[untouched, null]' : row.north_node}, south_node: ${row.south_node === null ? '[untouched, null]' : row.south_node}`);
}

main().catch(err => {
  console.error(err.stack ?? err);
  process.exit(1);
});
