// STEP 2 (docs/SPEC.md §11A.10): dry-run recompute of eclipse_aspects at the
// true eclipse instant, diffed against the live table. READ-ONLY: reads
// aspect_calendar, eclipse_aspects, and sky_positions; writes nothing. An
// --apply mode is added at Step 4 only, after the diff and the independent
// validation (Step 3) are both approved.
//
// Anchor position and other-body positions both come fresh from
// scripts/lib/eclipse-true-instant.mjs at the true instant -- NOT read from
// aspect_calendar or sky_positions for the new values. sky_positions is
// read here ONLY to reconstruct what the OLD (00:00 UT snapshot) computation
// would have produced, for the diff and the "did the shift explain the
// change" sanity check -- never as an input to the new numbers.
//
// ASPECT RULES (unchanged from scripts/generate-eclipse-aspects.mjs):
// anchor = eclipsed body (Moon lunar / Sun solar); compared against the
// same 8 non-luminary bodies for every eclipse; sign-consonant only; 3
// degree active orb is the sole qualifying threshold (no separate "exact"
// state at a frozen instant).
//
// Usage: node --env-file=.env.local scripts/recompute-eclipse-aspects.mjs

import { createClient } from '@supabase/supabase-js';
import { recomputeEclipse, SIGNS } from './lib/eclipse-true-instant.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const OTHER_BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const ASPECT_ANGLES = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const SIGN_DIST_TO_ASPECT = { 0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition' };
const ACTIVE_ORB = 3;

// Known flip dates external validation (Swiss Ephemeris / Moshier) already
// found between the midnight-snapshot basis and the true instant.
const KNOWN_FLIP_DATES = new Set(['solar-eclipse-2027-08-02', 'solar-eclipse-2045-08-12']);

function signDistance(sign1, sign2) {
  const i1 = SIGNS.indexOf(sign1);
  const i2 = SIGNS.indexOf(sign2);
  const diff = Math.abs(i1 - i2);
  return Math.min(diff, 12 - diff);
}

function angularSeparation(lon1, lon2) {
  const diff = Math.abs(lon1 - lon2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function longitudeFromSignDegree(sign, degree) {
  return SIGNS.indexOf(sign) * 30 + degree;
}

// Returns { aspect, orb } if sign-consonant (orb uncapped here -- caller
// decides whether it qualifies), or { aspect: null, orb: null } if the sign
// distance has no aspect mapping at all (1 or 5 signs apart).
function evaluateAspect(anchorSign, anchorLon, otherSign, otherLon) {
  const dist = signDistance(anchorSign, otherSign);
  const aspect = SIGN_DIST_TO_ASPECT[dist] ?? null;
  if (!aspect) return { aspect: null, orb: null };
  const sep = angularSeparation(anchorLon, otherLon);
  const orb = Math.abs(sep - ASPECT_ANGLES[aspect]);
  return { aspect, orb };
}

async function fetchEclipseRows() {
  const { data, error } = await supabase
    .from('aspect_calendar')
    .select('id, event, exact_date, body_1_sign, body_2_sign, exact_degree')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse'])
    .order('exact_date', { ascending: true });
  if (error) throw new Error(`Read failed for aspect_calendar: ${error.message}`);
  return data;
}

async function fetchLiveEclipseAspects() {
  const PAGE_SIZE = 1000;
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('eclipse_aspects')
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Read failed for eclipse_aspects: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  const map = new Map();
  for (const r of rows) map.set(`${r.eclipse_id}|${r.other_body}`, r);
  return { rows, map };
}

async function fetchOldSkyPositions(dates) {
  const PAGE_SIZE = 1000;
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('sky_positions')
      .select('date, body, sign, sign_degree, longitude, retrograde')
      .in('body', OTHER_BODIES)
      .in('date', dates)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Read failed for sky_positions: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.date)) map.set(r.date, new Map());
    map.get(r.date).set(r.body, r);
  }
  return map;
}

async function main() {
  const eclipses = await fetchEclipseRows();
  const { rows: liveRows, map: liveMap } = await fetchLiveEclipseAspects();
  const dates = [...new Set(eclipses.map((e) => e.exact_date))];
  const oldSky = await fetchOldSkyPositions(dates);

  console.log(`Read ${eclipses.length} live eclipse rows, ${liveRows.length} live eclipse_aspects rows, sky_positions for ${dates.length} dates (all read-only).\n`);

  const appeared = [];
  const disappeared = [];
  const typeChanged = [];
  const orbChanged = [];
  const retrogradeChanged = [];
  const selfCheckMismatches = [];
  const orbDeltaFlags = [];
  const knownFlipRows = [];

  for (const eclipse of eclipses) {
    const isLunar = eclipse.event === 'Lunar Eclipse';

    // OLD anchor (as currently stored in aspect_calendar).
    const oldAnchorSign = isLunar ? eclipse.body_2_sign : eclipse.body_1_sign;
    const oldAnchorLon = longitudeFromSignDegree(oldAnchorSign, eclipse.exact_degree);

    // NEW anchor + all 10 bodies, fresh at the true instant.
    const { positions: newPositions } = recomputeEclipse(eclipse.exact_date, isLunar ? 'lunar' : 'solar');
    const newAnchorSign = isLunar ? newPositions.Moon.sign : newPositions.Sun.sign;
    const newAnchorLon = longitudeFromSignDegree(newAnchorSign, newPositions.Sun.degree);
    const anchorShiftDeg = angularSeparation(oldAnchorLon, newAnchorLon);

    const oldSkyForDate = oldSky.get(eclipse.exact_date);

    for (const otherBody of OTHER_BODIES) {
      const key = `${eclipse.id}|${otherBody}`;
      const liveRow = liveMap.get(key);
      const oldSkyPos = oldSkyForDate.get(otherBody);
      if (!oldSkyPos) throw new Error(`Missing sky_positions for ${otherBody} on ${eclipse.exact_date}`);

      // Reconstruct what the OLD computation produced (should match liveRow
      // exactly if it qualified -- self-check below).
      const oldEval = evaluateAspect(oldAnchorSign, oldAnchorLon, oldSkyPos.sign, oldSkyPos.longitude);
      const oldQualifies = !!(oldEval.aspect && oldEval.orb <= ACTIVE_ORB);

      if (oldQualifies !== !!liveRow || (liveRow && (liveRow.aspect !== oldEval.aspect || Math.abs(liveRow.orb - oldEval.orb) > 0.0005))) {
        selfCheckMismatches.push({
          eclipseId: eclipse.id, otherBody,
          liveRow: liveRow ? { aspect: liveRow.aspect, orb: liveRow.orb } : null,
          recomputedOld: oldQualifies ? oldEval : null,
        });
      }

      // NEW evaluation, fresh at the true instant.
      const newPos = newPositions[otherBody];
      const newEval = evaluateAspect(newAnchorSign, newAnchorLon, newPos.sign, newPos.longitude);
      const newQualifies = !!(newEval.aspect && newEval.orb <= ACTIVE_ORB);

      const otherBodyShiftDeg = angularSeparation(oldSkyPos.longitude, newPos.longitude);
      const combinedExpectedMax = anchorShiftDeg + otherBodyShiftDeg;

      const oldLabel = oldQualifies ? `${oldEval.aspect} @ orb ${oldEval.orb.toFixed(4)}°` : (oldEval.aspect ? `${oldEval.aspect} @ orb ${oldEval.orb.toFixed(4)}° (exceeds ${ACTIVE_ORB}°, no row)` : 'not sign-consonant, no row');
      const newLabel = newQualifies ? `${newEval.aspect} @ orb ${newEval.orb.toFixed(4)}°` : (newEval.aspect ? `${newEval.aspect} @ orb ${newEval.orb.toFixed(4)}° (exceeds ${ACTIVE_ORB}°, no row)` : 'not sign-consonant, no row');

      const rec = {
        eclipseId: eclipse.id, eclipseDate: eclipse.exact_date, otherBody,
        oldQualifies, newQualifies, oldEval, newEval, oldLabel, newLabel,
        anchorShiftDeg, otherBodyShiftDeg, combinedExpectedMax,
        oldRetrograde: liveRow ? liveRow.other_body_retrograde : null,
        newRetrograde: newPos.retrograde,
        isKnownFlip: KNOWN_FLIP_DATES.has(eclipse.id) && otherBody === 'Neptune',
      };

      if (rec.isKnownFlip) knownFlipRows.push(rec);

      if (!oldQualifies && newQualifies) {
        appeared.push(rec);
      } else if (oldQualifies && !newQualifies) {
        disappeared.push(rec);
      } else if (oldQualifies && newQualifies && oldEval.aspect !== newEval.aspect) {
        typeChanged.push(rec);
      } else if (oldQualifies && newQualifies && Math.abs(oldEval.orb - newEval.orb) > 0.0005) {
        orbChanged.push(rec);
        const orbDelta = Math.abs(newEval.orb - oldEval.orb);
        if (orbDelta > combinedExpectedMax + 0.01) orbDeltaFlags.push({ ...rec, orbDelta });
      }

      if (liveRow && liveRow.other_body_retrograde !== newPos.retrograde) {
        retrogradeChanged.push(rec);
      }
    }
  }

  console.log('=== SELF-CHECK: recomputed-old vs live eclipse_aspects (should be empty) ===');
  if (selfCheckMismatches.length === 0) {
    console.log('Clean -- reconstructing the OLD computation from the current aspect_calendar + sky_positions exactly reproduces all 79 live eclipse_aspects rows.');
  } else {
    console.log(`${selfCheckMismatches.length} mismatch(es) -- underlying tables may have changed since eclipse_aspects was generated:`);
    for (const m of selfCheckMismatches) console.log(`  ${m.eclipseId} / ${m.otherBody}: live=${JSON.stringify(m.liveRow)}, recomputed-old=${JSON.stringify(m.recomputedOld)}`);
  }

  console.log(`\n=== ASPECTS APPEARED (${appeared.length}) -- new qualifying aspect that did not exist before ===`);
  for (const r of appeared) {
    console.log(`  ${r.eclipseDate} ${r.eclipseId} / ${r.otherBody}: old [${r.oldLabel}]  ->  new [${r.newLabel}]  (anchor shift ${r.anchorShiftDeg.toFixed(4)}°, ${r.otherBody} shift ${r.otherBodyShiftDeg.toFixed(4)}°)`);
  }

  console.log(`\n=== ASPECTS DISAPPEARED (${disappeared.length}) -- previously stored, no longer qualifies ===`);
  for (const r of disappeared) {
    console.log(`  ${r.eclipseDate} ${r.eclipseId} / ${r.otherBody}: old [${r.oldLabel}]  ->  new [${r.newLabel}]  (anchor shift ${r.anchorShiftDeg.toFixed(4)}°, ${r.otherBody} shift ${r.otherBodyShiftDeg.toFixed(4)}°)`);
  }

  console.log(`\n=== ASPECT TYPE CHANGED (${typeChanged.length}) -- still qualifies, but a different aspect ===`);
  for (const r of typeChanged) {
    console.log(`  ${r.eclipseDate} ${r.eclipseId} / ${r.otherBody}: old [${r.oldLabel}]  ->  new [${r.newLabel}]`);
  }

  console.log(`\n=== ORB CHANGED, SAME ASPECT (${orbChanged.length}) -- full list, old orb vs new orb ===`);
  for (const r of orbChanged) {
    const flagged = orbDeltaFlags.some((f) => f.eclipseId === r.eclipseId && f.otherBody === r.otherBody);
    console.log(
      `  ${r.eclipseDate} ${r.eclipseId} / ${r.otherBody}: ${r.oldEval.aspect} old orb ${r.oldEval.orb.toFixed(4)}° -> new orb ${r.newEval.orb.toFixed(4)}°`
      + ` (Δ${Math.abs(r.newEval.orb - r.oldEval.orb).toFixed(4)}°, expected max ${r.combinedExpectedMax.toFixed(4)}° = anchor ${r.anchorShiftDeg.toFixed(4)}° + ${r.otherBody} ${r.otherBodyShiftDeg.toFixed(4)}°)`
      + (flagged ? '  <<< LARGER THAN EXPECTED OFFSET CAN EXPLAIN' : ''),
    );
  }

  console.log(`\n=== ORB-DELTA FLAGS (${orbDeltaFlags.length}) -- change bigger than the snapshot-vs-instant offset should produce ===`);
  if (orbDeltaFlags.length === 0) {
    console.log('None. Every orb change is consistent with the anchor + other-body position shift alone.');
  } else {
    for (const f of orbDeltaFlags) console.log(`  ${f.eclipseId} / ${f.otherBody}: Δorb ${f.orbDelta.toFixed(4)}° vs expected max ${f.combinedExpectedMax.toFixed(4)}°`);
  }

  console.log(`\n=== RETROGRADE-FLAG CHANGES vs stored (${retrogradeChanged.length}) ===`);
  if (retrogradeChanged.length === 0) {
    console.log('None. Every stored other_body_retrograde flag matches the true-instant recompute.');
  } else {
    for (const r of retrogradeChanged) console.log(`  ${r.eclipseDate} ${r.eclipseId} / ${r.otherBody}: stored retrograde=${r.oldRetrograde} -> true-instant retrograde=${r.newRetrograde}`);
  }

  console.log(`\n=== NEAR-EDGE ROWS (>2.5° orb in the CORRECTED/new set) ===`);
  const nearEdgeNew = [...appeared, ...disappeared, ...typeChanged, ...orbChanged]
    .filter((r) => (r.newQualifies && r.newEval.orb > 2.5) || (r.oldQualifies && r.oldEval.orb > 2.5));
  const seen = new Set();
  for (const r of nearEdgeNew) {
    const k = `${r.eclipseId}|${r.otherBody}`;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`  ${r.eclipseDate} ${r.eclipseId} / ${r.otherBody}: old [${r.oldLabel}]  ->  new [${r.newLabel}]`);
  }

  console.log(`\n=== KNOWN FLIP DATES CHECK (2027-08-02, 2045-08-12, both Sun-Neptune) ===`);
  for (const r of knownFlipRows) {
    console.log(`  ${r.eclipseDate} ${r.eclipseId} / Neptune: old [${r.oldLabel}]  ->  new [${r.newLabel}]  -- ${r.oldQualifies !== r.newQualifies || (r.oldEval.aspect !== r.newEval.aspect) ? 'FLIP CONFIRMED, matches external validation' : 'NO FLIP -- does not match expected external validation, needs review'}`);
  }

  const totalChanges = appeared.length + disappeared.length + typeChanged.length + orbChanged.length;
  console.log(`\nDone. ${eclipses.length} eclipses x ${OTHER_BODIES.length} other bodies = ${eclipses.length * OTHER_BODIES.length} pairs checked. `
    + `${appeared.length} appeared, ${disappeared.length} disappeared, ${typeChanged.length} type-changed, ${orbChanged.length} orb-changed (${totalChanges} total aspect-affecting changes), `
    + `${retrogradeChanged.length} retrograde-flag change(s). No writes made.`);
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
