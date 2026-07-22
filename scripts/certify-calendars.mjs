// Standing certification script for the deterministic sky-math layer.
// Read-only: makes no writes to any table and no AI/API calls. Prints a
// plain-language pass/fail report covering all four tables (sky_positions,
// transit_calendar, aspect_calendar, transit_pieces), the ratified passage
// model (docs/SPEC.md 11A.2), the two standing structural guards
// (sign-consonance, passage-consonance) re-run over a live recompute rather
// than trusted from stored rows, and a full re-assembly of the three
// current Call 1 briefs (Saturn, Mercury, Nodes).
//
// SUPERSESSION NOTE: this script replaces scripts/validate-calendars.mjs
// (deleted in the same commit that added this file). That script predated
// the passage-fragmentation fix (docs/SPEC.md 11A.2, July 20, 2026) and the
// aspect_calendar passage-scoped pass-numbering ruling (11A.3, July 19,
// 2026); it still checked transit_calendar's sign_egress_date against the
// OLD per-leg definition and checked aspect_calendar's pass_n/pass_m as if
// they were scoped to a single window, not a whole aspect passage -- both
// would report the CURRENT, CORRECT data as wrong. Every check the old
// script performed is re-expressed here against the ratified definitions;
// nothing it verified is lost.
//
// IMPORTANT -- THIS SCRIPT MUST NEVER BECOME THE NEXT STALE TRIPWIRE: every
// expected number below (the EXPECTED block: total row counts, the
// 1,189/1,121/68/429 transit_calendar split, the 4,607/104 aspect_calendar
// split, the 103,356/8,613/12 sky_positions figures, the 2023-01-01 to
// 2046-07-31 date range) is specific to the data as it stands today. Anyone
// who extends sky_positions or re-runs a generation script MUST update
// these expected values in that same step -- otherwise this script starts
// reporting correct, larger data as a mismatch, exactly the failure mode it
// was built to retire.
//
// Usage: node --env-file=.env.local scripts/certify-calendars.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { assembleBrief } from './engine/assemble-brief.mjs';
import { checkConformance } from './template-conformance.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PAGE_SIZE = 1000;

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const SIGN_DIST_TO_ASPECT = { 0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition' };
const SPEED_ORDER = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const ALL_SKY_BODIES = [...SPEED_ORDER.slice(0, 1), 'Moon', ...SPEED_ORDER.slice(1), 'North Node', 'South Node'];
const FAST = new Set(['Sun', 'Mercury', 'Venus']);

// See the header note above: every figure here is tied to the current data
// range (2023-01-01 -> 2046-07-31) and the July 2026 regeneration. Update
// alongside any future range extension or regeneration.
const EXPECTED = {
  SKY_POSITIONS_TOTAL: 103356,
  SKY_POSITIONS_PER_BODY: 8613,
  SKY_POSITIONS_BODIES: 12,
  TRANSIT_CALENDAR_TOTAL: 1618,
  TRANSIT_INGRESS_TYPE_PRE_FIX: 1189, // Phase 0's independent count, taken before re_ingress existed as a category
  TRANSIT_INGRESS_PLAIN: 1121,
  TRANSIT_RE_INGRESS: 68,
  TRANSIT_STATION_TYPE: 429,
  ASPECT_CALENDAR_ASPECT_ROWS: 4607,
  ASPECT_CALENDAR_ECLIPSE_ROWS: 104,
};

// ── report bookkeeping ─────────────────────────────────────────────────

const results = [];
function record(section, name, pass, detail) {
  results.push({ section, name, pass, detail });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ` -- ${detail}` : ''}`);
}

// ── fetch helpers ──────────────────────────────────────────────────────

async function fetchAll(table, select) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Read failed for ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function fetchSkyPositions(body, select) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('sky_positions')
      .select(select)
      .eq('body', body)
      .order('date', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Read failed for sky_positions/${body}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

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

// Mirrors generate-aspect-calendar.mjs's bodySignConstantAcrossGap, written
// fresh here (not imported) so this certification re-derives the passage
// grouping independently rather than trusting the generation script's own
// logic to check itself.
function bodySignConstantAcrossGap(series, dateA, dateB) {
  let sign = null;
  for (const r of series) {
    if (r.date < dateA || r.date > dateB) continue;
    if (sign === null) sign = r.sign;
    else if (r.sign !== sign) return false;
  }
  return true;
}

// ── 1. sky_positions ────────────────────────────────────────────────────

async function certifySkyPositions() {
  console.log('\n=== SKY_POSITIONS ===');
  const { count, error } = await supabase.from('sky_positions').select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  record(
    'sky_positions', 'Total row count', count === EXPECTED.SKY_POSITIONS_TOTAL,
    `${count} rows (expected ${EXPECTED.SKY_POSITIONS_TOTAL} = ${EXPECTED.SKY_POSITIONS_PER_BODY} days x ${EXPECTED.SKY_POSITIONS_BODIES} bodies)`,
  );

  let gapErrors = 0;
  let countErrors = 0;
  let signErrors = 0;
  let rowsChecked = 0;
  for (const body of ALL_SKY_BODIES) {
    const rows = await fetchSkyPositions(body, 'date, sign, sign_degree, longitude');
    if (rows.length !== EXPECTED.SKY_POSITIONS_PER_BODY) {
      countErrors++;
      console.log(`    ${body}: ${rows.length} rows, expected ${EXPECTED.SKY_POSITIONS_PER_BODY}`);
    }
    for (let i = 1; i < rows.length; i++) {
      const diffDays = Math.round((new Date(rows[i].date) - new Date(rows[i - 1].date)) / 86400000);
      if (diffDays !== 1) {
        gapErrors++;
        console.log(`    ${body}: gap between ${rows[i - 1].date} and ${rows[i].date} (${diffDays} days apart)`);
      }
    }
    for (const r of rows) {
      rowsChecked++;
      const expectedSign = SIGNS[Math.floor(r.longitude / 30) % 12];
      const expectedDegree = r.longitude % 30;
      if (r.sign !== expectedSign || Math.abs(r.sign_degree - expectedDegree) > 0.001) {
        signErrors++;
        console.log(`    ${body} ${r.date}: stored sign/degree ${r.sign}/${r.sign_degree}, longitude ${r.longitude} implies ${expectedSign}/${expectedDegree.toFixed(4)}`);
      }
    }
  }
  record('sky_positions', 'Per-body row counts (all 12 bodies)', countErrors === 0, countErrors === 0 ? `all match ${EXPECTED.SKY_POSITIONS_PER_BODY}` : `${countErrors} body/bodies mismatched`);
  record('sky_positions', 'Date-sequence has no gaps (all 12 bodies)', gapErrors === 0, gapErrors === 0 ? 'no gaps' : `${gapErrors} gap(s)`);
  record('sky_positions', 'Sign/longitude self-consistency (every row)', signErrors === 0, `${rowsChecked} rows checked, ${signErrors} mismatch(es)`);
}

// ── 2. transit_calendar ─────────────────────────────────────────────────

function namedSpotChecks(byPassage) {
  console.log('\n  -- Named spot-checks (known dip cases) --');

  const plutoAquarius = Object.entries(byPassage).find(([id]) => id.startsWith('pluto-aquarius-') && !id.endsWith('-pre-range'));
  if (plutoAquarius) {
    const [id, members] = plutoAquarius;
    const entryRows = members.filter((m) => ['ingress', 'retro_ingress', 're_ingress'].includes(m.event_type));
    const numbers = entryRows.map((r) => r.entry_number).sort((a, b) => a - b);
    const numbersOk = JSON.stringify(numbers) === JSON.stringify([1, 2, 3, 4]);
    const countsOk = entryRows.every((r) => r.entry_count === 4);
    record(
      'transit_calendar', "Pluto's Aquarius passage has exactly 4 entries, numbered 1-4", entryRows.length === 4 && numbersOk && countsOk,
      `passage_id=${id}, ${entryRows.length} entry row(s), entry_number set=${JSON.stringify(numbers)}`,
    );
  } else {
    record('transit_calendar', "Pluto's Aquarius passage found", false, 'no non-pre-range pluto-aquarius-* passage_id in the table');
  }

  const saturnAries = Object.entries(byPassage).find(([id]) => id.startsWith('saturn-aries-'));
  const saturnPisces = Object.entries(byPassage).find(([id]) => id.startsWith('saturn-pisces-') && !id.endsWith('-pre-range'));
  if (saturnAries && saturnPisces) {
    const a = { start: saturnAries[1][0].passage_first_ingress_date, end: saturnAries[1][0].sign_egress_date };
    const p = { start: saturnPisces[1][0].passage_first_ingress_date, end: saturnPisces[1][0].sign_egress_date };
    const overlap = a.start <= p.end && p.start <= a.end;
    record(
      'transit_calendar', "Saturn's Aries and Pisces passages interleave (date ranges genuinely overlap)", overlap,
      `Aries ${a.start} -> ${a.end}; Pisces ${p.start} -> ${p.end}`,
    );
  } else {
    record('transit_calendar', 'Saturn Aries/Pisces passages both found', false, 'one or both passage_ids missing');
  }

  const plutoCapPreRange = byPassage['pluto-capricorn-pre-range'];
  if (plutoCapPreRange) {
    const allNull = plutoCapPreRange.every((r) => r.passage_first_ingress_date === null && r.entry_number === null && r.entry_count === null);
    record(
      'transit_calendar', "Pluto's Capricorn pre-range passage: NULL passage_first_ingress_date/entry_number/entry_count throughout", allNull,
      `${plutoCapPreRange.length} row(s) checked`,
    );
  } else {
    record('transit_calendar', 'pluto-capricorn-pre-range passage found', false, 'no rows with this passage_id');
  }
}

async function certifyTransitCalendar() {
  console.log('\n=== TRANSIT_CALENDAR ===');
  const rows = await fetchAll(
    'transit_calendar',
    'id, body, event_type, date, phase_end_date, sign_egress_date, passage_id, passage_first_ingress_date, entry_number, entry_count',
  );
  record('transit_calendar', 'Total row count', rows.length === EXPECTED.TRANSIT_CALENDAR_TOTAL, `${rows.length} rows (expected ${EXPECTED.TRANSIT_CALENDAR_TOTAL})`);

  const ingressPlain = rows.filter((r) => r.event_type === 'ingress' || r.event_type === 'retro_ingress').length;
  const reIngress = rows.filter((r) => r.event_type === 're_ingress').length;
  const station = rows.filter((r) => r.event_type === 'station_retrograde' || r.event_type === 'station_direct').length;
  console.log(
    `  Row-count derivation: Phase 0's original independent count (taken before re_ingress existed as a category) found `
    + `${EXPECTED.TRANSIT_INGRESS_TYPE_PRE_FIX} ingress-type rows + ${EXPECTED.TRANSIT_STATION_TYPE} station-type rows = ${EXPECTED.TRANSIT_INGRESS_TYPE_PRE_FIX + EXPECTED.TRANSIT_STATION_TYPE} total. `
    + `The passage-fragmentation fix only RETYPED some plain ingresses to re-ingress -- it added and removed no rows -- so that `
    + `same ${EXPECTED.TRANSIT_INGRESS_TYPE_PRE_FIX} splits today into ${EXPECTED.TRANSIT_INGRESS_PLAIN} still-plain ingress/retro-ingress + ${EXPECTED.TRANSIT_RE_INGRESS} retyped re-ingress.`,
  );
  record('transit_calendar', 'Ingress/retro-ingress row count', ingressPlain === EXPECTED.TRANSIT_INGRESS_PLAIN, `${ingressPlain} rows (expected ${EXPECTED.TRANSIT_INGRESS_PLAIN})`);
  record('transit_calendar', 'Re-ingress row count', reIngress === EXPECTED.TRANSIT_RE_INGRESS, `${reIngress} rows (expected ${EXPECTED.TRANSIT_RE_INGRESS})`);
  record(
    'transit_calendar', 'Ingress-type total still matches the Phase 0 pre-fix count', (ingressPlain + reIngress) === EXPECTED.TRANSIT_INGRESS_TYPE_PRE_FIX,
    `${ingressPlain} + ${reIngress} = ${ingressPlain + reIngress} (expected ${EXPECTED.TRANSIT_INGRESS_TYPE_PRE_FIX})`,
  );
  record('transit_calendar', 'Station-type row count', station === EXPECTED.TRANSIT_STATION_TYPE, `${station} rows (expected ${EXPECTED.TRANSIT_STATION_TYPE})`);

  const byBody = {};
  for (const r of rows) (byBody[r.body] ??= []).push(r);
  let phaseEndErrors = 0;
  for (const [body, bodyRows] of Object.entries(byBody)) {
    bodyRows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (let i = 0; i < bodyRows.length; i++) {
      const expected = bodyRows[i + 1]?.date ?? null;
      if (bodyRows[i].phase_end_date !== expected) {
        phaseEndErrors++;
        console.log(`    phase_end_date mismatch: ${body} ${bodyRows[i].id} has ${bodyRows[i].phase_end_date}, expected ${expected}`);
      }
    }
  }
  record('transit_calendar', 'phase_end_date chain integrity (every body, no gaps)', phaseEndErrors === 0, phaseEndErrors === 0 ? 'all correct' : `${phaseEndErrors} error(s)`);

  // Passage integrity -- re-expresses (and replaces) the retired script's
  // stale sign_egress_date check against the ratified whole-passage
  // definition (docs/SPEC.md 11A.2).
  const byPassage = {};
  for (const r of rows) (byPassage[r.passage_id] ??= []).push(r);
  let boundsErrors = 0;
  let entryErrors = 0;
  let preRangeErrors = 0;
  let stationNullErrors = 0;
  for (const [passageId, members] of Object.entries(byPassage)) {
    const ingressDates = new Set(members.map((m) => m.passage_first_ingress_date));
    const egressDates = new Set(members.map((m) => m.sign_egress_date));
    if (ingressDates.size !== 1) { boundsErrors++; console.log(`    passage ${passageId}: passage_first_ingress_date differs across member rows: ${[...ingressDates]}`); }
    if (egressDates.size !== 1) { boundsErrors++; console.log(`    passage ${passageId}: sign_egress_date differs across member rows: ${[...egressDates]}`); }

    const stationRows = members.filter((m) => m.event_type === 'station_retrograde' || m.event_type === 'station_direct');
    for (const s of stationRows) {
      if (s.entry_number !== null || s.entry_count !== null) { stationNullErrors++; console.log(`    ${s.id}: station row has non-NULL entry_number/entry_count`); }
    }

    const isPreRange = passageId.endsWith('-pre-range');
    if (isPreRange) {
      for (const m of members) {
        if (m.passage_first_ingress_date !== null || m.entry_number !== null || m.entry_count !== null) {
          preRangeErrors++;
          console.log(`    ${m.id}: pre-range passage ${passageId} has a non-NULL passage_first_ingress_date/entry_number/entry_count`);
        }
      }
    } else {
      const entryRows = members.filter((m) => ['ingress', 'retro_ingress', 're_ingress'].includes(m.event_type))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      const expectedCount = entryRows.length;
      entryRows.forEach((r, i) => {
        if (r.entry_number !== i + 1 || r.entry_count !== expectedCount) {
          entryErrors++;
          console.log(`    ${r.id}: entry_number/entry_count = ${r.entry_number}/${r.entry_count}, expected ${i + 1}/${expectedCount}`);
        }
      });
    }
  }
  record('transit_calendar', 'Passage bounds identical across every passage_id (passage_first_ingress_date, sign_egress_date)', boundsErrors === 0, boundsErrors === 0 ? `all correct across ${Object.keys(byPassage).length} passages` : `${boundsErrors} error(s)`);
  record('transit_calendar', 'entry_number/entry_count sequencing (non-pre-range passages)', entryErrors === 0, entryErrors === 0 ? 'all correct' : `${entryErrors} error(s)`);
  record('transit_calendar', 'Pre-range passages: NULL passage_first_ingress_date/entry_number/entry_count on every row', preRangeErrors === 0, preRangeErrors === 0 ? 'all correct' : `${preRangeErrors} error(s)`);
  record('transit_calendar', 'Station rows: entry_number/entry_count NULL', stationNullErrors === 0, stationNullErrors === 0 ? 'all correct' : `${stationNullErrors} error(s)`);

  namedSpotChecks(byPassage);

  const dates = rows.map((r) => r.date).sort();
  console.log(`\n  Coverage: earliest row ${dates[0]}, latest row ${dates[dates.length - 1]}`);
}

// ── 3. aspect_calendar ──────────────────────────────────────────────────

function certifyAspectPassageScoping(aspectRows, seriesByBody) {
  console.log('\n  -- Passage-scoped pass numbering (independent re-derivation from sky_positions) --');
  // Re-expresses (and replaces) the retired script's window-scoped
  // pass-numbering check, which predates the July 19, 2026 ruling that
  // pass_n/pass_m are scoped to the whole ASPECT PASSAGE, not one window
  // (docs/SPEC.md 11A.3). This reconstructs passages fresh from raw sign
  // data rather than trusting generate-aspect-calendar.mjs's own logic to
  // check itself.
  const byPair = new Map();
  for (const r of aspectRows) {
    const key = `${r.body_1}|${r.body_2}|${r.event}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(r);
  }

  let passErrors = 0;
  let passageCount = 0;
  for (const [key, groupRows] of byPair) {
    const [body1, body2] = key.split('|');
    const byWindow = new Map();
    for (const r of groupRows) {
      const wk = `${r.window_start}|${r.window_end}`;
      if (!byWindow.has(wk)) byWindow.set(wk, []);
      byWindow.get(wk).push(r);
    }
    const windowKeys = [...byWindow.keys()].sort((a, b) => (a < b ? -1 : 1));
    const passageGroups = [[windowKeys[0]]];
    for (let i = 1; i < windowKeys.length; i++) {
      const prevEnd = byWindow.get(windowKeys[i - 1])[0].window_end;
      const curStart = byWindow.get(windowKeys[i])[0].window_start;
      const unbroken = bodySignConstantAcrossGap(seriesByBody[body1], prevEnd, curStart)
        && bodySignConstantAcrossGap(seriesByBody[body2], prevEnd, curStart);
      if (unbroken) passageGroups[passageGroups.length - 1].push(windowKeys[i]);
      else passageGroups.push([windowKeys[i]]);
    }
    for (const group of passageGroups) {
      passageCount++;
      const exactRows = group.flatMap((wk) => byWindow.get(wk)).filter((r) => r.exact_date).sort((a, b) => (a.exact_date < b.exact_date ? -1 : 1));
      const expectedM = exactRows.length;
      exactRows.forEach((r, i) => {
        if (r.pass_n !== i + 1 || r.pass_m !== expectedM) {
          passErrors++;
          console.log(`    ${r.id}: stored pass_n/pass_m = ${r.pass_n}/${r.pass_m}, independently recomputed = ${i + 1}/${expectedM}`);
        }
      });
    }
  }
  record(
    'aspect_calendar', 'Passage-scoped pass_n/pass_m match an independent recompute', passErrors === 0,
    passErrors === 0 ? `all correct across ${passageCount} aspect passages (${byPair.size} body-pair/aspect groups)` : `${passErrors} error(s)`,
  );
}

async function certifyAspectCalendar() {
  console.log('\n=== ASPECT_CALENDAR ===');
  const rows = await fetchAll(
    'aspect_calendar',
    'id, event, body_1, body_2, body_1_sign, body_2_sign, window_start, window_end, exact_date, pass_n, pass_m, body_1_retrograde, body_2_retrograde',
  );
  const eclipseRows = rows.filter((r) => r.event === 'Solar Eclipse' || r.event === 'Lunar Eclipse');
  const aspectRows = rows.filter((r) => r.event !== 'Solar Eclipse' && r.event !== 'Lunar Eclipse');
  record(
    'aspect_calendar', 'Total row count (aspect rows + eclipse rows)',
    aspectRows.length === EXPECTED.ASPECT_CALENDAR_ASPECT_ROWS && eclipseRows.length === EXPECTED.ASPECT_CALENDAR_ECLIPSE_ROWS,
    `${aspectRows.length} aspect rows (expected ${EXPECTED.ASPECT_CALENDAR_ASPECT_ROWS}), ${eclipseRows.length} eclipse rows (expected ${EXPECTED.ASPECT_CALENDAR_ECLIPSE_ROWS})`,
  );

  const outOfWindow = aspectRows.filter((r) => r.exact_date && (r.exact_date < r.window_start || r.exact_date > r.window_end));
  record('aspect_calendar', 'exact_date falls within its own window', outOfWindow.length === 0, `${outOfWindow.length} violation(s)`);

  const byWindow = {};
  for (const r of aspectRows) {
    const key = `${r.body_1}|${r.body_2}|${r.event}|${r.window_start}|${r.window_end}`;
    (byWindow[key] ??= []).push(r);
  }
  let mixedErrors = 0;
  for (const [key, group] of Object.entries(byWindow)) {
    const hasExact = group.some((r) => r.exact_date !== null);
    const hasNoExact = group.some((r) => r.exact_date === null);
    if (hasExact && hasNoExact) { mixedErrors++; console.log(`    window ${key} mixes exact and no-exact rows`); }
  }
  record('aspect_calendar', 'No window mixes exact and no-exact rows', mixedErrors === 0, `${mixedErrors} violation(s), ${Object.keys(byWindow).length} distinct windows`);

  const consonanceErrors = aspectRows.filter((r) => SIGN_DIST_TO_ASPECT[signDistance(r.body_1_sign, r.body_2_sign)] !== r.event);
  record('aspect_calendar', 'Sign-consonance (stored event matches sign distance)', consonanceErrors.length === 0, `${consonanceErrors.length} violation(s)`);
  if (consonanceErrors.length > 0) {
    for (const r of consonanceErrors.slice(0, 10)) console.log(`    ${r.id}: ${r.body_1_sign}/${r.body_2_sign} does not match ${r.event}`);
  }

  const seriesByBody = {};
  const byDateByBody = {};
  for (const body of SPEED_ORDER) {
    seriesByBody[body] = await fetchSkyPositions(body, 'date, sign, longitude, retrograde');
    byDateByBody[body] = new Map(seriesByBody[body].map((s) => [s.date, s]));
  }

  certifyAspectPassageScoping(aspectRows, seriesByBody);

  const exactRows = aspectRows.filter((r) => r.exact_date !== null);
  let motionMismatches = 0;
  for (const r of exactRows) {
    const b1 = byDateByBody[r.body_1].get(r.exact_date);
    const b2 = byDateByBody[r.body_2].get(r.exact_date);
    if (!b1 || !b2) continue;
    if (b1.retrograde !== r.body_1_retrograde || b2.retrograde !== r.body_2_retrograde) {
      motionMismatches++;
      console.log(`    motion mismatch: ${r.id} stored (${r.body_1_retrograde},${r.body_2_retrograde}) vs sky_positions (${b1.retrograde},${b2.retrograde})`);
    }
  }
  record('aspect_calendar', 'Motion-state cross-check against sky_positions', motionMismatches === 0, `${motionMismatches} mismatch(es) across ${exactRows.length} exact rows`);

  let worstOverall = 0;
  let worstPair = '';
  let worstFast = 0;
  let worstFastPair = '';
  for (let i = 0; i < SPEED_ORDER.length; i++) {
    for (let j = i + 1; j < SPEED_ORDER.length; j++) {
      const b1 = SPEED_ORDER[i];
      const b2 = SPEED_ORDER[j];
      const s1 = seriesByBody[b1];
      const s2 = seriesByBody[b2];
      let maxDelta = 0;
      let prevSep = angularSeparation(s1[0].longitude, s2[0].longitude);
      for (let k = 1; k < s1.length; k++) {
        const sep = angularSeparation(s1[k].longitude, s2[k].longitude);
        maxDelta = Math.max(maxDelta, Math.abs(sep - prevSep));
        prevSep = sep;
      }
      if (maxDelta > worstOverall) { worstOverall = maxDelta; worstPair = `${b1}-${b2}`; }
      if ((FAST.has(b1) || FAST.has(b2)) && maxDelta > worstFast) { worstFast = maxDelta; worstFastPair = `${b1}-${b2}`; }
    }
  }
  record(
    'aspect_calendar', 'Daily resolution cannot skip a whole window (max day-over-day separation change under 6 deg, all 36 pairs)',
    worstOverall < 6,
    `worst pair overall: ${worstPair} at ${worstOverall.toFixed(3)} deg/day; worst fast-mover pair: ${worstFastPair} at ${worstFast.toFixed(3)} deg/day`,
  );

  const dates = [...aspectRows.map((r) => r.exact_date).filter(Boolean), ...aspectRows.map((r) => r.window_start)].sort();
  console.log(`\n  Coverage: earliest relevant date ${dates[0]}, latest ${dates[dates.length - 1]}`);
}

// ── 4. transit_pieces ────────────────────────────────────────────────────

async function certifyTransitPieces() {
  console.log('\n=== TRANSIT_PIECES ===');
  const { count, error } = await supabase.from('transit_pieces').select('*', { count: 'exact', head: true });
  record('transit_pieces', 'Table exists and is readable', !error, error ? error.message : `${count} row(s) currently stored`);
  console.log(`  Status: ${count} row(s) -- expected 0 at this build stage (no content generation has run yet). This is a status fact, not a failure.`);
}

// ── 5. structural guards + brief re-assembly (live recompute) ──────────

async function certifyStructuralGuardsAndBriefs() {
  console.log('\n=== STRUCTURAL GUARDS + BRIEF ASSEMBLY (live recompute) ===');
  console.log(
    '  Re-running assembleBrief() for Saturn, Mercury, and Nodes: a full, live recompute from sky_positions through the '
    + 'contact engine -- not a read of any cached result. Both standing structural guards (assertSignConsonant, '
    + 'assertPassageConsonant, in scripts/engine/contact-engine.mjs) hard-throw on any violation as part of this same call '
    + 'path, so a clean pass below proves both guards hold against a fresh recompute, not only against whatever the '
    + 'database already contains.',
  );
  for (const body of ['Saturn', 'Mercury', 'Nodes']) {
    try {
      const { text, counts } = await assembleBrief(body);
      const nonEmpty = typeof text === 'string' && text.trim().length > 0;
      const eclipseComponent = body === 'Nodes' ? `, ${counts.eclipseEntryCount} ECLIPSE` : '';
      record(
        'structural guards + brief assembly', `${body}: recompute, both guards, and assembly all succeeded`, nonEmpty,
        `${counts.totalEntries} entries (${counts.natalCount} NATAL_CONTACT, ${counts.skyCount} SKY_CONTACT${eclipseComponent}); `
        + `${counts.activationCount} activation fact(s); ${counts.eclipseFactCount} eclipse-to-transit fact(s)`,
      );
    } catch (err) {
      record('structural guards + brief assembly', `${body}: recompute, both guards, and assembly all succeeded`, false, err.message);
    }
  }
}

// Reconstructs the exact text scripts/engine/assemble-brief.mjs's own CLI
// (main()) prints, including the trailing [counts] line -- assembleBrief()
// itself returns text/counts separately (a library-function contract), but
// what actually ships to scripts/output/briefs-review.txt and what the
// differ must check is the two joined, since the counts line is part of
// the binding template contract too (both templates end with one).
function fullBriefText(body, text, counts) {
  const eclipseComponent = body === 'Nodes' ? `, ${counts.eclipseEntryCount} ECLIPSE` : '';
  return `${text}\n\n[counts] entries: ${counts.totalEntries} (${counts.natalCount} NATAL_CONTACT, ${counts.skyCount} SKY_CONTACT${eclipseComponent}); `
    + `activation facts: ${counts.activationCount}; eclipse-to-transit facts: ${counts.eclipseFactCount}`;
}

// ── 6. mechanical template-conformance differ (STEP C) ──────────────────

async function certifyTemplateConformance() {
  console.log('\n=== TEMPLATE CONFORMANCE (mechanical structural differ) ===');
  console.log(
    '  Parses both docs/brief-template-planet.md and docs/brief-template-nodes.md and a live re-assembly of each body\'s '
    + 'brief into pure structure (entry types, field names and order, fact-block types) using the same parser for both '
    + 'sides, then asserts: every entry/fact type in output exists in the template\'s own vocabulary, every field the '
    + 'template always shows for that type is present, no unrecognized field appears, field order matches, every date is '
    + 'ISO YYYY-MM-DD, the [counts] line names every entry type actually present, and STATUS/TETHER/MOTION/trigger words '
    + 'come only from the template\'s own demonstrated vocabulary. Compares structure only, never values.',
  );
  const planetTemplate = readFileSync(join(__dirname, '..', 'docs', 'brief-template-planet.md'), 'utf8');
  const nodesTemplate = readFileSync(join(__dirname, '..', 'docs', 'brief-template-nodes.md'), 'utf8');
  const bodies = [
    ['Saturn', planetTemplate, 'planet'],
    ['Mercury', planetTemplate, 'planet'],
    ['Nodes', nodesTemplate, 'nodes'],
  ];
  for (const [body, template, variant] of bodies) {
    try {
      const { text, counts } = await assembleBrief(body);
      const fullText = fullBriefText(body, text, counts);
      const { pass, failures } = checkConformance(template, fullText, variant);
      const detail = pass
        ? 'structurally conforms to the template'
        : failures.map(f => `[${f.entry} / ${f.field}] ${f.issue}`).join(' | ');
      record('template conformance', `${body}: brief structure matches docs/brief-template-${variant}.md`, pass, detail);
    } catch (err) {
      record('template conformance', `${body}: brief structure matches docs/brief-template-${variant}.md`, false, err.message);
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('CERTIFICATION REPORT -- transit_calendar / aspect_calendar / sky_positions / transit_pieces');
  console.log('Read-only. No writes, no AI/API calls.');

  await certifySkyPositions();
  await certifyTransitCalendar();
  await certifyAspectCalendar();
  await certifyTransitPieces();
  await certifyStructuralGuardsAndBriefs();
  await certifyTemplateConformance();

  console.log('\n=== SUMMARY ===');
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length} checks run, ${results.length - failed.length} passed, ${failed.length} failed.`);
  if (failed.length === 0) {
    console.log('ALL CLEAR.');
  } else {
    console.log('FAILURES:');
    for (const f of failed) console.log(`  - [${f.section}] ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
