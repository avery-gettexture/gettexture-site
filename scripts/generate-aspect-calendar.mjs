// Fills aspect_calendar from sky_positions: one row per exact perfection of a
// major aspect (conjunction, sextile, square, trine, opposition) between each
// of the 36 canonical pairs among the 9 non-Moon tracked bodies, plus one row
// for any orb window a pair enters and leaves without perfecting ("no exact").
//
// DATA MODEL LAW (see also the aspect_calendar table comment in
// scripts/create_transit_and_aspect_calendars.sql): rows are events, content
// units are windows. Multiple exact rows sharing one continuous orb window
// (identical window_start and window_end) are ONE story for any
// content-generation or grouping consumer -- "in orb X to Y, exacting m
// times" is one block, never m blocks. There is no static limit on exacts
// per window. Any future consumer must group by the shared window, never by
// row count.
//
// PASS NUMBERING IS PASSAGE-SCOPED, NOT WINDOW-SCOPED (changed -- see
// assignAspectPassages below and SPEC.md's Engine Build Record for the
// ratification). pass_n/pass_m on an exact row, and the -p{n}of{m} suffix
// on its id, count across the row's whole ASPECT PASSAGE -- every window of
// the SAME aspect between the SAME pair, chained as long as neither body's
// sign changes in between -- never within one window alone. A pair that
// separates and reapproaches without leaving orb still perfects twice in
// one window; a pair that perfects, drops out of the sign pairing, and
// reforms the same aspect later is two passes across two SEPARATE windows,
// same passage. WINDOW membership (window_start/window_end) and PASS
// numbering are independent: neither can be derived from the other.
//
// Usage:
//   node --env-file=.env.local scripts/generate-aspect-calendar.mjs
//   node --env-file=.env.local scripts/generate-aspect-calendar.mjs --start=2026-01-01 --end=2026-12-31
//
// IMPORTANT: --start/--end only filter which rows get WRITTEN and PRINTED.
// Every pair's *entire* sky_positions history (2023-01-01 to 2046-07-31) is
// always fetched and walked, because a window's true start/end can fall
// outside the requested slice. A row is included if its exact_date (or, for
// a "no exact" row, its window_start) falls inside the requested slice.
//
// DATING CONVENTION: a sky_positions row for date D records the sky at D's
// 00:00 UTC. When a crossing is detected between day D's snapshot and day
// D+1's snapshot, the true crossing happened sometime during day D itself
// (D's snapshot, taken before the crossing, doesn't show it yet; D+1's,
// taken after, already does) -- so the crossing is ALWAYS dated D, the
// earlier of the two bracketing days, regardless of what fraction of day D
// it actually fell in. There is no rounding between the two days. The
// fractional position within day D is still used to interpolate
// exact_degree (a continuous value), and every other point-in-time field on
// an exact row (each body's sign and motion state) is read from day D's own
// snapshot, matching the day the row is dated to.
//
// EDGE-WINDOW RULE (ratified; see also the aspect_calendar table comment in
// scripts/create_transit_and_aspect_calendars.sql): if a pair is already
// inside an orb window on 2023-01-01 (the data's first day), the window's
// true start is unknown -- it began before the data. The same applies if a
// window is still open on 2046-07-31 (the data's last day): whether/when it
// perfects is unknown. In both cases this script DROPS the window entirely
// rather than emit a window_start or pass count it can't actually verify --
// consistent with the "no fabricated events, no silent guessing" rule
// applied to transit_calendar's own range-boundary NULLs. This is rare (only
// matters for pairs whose window genuinely straddles 2023-01-01 or
// 2046-07-31) and does not affect the 2026 trial slice.
//
// Deterministic and idempotent: identical sky_positions data always produces
// identical rows and identical IDs. Re-running upserts on id.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PAGE_SIZE = 1000;

// Canonical speed order: faster bodies first. Pair generation (i < j) over
// this array yields all 36 pairs already in canonical order.
const SPEED_ORDER = [
  'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const ASPECT_ANGLES = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const SIGN_DIST_TO_ASPECT = { 0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition' };
const ACTIVE_ORB = 3;

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v];
    }),
  );
  return {
    start: args.start ?? '2023-01-01',
    end: args.end ?? '2046-07-31',
  };
}

async function fetchFullSeries(body) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('sky_positions')
      .select('date, sign, sign_degree, longitude, retrograde')
      .eq('body', body)
      .order('date', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase read failed for ${body}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

function angularSeparation(lon1, lon2) {
  const diff = Math.abs(lon1 - lon2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function signDistance(sign1, sign2) {
  const i1 = SIGNS.indexOf(sign1);
  const i2 = SIGNS.indexOf(sign2);
  const diff = Math.abs(i1 - i2);
  return Math.min(diff, 12 - diff);
}

// Interpolated degree-within-sign at a crossing, guarding against the rare
// case where the crossing falls on a day the body also changes sign (the
// raw sign_degree would otherwise appear to jump instead of continuing).
function interpolateDegree(degA, degB, f) {
  let adjB = degB;
  if (Math.abs(degB - degA) > 15) {
    adjB = degB > degA ? degB - 30 : degB + 30;
  }
  const result = degA + f * (adjB - degA);
  return ((result % 30) + 30) % 30;
}

// BUGFIX (found during the transit contact-engine build; see the aspect_calendar
// regeneration task in docs/SPEC.md): the crossing-detection below used to test
// for a sign flip in (sep - angle), where sep = angularSeparation is always
// unsigned, folded to [0, 180]. That works for square/sextile/trine (angle
// 60/90/120, safely inside the [0,180] range), but is structurally incapable
// of detecting a crossing at angle 0 (conjunction) or 180 (opposition): sep-angle
// can only approach zero and turn back at those two boundary angles, never
// actually change sign. Every conjunction and opposition row in this table
// was therefore stamped "no exact" regardless of whether a real exact
// crossing occurred. Confirmed by direct testing: 0 of 791 conjunction rows
// and 0 of 493 opposition rows had a non-null exact_date before this fix.
//
// Fix: track the SIGNED circular difference between body_1's longitude and
// the nearest actual target longitude (body_2's longitude +/- angle) instead.
// That value ranges continuously over (-180, 180] and genuinely crosses zero
// at exactness, for every aspect angle including 0 and 180. For square,
// sextile, and trine (where the old method was already mathematically sound)
// this reproduces identical results -- confirmed by re-running this script
// and diffing every previously-exact square/sextile/trine row byte for byte.
function nearestTargetLongitude(lon1, lon2, angle) {
  const t1 = ((lon2 + angle) % 360 + 360) % 360;
  if (angle === 0 || angle === 180) return t1; // conjunction/opposition: a single unambiguous point
  const t2 = ((lon2 - angle) % 360 + 360) % 360;
  return angularSeparation(lon1, t1) <= angularSeparation(lon1, t2) ? t1 : t2;
}

function signedCircularDiff(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function finalizeWindow(window, series1, series2, body1, body2, aspect, outRows) {
  if (window.truncatedStart) return; // true start unknown -- dropped, see header comment
  const diffs = window.diffs;
  const windowStartIdx = diffs[0].idx;
  const windowEndIdx = diffs[diffs.length - 1].idx;
  const windowStart = series1[windowStartIdx].date;
  const windowEnd = series1[windowEndIdx].date;
  const angle = ASPECT_ANGLES[aspect];

  const crossings = [];
  for (let a = 0; a < diffs.length - 1; a++) {
    const idxA = diffs[a].idx;
    const idxB = diffs[a + 1].idx;
    const targetA = nearestTargetLongitude(series1[idxA].longitude, series2[idxA].longitude, angle);
    const targetB = nearestTargetLongitude(series1[idxB].longitude, series2[idxB].longitude, angle);
    const d1 = signedCircularDiff(series1[idxA].longitude, targetA);
    const d2 = signedCircularDiff(series1[idxB].longitude, targetB);
    if (d1 * d2 < 0) {
      const f = Math.abs(d1) / (Math.abs(d1) + Math.abs(d2));
      // The crossing always falls on idxA's calendar day (see the DATING
      // CONVENTION note above) -- f only locates it fractionally within that
      // day, for interpolating the continuous degree value below.
      const exactDegree = interpolateDegree(series1[idxA].sign_degree, series1[idxB].sign_degree, f);
      crossings.push({
        exactDate: series1[idxA].date,
        exactDegree,
        body1AtExact: series1[idxA],
        body2AtExact: series2[idxA],
      });
    }
  }

  // id and pass_n/pass_m are NOT minted here: pass numbering is PASSAGE-
  // scoped (STEP 4), which requires seeing every window for this pair+
  // aspect first. assignAspectPassages (below) fills those in as a
  // second pass over this pair's complete row set.
  if (crossings.length === 0) {
    const b1 = series1[windowStartIdx];
    const b2 = series2[windowStartIdx];
    outRows.push({
      event: aspect,
      body_1: body1,
      body_2: body2,
      body_1_sign: b1.sign,
      body_2_sign: b2.sign,
      window_start: windowStart,
      window_end: windowEnd,
      exact_date: null,
      body_1_retrograde: null,
      body_2_retrograde: null,
      exact_degree: null,
    });
    return;
  }

  crossings.forEach((c) => {
    outRows.push({
      event: aspect,
      body_1: body1,
      body_2: body2,
      body_1_sign: c.body1AtExact.sign,
      body_2_sign: c.body2AtExact.sign,
      window_start: windowStart,
      window_end: windowEnd,
      exact_date: c.exactDate,
      body_1_retrograde: c.body1AtExact.retrograde,
      body_2_retrograde: c.body2AtExact.retrograde,
      exact_degree: c.exactDegree,
    });
  });
}

// ── Passage-scoped window/pass assignment (STEP 4) ──────────────────────
//
// An "aspect passage" -- a new concept, specific to this table, distinct
// from a transit_calendar PASSAGE -- is a run of consecutive windows of
// the SAME aspect between the SAME pair, unbroken by a sign change in
// EITHER body. A bare retrograde separate-and-reapproach that never
// leaves the same sign pairing stays one aspect passage (its windows
// still split at the orb boundary, same as always -- windows are still
// per continuous orb engagement -- but they now share passage-scoped
// pass numbering). An actual sign change by either body breaks the
// aspect passage, by rule, even if the same aspect re-forms shortly
// after -- this is the sign-consonance principle applied temporally: an
// aspect's story lasts exactly as long as the sign pairing that licenses
// it. WINDOW and PASS are independent counters over the aspect passage:
// a pair that reverses inside orb without leaving it can perfect twice
// in one window; perfect / leave the sign pairing / return / perfect is
// two passes across two separate windows.
function bodySignConstantAcrossGap(series, dateA, dateB) {
  let sign = null;
  for (const r of series) {
    if (r.date < dateA || r.date > dateB) continue;
    if (sign === null) sign = r.sign;
    else if (r.sign !== sign) return false;
  }
  return true;
}

function assignAspectPassages(rowsForPair, series1, series2) {
  const byAspect = new Map();
  for (const r of rowsForPair) {
    if (!byAspect.has(r.event)) byAspect.set(r.event, []);
    byAspect.get(r.event).push(r);
  }

  for (const aspectRows of byAspect.values()) {
    const windowsMap = new Map();
    for (const r of aspectRows) {
      const wk = `${r.window_start}|${r.window_end}`;
      if (!windowsMap.has(wk)) windowsMap.set(wk, []);
      windowsMap.get(wk).push(r);
    }
    const windowKeys = [...windowsMap.keys()].sort((a, b) => (a < b ? -1 : 1));

    const passageGroups = [[windowKeys[0]]];
    for (let i = 1; i < windowKeys.length; i++) {
      const prevEnd = windowsMap.get(windowKeys[i - 1])[0].window_end;
      const curStart = windowsMap.get(windowKeys[i])[0].window_start;
      const unbroken = bodySignConstantAcrossGap(series1, prevEnd, curStart)
        && bodySignConstantAcrossGap(series2, prevEnd, curStart);
      if (unbroken) passageGroups[passageGroups.length - 1].push(windowKeys[i]);
      else passageGroups.push([windowKeys[i]]);
    }

    for (const group of passageGroups) {
      const exactRows = group
        .flatMap(wk => windowsMap.get(wk))
        .filter(r => r.exact_date)
        .sort((a, b) => (a.exact_date < b.exact_date ? -1 : 1));
      const passCount = exactRows.length;
      exactRows.forEach((r, i) => { r.pass_n = i + 1; r.pass_m = passCount; });
    }
  }

  for (const r of rowsForPair) {
    r.id = r.exact_date
      ? `${r.body_1.toLowerCase()}-${r.event}-${r.body_2.toLowerCase()}-${r.exact_date}-p${r.pass_n}of${r.pass_m}`
      : `${r.body_1.toLowerCase()}-${r.event}-${r.body_2.toLowerCase()}-${r.window_start}-noexact`;
    if (!r.exact_date) { r.pass_n = null; r.pass_m = null; }
  }
  return rowsForPair;
}

function processPair(body1, body2, series1, series2) {
  const rows = [];
  let window = null;
  let droppedTruncated = 0;
  const N = series1.length;

  for (let k = 0; k < N; k++) {
    const s1 = series1[k];
    const s2 = series2[k];
    const sep = angularSeparation(s1.longitude, s2.longitude);
    const dist = signDistance(s1.sign, s2.sign);
    const aspect = SIGN_DIST_TO_ASPECT[dist] ?? null;
    const signedDiff = aspect !== null ? sep - ASPECT_ANGLES[aspect] : null;
    const inOrb = aspect !== null && Math.abs(signedDiff) <= ACTIVE_ORB;

    if (window && (!inOrb || aspect !== window.aspect)) {
      if (window.truncatedStart) {
        droppedTruncated++;
      } else {
        finalizeWindow(window, series1, series2, body1, body2, window.aspect, rows);
      }
      window = null;
    }

    if (inOrb) {
      if (!window) window = { aspect, diffs: [], truncatedStart: k === 0 };
      window.diffs.push({ idx: k, signedDiff });
    }
  }

  if (window) droppedTruncated++; // still open at the data's last day -- see header comment

  assignAspectPassages(rows, series1, series2);
  return { rows, droppedTruncated };
}

function printGrouped(rows) {
  if (rows.length === 0) {
    console.log('(no rows in the requested slice)');
    return;
  }
  const sorted = [...rows].sort((a, b) => {
    const key = (r) => `${r.body_1}|${r.body_2}|${r.window_start}|${r.window_end}|${r.pass_n ?? 0}`;
    return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
  });
  let lastWindowKey = null;
  for (const r of sorted) {
    const windowKey = `${r.body_1}-${r.body_2}-${r.window_start}-${r.window_end}`;
    if (windowKey !== lastWindowKey) {
      console.log(`\n[window ${r.window_start} -> ${r.window_end}] ${r.body_1} ${r.event} ${r.body_2}`);
      lastWindowKey = windowKey;
    }
    if (r.exact_date) {
      console.log(
        `    exact ${r.exact_date}  p${r.pass_n}of${r.pass_m}  ${r.body_1_sign}/${r.body_2_sign} @ ${r.exact_degree.toFixed(2)}°` +
        `  (${r.body_1} ${r.body_1_retrograde ? 'Rx' : 'direct'}, ${r.body_2} ${r.body_2_retrograde ? 'Rx' : 'direct'})  id=${r.id}`,
      );
    } else {
      console.log(`    no exact  ${r.body_1_sign}/${r.body_2_sign}  id=${r.id}`);
    }
  }
}

async function main() {
  const { start, end } = parseArgs();
  console.log(`aspect_calendar generation. Output slice: ${start} -> ${end}. (Computation always uses the full 2023-2046 sky_positions history.)`);

  const seriesByBody = {};
  for (const body of SPEED_ORDER) {
    seriesByBody[body] = await fetchFullSeries(body);
    console.log(`${body}: ${seriesByBody[body].length} days fetched`);
  }

  const lengths = new Set(Object.values(seriesByBody).map((s) => s.length));
  if (lengths.size !== 1) {
    throw new Error(`Body series have mismatched lengths: ${JSON.stringify(Object.fromEntries(Object.entries(seriesByBody).map(([b, s]) => [b, s.length])))}`);
  }
  const firstDates = new Set(Object.values(seriesByBody).map((s) => s[0].date));
  const lastDates = new Set(Object.values(seriesByBody).map((s) => s[s.length - 1].date));
  if (firstDates.size !== 1 || lastDates.size !== 1) {
    throw new Error('Body series do not all span the same date range.');
  }

  const allRows = [];
  let totalDropped = 0;
  for (let i = 0; i < SPEED_ORDER.length; i++) {
    for (let j = i + 1; j < SPEED_ORDER.length; j++) {
      const body1 = SPEED_ORDER[i];
      const body2 = SPEED_ORDER[j];
      const { rows, droppedTruncated } = processPair(body1, body2, seriesByBody[body1], seriesByBody[body2]);
      allRows.push(...rows);
      totalDropped += droppedTruncated;
    }
  }

  console.log(`\nTotal rows across full range: ${allRows.length}.`);
  if (totalDropped > 0) {
    console.log(`Dropped ${totalDropped} window(s) truncated by the data's start/end boundary (see header comment) -- flagged for review, not written.`);
  }

  const inSlice = allRows.filter((r) => (r.exact_date ?? r.window_start) >= start && (r.exact_date ?? r.window_start) <= end);
  console.log(`Rows in requested slice (${start} -> ${end}): ${inSlice.length}.\n`);

  if (inSlice.length > 0) {
    const { error } = await supabase
      .from('aspect_calendar')
      .upsert(inSlice, { onConflict: 'id' });
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
  }

  console.log('Rows written (grouped by shared window):');
  printGrouped(inSlice);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
