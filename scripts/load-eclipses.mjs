// Writes the 104 eclipse rows (2023-01-01 through 2046-07-31) into
// aspect_calendar. Source: NASA's Five Millennium Canon of Solar/Lunar
// Eclipses (eclipse.gsfc.nasa.gov), cross-checked against USNO (exact match,
// 2023-2026) and against sky_positions itself via
// scripts/verify-eclipse-dates.mjs (all 104 dates passed the lunation/node
// geometry check -- see that script's output for the margins).
//
// TRUE-INSTANT BASIS (docs/SPEC.md §11A.10, ratified and built): every
// eclipse's body_1_sign/body_2_sign/exact_degree is computed at the exact
// Sun-Moon syzygy instant (conjunction for solar, opposition for lunar),
// not the 00:00 UT daily sky_positions snapshot -- see
// scripts/lib/eclipse-true-instant.mjs for the self-contained engine
// (astronomy-engine) and the syzygy solver. This SUPERSEDES the earlier
// "read the Sun's daily snapshot, it's close enough" approach: the midnight
// snapshot can sit up to ~1 degree off the true instant, which is enough to
// flip a near-orb-edge aspect or, rarely, land on the wrong side of a sign
// boundary.
//
// BOUNDARY_CORRECTIONS RETIRED (was here, now removed -- do not re-add): a
// prior version of this script carried two hand-verified overrides
// (2031-05-21 -> Gemini 0.0715 deg; 2039-06-21 -> Cancer 0.2085 deg) for
// eclipses that fell right on a sign boundary the same UTC day, found by a
// one-time manual check against NASA's published time of greatest eclipse.
// The true-instant computation below reproduces both corrections
// independently (within arcseconds), and was itself cross-validated against
// an independent second ephemeris (sweph / Swiss Ephemeris, Moshier mode --
// see scripts/validate-eclipse-instants-sweph.mjs). Three-way agreement
// (hand-check, astronomy-engine, sweph) is why the override table is gone
// rather than kept alongside the computation it used to patch around.
//
// SIGN/DEGREE MEANING: body_1_sign is always the Sun's sign at the true
// instant. For a Solar Eclipse (conjunction), body_2_sign equals
// body_1_sign. For a Lunar Eclipse (opposition), body_2_sign is the Moon's
// own true-instant sign (not derived as "the opposite sign" -- at an exact
// syzygy the two are the same thing, but computing it directly is more
// honest about what's actually being measured). exact_degree is the
// degree-within-sign shared by both bodies at exactness (Sun and Moon land
// on the identical degree number, opposite signs, by construction of an
// exact syzygy).
//
// Deterministic and idempotent: upserts on id. Writes nothing until this
// script is run.
//
// Usage: node --env-file=.env.local scripts/load-eclipses.mjs

import { createClient } from '@supabase/supabase-js';
import { recomputeEclipse } from './lib/eclipse-true-instant.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const SOLAR_DATES = [
  '2023-04-20', '2023-10-14', '2024-04-08', '2024-10-02', '2025-03-29', '2025-09-21',
  '2026-02-17', '2026-08-12', '2027-02-06', '2027-08-02', '2028-01-26', '2028-07-22',
  '2029-01-14', '2029-06-12', '2029-07-11', '2029-12-05', '2030-06-01', '2030-11-25',
  '2031-05-21', '2031-11-14', '2032-05-09', '2032-11-03', '2033-03-30', '2033-09-23',
  '2034-03-20', '2034-09-12', '2035-03-09', '2035-09-02', '2036-02-27', '2036-07-23',
  '2036-08-21', '2037-01-16', '2037-07-13', '2038-01-05', '2038-07-02', '2038-12-26',
  '2039-06-21', '2039-12-15', '2040-05-11', '2040-11-04', '2041-04-30', '2041-10-25',
  '2042-04-20', '2042-10-14', '2043-04-09', '2043-10-03', '2044-02-28', '2044-08-23',
  '2045-02-16', '2045-08-12', '2046-02-05',
];

const LUNAR_DATES = [
  '2023-05-05', '2023-10-28', '2024-03-25', '2024-09-18', '2025-03-14', '2025-09-07',
  '2026-03-03', '2026-08-28', '2027-02-20', '2027-07-18', '2027-08-17', '2028-01-12',
  '2028-07-06', '2028-12-31', '2029-06-26', '2029-12-20', '2030-06-15', '2030-12-09',
  '2031-05-07', '2031-06-05', '2031-10-30', '2032-04-25', '2032-10-18', '2033-04-14',
  '2033-10-08', '2034-04-03', '2034-09-28', '2035-02-22', '2035-08-19', '2036-02-11',
  '2036-08-07', '2037-01-31', '2037-07-27', '2038-01-21', '2038-06-17', '2038-07-16',
  '2038-12-11', '2039-06-06', '2039-11-30', '2040-05-26', '2040-11-18', '2041-05-16',
  '2041-11-08', '2042-04-05', '2042-09-29', '2043-03-25', '2043-09-19', '2044-03-13',
  '2044-09-07', '2045-03-03', '2045-08-27', '2046-01-22', '2046-07-18',
];

function printSample(rows) {
  for (const r of rows) {
    console.log(`${r.exact_date}  ${r.event.padEnd(13)} ${r.body_1_sign}/${r.body_2_sign} @ ${r.exact_degree.toFixed(2)} deg   id=${r.id}`);
  }
}

async function main() {
  const rows = [];

  for (const date of SOLAR_DATES) {
    const { positions } = recomputeEclipse(date, 'solar');
    rows.push({
      id: `solar-eclipse-${date}`,
      event: 'Solar Eclipse',
      body_1: 'Sun',
      body_2: 'Moon',
      body_1_sign: positions.Sun.sign,
      body_2_sign: positions.Sun.sign, // conjunction -- same sign
      window_start: null,
      window_end: null,
      exact_date: date,
      pass_n: null,
      pass_m: null,
      body_1_retrograde: null,
      body_2_retrograde: null,
      exact_degree: positions.Sun.degree,
    });
  }

  for (const date of LUNAR_DATES) {
    const { positions } = recomputeEclipse(date, 'lunar');
    rows.push({
      id: `lunar-eclipse-${date}`,
      event: 'Lunar Eclipse',
      body_1: 'Sun',
      body_2: 'Moon',
      body_1_sign: positions.Sun.sign,
      body_2_sign: positions.Moon.sign, // computed directly at the true instant
      window_start: null,
      window_end: null,
      exact_date: date,
      pass_n: null,
      pass_m: null,
      body_1_retrograde: null,
      body_2_retrograde: null,
      exact_degree: positions.Sun.degree, // identical to Moon's degree by construction (opposite sign)
    });
  }

  rows.sort((a, b) => (a.exact_date < b.exact_date ? -1 : a.exact_date > b.exact_date ? 1 : 0));

  console.log(`Writing ${rows.length} eclipse rows (${SOLAR_DATES.length} solar + ${LUNAR_DATES.length} lunar) to aspect_calendar, computed at the true syzygy instant.\n`);

  const { error } = await supabase
    .from('aspect_calendar')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`Supabase write failed: ${error.message}`);

  console.log('Done. Full list:\n');
  printSample(rows);
}

// Guard against running on import: this script writes to a live table.
// Only run when invoked directly, never on import (see the note in
// generate-aspect-calendar.mjs for why this matters).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
