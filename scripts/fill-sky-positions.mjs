// Fills sky_positions with one row per body per day, 2023-01-01 through
// 2046-07-31 (or a --start/--end override), by calling the deployed
// astrology-proxy chart endpoint once per date and keeping only the bodies
// this table tracks.
//
// Usage:
//   node --env-file=.env.local scripts/fill-sky-positions.mjs
//   node --env-file=.env.local scripts/fill-sky-positions.mjs --start=2023-01-01 --end=2023-01-07
//
// Resumable: for each date, checks which of the 12 bodies already have rows
// before calling the proxy. A date with all 12 present is skipped entirely
// (no proxy call, no write). Existing rows are never updated or deleted —
// writes use upsert with ignoreDuplicates, keyed on (body, date).
//
// Failures (proxy errors, network errors, malformed responses) are appended
// to fill-sky-positions.failures.log and the loop continues.

import { createClient } from '@supabase/supabase-js';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FAILURE_LOG = path.join(__dirname, 'fill-sky-positions.failures.log');

const PROXY_URL = 'https://astrology-proxy.vercel.app/api/chart';
const REQUEST_DELAY_MS = 200;

// Land coordinates that have used UTC+0 with no daylight saving time for
// their entire modern history (Accra, Ghana). The proxy's underlying
// library localizes hour/minute using the dummy location's time zone
// (verified empirically: Greenwich, UK gives different results for the
// same hour:0 in July vs. January, off by exactly the ~1hr DST shift).
// A coordinate whose zone never observes DST is the only way to guarantee
// hour:0/minute:0 always means true 00:00 UTC across the full date range.
const DUMMY_LATITUDE = 5.6037;
const DUMMY_LONGITUDE = -0.1870;

const DEFAULT_START = '2023-01-01';
const DEFAULT_END = '2046-07-31';

// proxyKey = the lowercased key chart.js stores this body under in
// chart_data.subject; label = the value written to sky_positions.body.
const BODIES = [
  { proxyKey: 'sun', label: 'Sun' },
  { proxyKey: 'moon', label: 'Moon' },
  { proxyKey: 'mercury', label: 'Mercury' },
  { proxyKey: 'venus', label: 'Venus' },
  { proxyKey: 'mars', label: 'Mars' },
  { proxyKey: 'jupiter', label: 'Jupiter' },
  { proxyKey: 'saturn', label: 'Saturn' },
  { proxyKey: 'uranus', label: 'Uranus' },
  { proxyKey: 'neptune', label: 'Neptune' },
  { proxyKey: 'pluto', label: 'Pluto' },
  { proxyKey: 'mean_north_lunar_node', label: 'North Node' },
  { proxyKey: 'mean_south_lunar_node', label: 'South Node' },
];

// Matches SIGN_ABBR_MAP in app/api/generate/route.ts.
const SIGN_ABBR_TO_FULL = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v];
    }),
  );
  return {
    start: args.start ?? DEFAULT_START,
    end: args.end ?? DEFAULT_END,
  };
}

function* dateRange(startStr, endStr) {
  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    yield d.toISOString().slice(0, 10);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logFailure(dateStr, error) {
  const line = `${new Date().toISOString()}\t${dateStr}\t${error}\n`;
  await appendFile(FAILURE_LOG, line);
}

async function existingBodiesForDate(dateStr) {
  const { data, error } = await supabase
    .from('sky_positions')
    .select('body')
    .eq('date', dateStr);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return new Set(data.map((row) => row.body));
}

async function fetchPositions(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: {
        year,
        month,
        day,
        hour: 0,
        minute: 0,
        latitude: DUMMY_LATITUDE,
        longitude: DUMMY_LONGITUDE,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Proxy ${response.status}: ${text.slice(0, 300)}`);
  }

  const json = await response.json();
  const subject = json?.chart_data?.subject;
  if (!subject) throw new Error('Malformed proxy response: missing chart_data.subject');
  return subject;
}

function buildRows(dateStr, subject) {
  return BODIES.map(({ proxyKey, label }) => {
    const body = subject[proxyKey];
    if (!body) throw new Error(`Malformed proxy response: missing "${proxyKey}"`);

    const sign = SIGN_ABBR_TO_FULL[body.sign];
    if (!sign) throw new Error(`Unknown sign abbreviation "${body.sign}" for ${label}`);

    return {
      body: label,
      date: dateStr,
      longitude: body.abs_pos,
      sign,
      sign_degree: body.position,
      retrograde: body.retrograde,
    };
  });
}

async function writeRows(rows) {
  const { error } = await supabase
    .from('sky_positions')
    .upsert(rows, { onConflict: 'body,date', ignoreDuplicates: true });
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}

async function main() {
  const { start, end } = parseArgs();
  const dates = [...dateRange(start, end)];

  console.log(`sky_positions fill: ${start} -> ${end} (${dates.length} days)`);

  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, dateStr] of dates.entries()) {
    try {
      const existing = await existingBodiesForDate(dateStr);
      if (existing.size >= BODIES.length) {
        skipped += 1;
        continue;
      }

      const subject = await fetchPositions(dateStr);
      const rows = buildRows(dateStr, subject);
      await writeRows(rows);
      written += 1;

      await sleep(REQUEST_DELAY_MS);
    } catch (err) {
      failed += 1;
      await logFailure(dateStr, err.message ?? String(err));
      console.error(`[${i + 1}/${dates.length}] ${dateStr} FAILED: ${err.message ?? err}`);
      continue;
    }

    if ((i + 1) % 25 === 0 || i === dates.length - 1) {
      console.log(`[${i + 1}/${dates.length}] ${dateStr} ok (written=${written} skipped=${skipped} failed=${failed})`);
    }
  }

  console.log(`Done. written=${written} skipped=${skipped} failed=${failed}`);
  if (failed > 0) console.log(`See ${FAILURE_LOG} for details.`);
}

// Guard against running on import: this script writes to a live table.
// Only run when invoked directly, never on import (see the note in
// generate-aspect-calendar.mjs for why this matters).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
