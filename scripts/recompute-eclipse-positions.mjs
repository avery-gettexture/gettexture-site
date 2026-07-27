// STEP 2 (docs/SPEC.md §11A.10): dry-run recompute of the 104 aspect_calendar
// eclipse rows' anchor positions at the true eclipse (syzygy) instant,
// diffed against what's currently stored. READ-ONLY: reads aspect_calendar,
// writes nothing, to no table. Prints the full diff; does not touch the
// live table. An --apply mode is added at Step 4, once the diff and the
// independent validation (Step 3) are both approved -- this script does not
// have one yet on purpose.
//
// See scripts/lib/eclipse-true-instant.mjs for the engine (astronomy-engine,
// self-contained, no API calls) and the syzygy definition.
//
// BOUNDARY_CORRECTIONS supersession: scripts/load-eclipses.mjs carries two
// hand-verified overrides (2031-05-21, 2039-06-21) that exist ONLY because
// the old 00:00 UT snapshot couldn't be trusted near a sign boundary. This
// script computes each eclipse's real position directly at its true
// instant, so those overrides become redundant, not something to layer on
// top of -- this script checks whether the true-instant computation
// independently lands on the same sign the overrides forced, and reports
// pass/fail explicitly rather than silently trusting either source.
//
// Usage: node --env-file=.env.local scripts/recompute-eclipse-positions.mjs

import { createClient } from '@supabase/supabase-js';
import { recomputeEclipse, SIGNS } from './lib/eclipse-true-instant.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Mirrors scripts/load-eclipses.mjs BOUNDARY_CORRECTIONS exactly -- kept
// here only to CHECK against, never to apply. This script's own computed
// values are always what's reported/diffed; this map is a cross-check
// target, not an input.
const BOUNDARY_CORRECTIONS = new Map([
  ['solar-eclipse-2031-05-21', { sign: 'Gemini', degree: 0.0715 }],
  ['solar-eclipse-2039-06-21', { sign: 'Cancer', degree: 0.2085 }],
]);

const NEAR_BOUNDARY_THRESHOLD = 0.5; // degrees from 0 or 30

function longitudeFromSignDegree(sign, degree) {
  return SIGNS.indexOf(sign) * 30 + degree;
}

function shortestAngularDelta(lonA, lonB) {
  let d = Math.abs(lonA - lonB) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

async function fetchEclipseRows() {
  const { data, error } = await supabase
    .from('aspect_calendar')
    .select('id, event, exact_date, body_1_sign, body_2_sign, exact_degree')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse'])
    .order('exact_date', { ascending: true });
  if (error) throw new Error(`Read failed: ${error.message}`);
  return data;
}

async function main() {
  const rows = await fetchEclipseRows();
  console.log(`Read ${rows.length} live eclipse rows from aspect_calendar (read-only).\n`);

  const diffs = [];
  const signChanges = [];
  const nearBoundary = [];
  const anomalousDates = [];
  const boundaryCheck = [];

  for (const row of rows) {
    const isLunar = row.event === 'Lunar Eclipse';
    const kind = isLunar ? 'lunar' : 'solar';
    const { instantUtcDate, isoInstant, positions } = recomputeEclipse(row.exact_date, kind);

    if (instantUtcDate !== row.exact_date) {
      anomalousDates.push({ id: row.id, storedDate: row.exact_date, instantUtcDate, isoInstant });
    }

    const newBody1Sign = positions.Sun.sign;
    const newBody2Sign = isLunar ? positions.Moon.sign : positions.Sun.sign;
    const newDegree = positions.Sun.degree; // identical number to Moon's degree by construction (opposite sign)

    const oldLon = longitudeFromSignDegree(row.body_1_sign, row.exact_degree);
    const newLon = longitudeFromSignDegree(newBody1Sign, newDegree);
    const shiftDeg = shortestAngularDelta(oldLon, newLon);

    const body1Changed = newBody1Sign !== row.body_1_sign;
    const body2Changed = newBody2Sign !== row.body_2_sign;

    const rec = {
      id: row.id,
      event: row.event,
      exact_date: row.exact_date,
      isoInstant,
      old: { body_1_sign: row.body_1_sign, body_2_sign: row.body_2_sign, exact_degree: row.exact_degree },
      new: { body_1_sign: newBody1Sign, body_2_sign: newBody2Sign, exact_degree: newDegree },
      shiftDeg,
      body1Changed,
      body2Changed,
    };
    diffs.push(rec);

    if (body1Changed || body2Changed) signChanges.push(rec);
    if (newDegree < NEAR_BOUNDARY_THRESHOLD || newDegree > 30 - NEAR_BOUNDARY_THRESHOLD) nearBoundary.push(rec);

    const override = BOUNDARY_CORRECTIONS.get(row.id);
    if (override) {
      const anchorSign = isLunar ? newBody2Sign : newBody1Sign;
      const matches = anchorSign === override.sign;
      boundaryCheck.push({
        id: row.id,
        overrideSign: override.sign,
        overrideDegree: override.degree,
        computedSign: anchorSign,
        computedDegree: newDegree,
        degreeDelta: Math.abs(newDegree - override.degree),
        matches,
      });
    }
  }

  console.log('=== FULL POSITION DIFF (all 104 eclipses) ===');
  for (const d of diffs) {
    const flag = d.body1Changed || d.body2Changed ? '  <<< SIGN CHANGE' : '';
    console.log(
      `${d.exact_date}  ${d.id.padEnd(24)} old ${d.old.body_1_sign}/${d.old.body_2_sign} @ ${d.old.exact_degree.toFixed(4)}°  ->  `
      + `new ${d.new.body_1_sign}/${d.new.body_2_sign} @ ${d.new.exact_degree.toFixed(4)}°  (shift ${d.shiftDeg.toFixed(4)}°, instant ${d.isoInstant})${flag}`,
    );
  }

  console.log('\n=== SIGN CHANGES (called out prominently) ===');
  if (signChanges.length === 0) {
    console.log('None. No eclipse changes sign at the true instant.');
  } else {
    for (const d of signChanges) {
      console.log(`  ${d.id}: body_1 ${d.old.body_1_sign} -> ${d.new.body_1_sign}, body_2 ${d.old.body_2_sign} -> ${d.new.body_2_sign}`);
    }
  }

  console.log(`\n=== NEAR SIGN-BOUNDARY ROWS (<${NEAR_BOUNDARY_THRESHOLD}° from 0° or 30°, sign changed or not) ===`);
  if (nearBoundary.length === 0) {
    console.log('None.');
  } else {
    for (const d of nearBoundary) {
      console.log(`  ${d.id}: new degree ${d.new.exact_degree.toFixed(4)}° in ${d.new.body_1_sign}/${d.new.body_2_sign}${d.body1Changed || d.body2Changed ? ' (sign changed)' : ' (sign unchanged)'}`);
    }
  }

  console.log('\n=== BOUNDARY_CORRECTIONS supersession check (load-eclipses.mjs hardcoded overrides) ===');
  for (const b of boundaryCheck) {
    console.log(
      `  ${b.id}: override says ${b.overrideSign} ${b.overrideDegree}°; true-instant computation independently gives `
      + `${b.computedSign} ${b.computedDegree.toFixed(4)}° (Δ${b.degreeDelta.toFixed(4)}°) -- ${b.matches ? 'SIGN MATCHES, override is now redundant' : 'SIGN MISMATCH -- STOP, this needs manual resolution before any write'}`,
    );
  }
  const allBoundaryMatch = boundaryCheck.every((b) => b.matches);
  console.log(
    allBoundaryMatch
      ? '  -> Recommendation: retire BOUNDARY_CORRECTIONS from load-eclipses.mjs entirely at Step 4 -- the true-instant recompute supersedes it and produces the same signs independently.'
      : '  -> DO NOT PROCEED: at least one override disagrees with the true-instant computation.',
  );

  console.log('\n=== SAME-CALENDAR-DATE CHECK ===');
  if (anomalousDates.length === 0) {
    console.log('All 104 true instants fall on the same UTC calendar date already stored in exact_date. No anomalies.');
  } else {
    console.log(`${anomalousDates.length} eclipse(s) have a true instant landing on a DIFFERENT UTC date than stored -- STOP, needs review:`);
    for (const a of anomalousDates) console.log(`  ${a.id}: stored ${a.storedDate}, true instant ${a.isoInstant} (UTC date ${a.instantUtcDate})`);
  }

  console.log('\n=== SHIFT MAGNITUDE SUMMARY ===');
  const shifts = diffs.map((d) => d.shiftDeg);
  const maxShift = Math.max(...shifts);
  const maxShiftRow = diffs.find((d) => d.shiftDeg === maxShift);
  console.log(`Max shift: ${maxShift.toFixed(4)}° (${maxShiftRow.id}). Expected order of magnitude: up to ~1° (time-of-day offset from 00:00 UT).`);
  const overOneDeg = diffs.filter((d) => d.shiftDeg > 1);
  if (overOneDeg.length > 0) {
    console.log(`FLAGGED -- ${overOneDeg.length} row(s) shifted more than 1°, larger than the snapshot-vs-instant offset alone should explain:`);
    for (const d of overOneDeg) console.log(`  ${d.id}: shift ${d.shiftDeg.toFixed(4)}°`);
  } else {
    console.log('No row shifted more than 1° -- consistent with the snapshot-vs-instant offset being the sole cause.');
  }

  console.log(`\nDone. ${diffs.length} eclipses processed, ${signChanges.length} sign change(s), ${nearBoundary.length} near-boundary row(s). No writes made.`);
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
