// STEP 3 (docs/SPEC.md §11A.10): independent validation of the true-instant
// recompute. Generation engine (Step 2) was astronomy-engine; this script
// cross-checks every one of the 104 eclipses x 10 tracked bodies against
// sweph (Swiss Ephemeris, Moshier analytic mode -- SEFLG_MOSEPH, no
// external data files, fully offline) -- a different, independently
// written and maintained codebase from a different theoretical lineage.
// READ-ONLY against Supabase (only to get each eclipse's currently-stored
// exact_date/event, to know which dates/kinds to validate); no writes
// anywhere. No API calls.
//
// Validates the FULL dataset (all 104 eclipses x 10 bodies = 1040 position
// pairs), not a sample, so the reported max discrepancy is the true global
// max, and every required named case (both known flip dates, the
// 2039-06-21 sign-corrected eclipse, every >2.5 degree orb row, at least
// two of each eclipse kind, one example of each aspect type) is covered as
// a subset by construction.
//
// DISAGREEMENT THRESHOLD: flagged if two engines differ by more than 0.05
// degrees (3 arcminutes) on any single body position -- arcminute-level
// agreement is the bar the task sets, and this is comfortably looser than
// two independent ephemerides normally differ (arcseconds for Sun/Moon,
// low arcseconds to a couple of arcminutes for the outer planets over a
// multi-decade span), so a flag here is a real "STOP" signal, not noise.
//
// Usage: node --env-file=.env.local scripts/validate-eclipse-instants-sweph.mjs

import { createClient } from '@supabase/supabase-js';
import sweph from 'sweph';
import { recomputeEclipse, toJulianDayUT, longitudeToSignDegree } from './lib/eclipse-true-instant.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const DISAGREEMENT_THRESHOLD_DEG = 0.05; // 3 arcminutes

const BODY_TO_SWE_ID = {
  Sun: sweph.constants.SE_SUN,
  Moon: sweph.constants.SE_MOON,
  Mercury: sweph.constants.SE_MERCURY,
  Venus: sweph.constants.SE_VENUS,
  Mars: sweph.constants.SE_MARS,
  Jupiter: sweph.constants.SE_JUPITER,
  Saturn: sweph.constants.SE_SATURN,
  Uranus: sweph.constants.SE_URANUS,
  Neptune: sweph.constants.SE_NEPTUNE,
  Pluto: sweph.constants.SE_PLUTO,
};

const SWE_FLAGS = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED;

function swephLongitude(bodyName, jdUt) {
  const result = sweph.calc_ut(jdUt, BODY_TO_SWE_ID[bodyName], SWE_FLAGS);
  if (result.error) throw new Error(`sweph error for ${bodyName} at JD ${jdUt}: ${result.error}`);
  const [lon, , , speedLon] = result.data;
  return { longitude: lon, retrograde: speedLon < 0 };
}

function angularSeparation(lon1, lon2) {
  const diff = Math.abs(lon1 - lon2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

async function fetchEclipseRows() {
  const { data, error } = await supabase
    .from('aspect_calendar')
    .select('id, event, exact_date')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse'])
    .order('exact_date', { ascending: true });
  if (error) throw new Error(`Read failed: ${error.message}`);
  return data;
}

async function main() {
  const eclipses = await fetchEclipseRows();
  console.log(`Validating ${eclipses.length} eclipses x 10 bodies = ${eclipses.length * 10} position pairs against sweph (Moshier mode). Read-only, no writes.\n`);

  const allResults = [];
  let maxDiscrepancy = 0;
  let maxDiscrepancyRow = null;
  const perBodyMax = {};
  const disagreements = [];
  const retrogradeMismatches = [];

  for (const eclipse of eclipses) {
    const isLunar = eclipse.event === 'Lunar Eclipse';
    const kind = isLunar ? 'lunar' : 'solar';
    const { time, positions } = recomputeEclipse(eclipse.exact_date, kind);
    const jdUt = toJulianDayUT(time);

    for (const [body, aePos] of Object.entries(positions)) {
      const swePos = swephLongitude(body, jdUt);
      const discrepancy = angularSeparation(aePos.longitude, swePos.longitude);
      allResults.push({ eclipseId: eclipse.id, eclipseDate: eclipse.exact_date, body, aeLon: aePos.longitude, sweLon: swePos.longitude, discrepancy });

      if (discrepancy > maxDiscrepancy) { maxDiscrepancy = discrepancy; maxDiscrepancyRow = { eclipseId: eclipse.id, body, discrepancy }; }
      if (!perBodyMax[body] || discrepancy > perBodyMax[body]) perBodyMax[body] = discrepancy;
      if (discrepancy > DISAGREEMENT_THRESHOLD_DEG) disagreements.push({ eclipseId: eclipse.id, eclipseDate: eclipse.exact_date, body, discrepancy, aeLon: aePos.longitude, sweLon: swePos.longitude });

      if (body !== 'Sun' && body !== 'Moon' && aePos.retrograde !== swePos.retrograde) {
        retrogradeMismatches.push({ eclipseId: eclipse.id, body, aeRetrograde: aePos.retrograde, sweRetrograde: swePos.retrograde });
      }
    }
  }

  console.log('=== MAX DISCREPANCY, FULL DATASET (104 eclipses x 10 bodies) ===');
  console.log(`Global max: ${(maxDiscrepancy * 3600).toFixed(2)} arcsec (${maxDiscrepancy.toFixed(6)}°) -- ${maxDiscrepancyRow.eclipseId} / ${maxDiscrepancyRow.body}`);
  console.log('\nPer-body max discrepancy:');
  for (const [body, max] of Object.entries(perBodyMax)) {
    console.log(`  ${body.padEnd(8)} ${(max * 3600).toFixed(2)} arcsec (${max.toFixed(6)}°)`);
  }

  console.log(`\n=== DISAGREEMENTS > ${DISAGREEMENT_THRESHOLD_DEG}° (3 arcmin) ===`);
  if (disagreements.length === 0) {
    console.log('None. Both engines agree well within arcminute level across the entire dataset.');
  } else {
    console.log(`${disagreements.length} disagreement(s) -- STOP, needs review:`);
    for (const d of disagreements) console.log(`  ${d.eclipseDate} ${d.eclipseId} / ${d.body}: astronomy-engine ${d.aeLon.toFixed(6)}°, sweph ${d.sweLon.toFixed(6)}°, diff ${d.discrepancy.toFixed(6)}°`);
  }

  console.log('\n=== RETROGRADE-FLAG CROSS-CHECK (8 non-luminary bodies) ===');
  if (retrogradeMismatches.length === 0) {
    console.log('Clean. Both engines agree on motion direction for every body at every eclipse instant.');
  } else {
    console.log(`${retrogradeMismatches.length} mismatch(es):`);
    for (const m of retrogradeMismatches) console.log(`  ${m.eclipseId} / ${m.body}: astronomy-engine=${m.aeRetrograde}, sweph=${m.sweRetrograde}`);
  }

  // ── Named required cases, called out explicitly ──────────────────────
  console.log('\n=== NAMED REQUIRED CASES ===');

  const lunarEclipses = eclipses.filter((e) => e.event === 'Lunar Eclipse');
  const solarEclipses = eclipses.filter((e) => e.event === 'Solar Eclipse');
  console.log(`Lunar eclipses validated: ${lunarEclipses.length} (all of them; task text said "both lunar eclipses" which doesn't match the 53 in range -- validating the full set covers any reading of that requirement).`);
  console.log(`Solar eclipses validated: ${solarEclipses.length} (>= 2 required).`);

  const flipDates = ['solar-eclipse-2027-08-02', 'solar-eclipse-2045-08-12'];
  console.log('\nKnown flip dates (Sun-Neptune, per SPEC §11A.10):');
  for (const id of flipDates) {
    const row = allResults.find((r) => r.eclipseId === id && r.body === 'Neptune');
    console.log(`  ${id} / Neptune: astronomy-engine ${row.aeLon.toFixed(6)}°, sweph ${row.sweLon.toFixed(6)}°, diff ${(row.discrepancy * 3600).toFixed(2)} arcsec`);
  }

  const signCorrected = '2039-06-21';
  const scRow = eclipses.find((e) => e.exact_date === signCorrected);
  const scPositions = allResults.filter((r) => r.eclipseId === scRow.id);
  console.log(`\nSign-corrected eclipse (${signCorrected}, ${scRow.id}) -- all 10 bodies:`);
  for (const r of scPositions) console.log(`  ${r.body.padEnd(8)} astronomy-engine ${r.aeLon.toFixed(6)}°, sweph ${r.sweLon.toFixed(6)}°, diff ${(r.discrepancy * 3600).toFixed(2)} arcsec`);

  console.log(`\nDone. ${allResults.length} position pairs validated. No writes made.`);
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
