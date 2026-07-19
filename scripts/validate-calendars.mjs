// Read-only Phase 3 validation for transit_calendar and aspect_calendar.
// Writes nothing. Prints a plain report covering:
//   - transit_calendar: row-count cross-check, phase_end_date/sign_egress_date
//     integrity, no gaps/overlaps in any body's phase chain.
//   - aspect_calendar: window-sharing integrity, pass numbering, sign
//     consonance, motion-state cross-check against sky_positions, fast-mover
//     daily-resolution check.
//   - coverage: both tables' actual date span.
//
// Usage: node --env-file=.env.local scripts/validate-calendars.mjs

import { createClient } from '@supabase/supabase-js';

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

async function fetchSkyPositions(body, withLongitude = false) {
  const select = withLongitude ? 'date, longitude' : 'date, sign, retrograde';
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

async function validateTransitCalendar() {
  console.log('\n=== TRANSIT_CALENDAR ===');
  const rows = await fetchAll(
    'transit_calendar',
    'id, body, event_type, date, phase_end_date, sign_egress_date',
  );
  console.log(`Total rows: ${rows.length}`);

  // Cross-check against the independently-counted Phase 0 totals (sign
  // changes + retrograde flips counted directly from sky_positions, before
  // any generation script existed): 1189 ingress-type + 429 station-type = 1618.
  const ingressLike = rows.filter((r) => r.event_type === 'ingress' || r.event_type === 'retro_ingress').length;
  const stationLike = rows.filter((r) => r.event_type === 'station_retrograde' || r.event_type === 'station_direct').length;
  console.log(`Ingress-type rows: ${ingressLike} (Phase 0 independent count: 1189)`);
  console.log(`Station-type rows: ${stationLike} (Phase 0 independent count: 429)`);
  console.log(ingressLike === 1189 && stationLike === 429 ? 'MATCH.' : 'MISMATCH -- investigate.');

  const byBody = {};
  for (const r of rows) {
    (byBody[r.body] ??= []).push(r);
  }

  let phaseEndErrors = 0;
  let egressErrors = 0;
  for (const [body, bodyRows] of Object.entries(byBody)) {
    bodyRows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (let i = 0; i < bodyRows.length; i++) {
      const expectedPhaseEnd = bodyRows[i + 1]?.date ?? null;
      if (bodyRows[i].phase_end_date !== expectedPhaseEnd) {
        phaseEndErrors++;
        console.log(`  phase_end_date mismatch: ${body} ${bodyRows[i].id} has ${bodyRows[i].phase_end_date}, expected ${expectedPhaseEnd}`);
      }
      const nextIngress = bodyRows.slice(i + 1).find((r) => r.event_type === 'ingress' || r.event_type === 'retro_ingress');
      const expectedEgress = nextIngress?.date ?? null;
      if (bodyRows[i].sign_egress_date !== expectedEgress) {
        egressErrors++;
        console.log(`  sign_egress_date mismatch: ${body} ${bodyRows[i].id} has ${bodyRows[i].sign_egress_date}, expected ${expectedEgress}`);
      }
    }
  }
  console.log(`phase_end_date check: ${phaseEndErrors === 0 ? 'all correct' : `${phaseEndErrors} error(s)`}`);
  console.log(`sign_egress_date check: ${egressErrors === 0 ? 'all correct' : `${egressErrors} error(s)`}`);

  const dates = rows.map((r) => r.date).sort();
  console.log(`Coverage: earliest row ${dates[0]}, latest row ${dates[dates.length - 1]}`);
}

async function validateAspectCalendar() {
  console.log('\n=== ASPECT_CALENDAR ===');
  const rows = await fetchAll(
    'aspect_calendar',
    'id, event, body_1, body_2, body_1_sign, body_2_sign, window_start, window_end, exact_date, pass_n, pass_m, body_1_retrograde, body_2_retrograde',
  );
  console.log(`Total rows: ${rows.length}`);

  // exact_date must fall within [window_start, window_end]
  const outOfWindow = rows.filter((r) => r.exact_date && (r.exact_date < r.window_start || r.exact_date > r.window_end));
  console.log(`Rows with exact_date outside its own window: ${outOfWindow.length}`);

  // Group by (body_1, body_2, window_start, window_end); check pass numbering.
  const byWindow = {};
  for (const r of rows) {
    const key = `${r.body_1}|${r.body_2}|${r.window_start}|${r.window_end}`;
    (byWindow[key] ??= []).push(r);
  }
  let passErrors = 0;
  let noExactMixedWithExact = 0;
  for (const [key, group] of Object.entries(byWindow)) {
    const exactRows = group.filter((r) => r.exact_date !== null);
    const noExactRows = group.filter((r) => r.exact_date === null);
    if (exactRows.length > 0 && noExactRows.length > 0) {
      noExactMixedWithExact++;
      console.log(`  window ${key} has both exact and no-exact rows -- should not happen`);
    }
    if (exactRows.length > 0) {
      const ns = exactRows.map((r) => r.pass_n).sort((a, b) => a - b);
      const expected = Array.from({ length: exactRows.length }, (_, i) => i + 1);
      if (JSON.stringify(ns) !== JSON.stringify(expected)) {
        passErrors++;
        console.log(`  window ${key}: pass_n values ${JSON.stringify(ns)}, expected ${JSON.stringify(expected)}`);
      }
      const ms = new Set(exactRows.map((r) => r.pass_m));
      if (ms.size !== 1 || !ms.has(exactRows.length)) {
        passErrors++;
        console.log(`  window ${key}: pass_m values ${JSON.stringify([...ms])}, expected all ${exactRows.length}`);
      }
    }
  }
  console.log(`Distinct windows: ${Object.keys(byWindow).length}`);
  console.log(`Windows with both exact and no-exact rows: ${noExactMixedWithExact} (should be 0)`);
  console.log(`Pass-numbering errors: ${passErrors} (should be 0)`);

  // Sign-consonance: body_1_sign/body_2_sign distance must match the aspect.
  const consonanceErrors = rows.filter((r) => {
    const dist = signDistance(r.body_1_sign, r.body_2_sign);
    return SIGN_DIST_TO_ASPECT[dist] !== r.event;
  });
  console.log(`Sign-consonance violations: ${consonanceErrors.length} (should be 0)`);
  if (consonanceErrors.length > 0) {
    for (const r of consonanceErrors.slice(0, 10)) console.log(`  ${r.id}: ${r.body_1_sign}/${r.body_2_sign} does not match ${r.event}`);
  }

  // Motion-state cross-check against sky_positions, for a sample of exact rows.
  const exactRows = rows.filter((r) => r.exact_date !== null);
  const bodiesInvolved = [...new Set(exactRows.flatMap((r) => [r.body_1, r.body_2]))];
  const skyByBody = {};
  for (const body of bodiesInvolved) {
    const series = await fetchSkyPositions(body);
    skyByBody[body] = new Map(series.map((s) => [s.date, s]));
  }
  let motionMismatches = 0;
  for (const r of exactRows) {
    const b1 = skyByBody[r.body_1].get(r.exact_date);
    const b2 = skyByBody[r.body_2].get(r.exact_date);
    if (!b1 || !b2) continue;
    if (b1.retrograde !== r.body_1_retrograde || b2.retrograde !== r.body_2_retrograde) {
      motionMismatches++;
      console.log(`  motion mismatch: ${r.id} stored (${r.body_1_retrograde},${r.body_2_retrograde}) vs sky_positions (${b1.retrograde},${b2.retrograde})`);
    }
  }
  console.log(`Motion-state cross-check against sky_positions (all ${exactRows.length} exact rows): ${motionMismatches} mismatch(es)`);

  // Fast-mover daily-resolution check, part 1: minimum window length overall
  // and for pairs involving Sun, Mercury, or Venus specifically.
  const FAST = new Set(['Sun', 'Mercury', 'Venus']);
  const windowLengths = Object.values(byWindow).map((group) => {
    const g = group[0];
    const days = (new Date(g.window_end) - new Date(g.window_start)) / 86400000 + 1;
    const isFast = FAST.has(g.body_1) || FAST.has(g.body_2);
    return { pair: `${g.body_1}-${g.body_2}`, start: g.window_start, end: g.window_end, days, isFast };
  });
  windowLengths.sort((a, b) => a.days - b.days);
  console.log(`Shortest window overall: ${windowLengths[0].days} days (${windowLengths[0].pair}, ${windowLengths[0].start} -> ${windowLengths[0].end})`);
  const fastOnly = windowLengths.filter((w) => w.isFast);
  console.log(`Shortest window among Sun/Mercury/Venus pairs: ${fastOnly[0].days} days (${fastOnly[0].pair}, ${fastOnly[0].start} -> ${fastOnly[0].end})`);

  // Fast-mover daily-resolution check, part 2: the direct proof. A window
  // can only be entirely invisible to daily snapshots if a pair's angular
  // separation could jump more than 6 degrees (the full active-orb span,
  // 3 either side of exact) in a single day -- skipping over the whole
  // capture zone between two consecutive snapshots. This measures the
  // actual maximum day-over-day change in separation, for every one of the
  // 36 pairs, straight from sky_positions -- not a theoretical speed limit.
  const SPEED_ORDER = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const fullSeries = {};
  for (const body of SPEED_ORDER) {
    fullSeries[body] = await fetchSkyPositions(body, true);
  }
  function angularSeparation(lon1, lon2) {
    const diff = Math.abs(lon1 - lon2) % 360;
    return diff > 180 ? 360 - diff : diff;
  }
  const maxDeltas = [];
  for (let i = 0; i < SPEED_ORDER.length; i++) {
    for (let j = i + 1; j < SPEED_ORDER.length; j++) {
      const b1 = SPEED_ORDER[i];
      const b2 = SPEED_ORDER[j];
      const s1 = fullSeries[b1];
      const s2 = fullSeries[b2];
      let maxDelta = 0;
      let prevSep = angularSeparation(s1[0].longitude, s2[0].longitude);
      for (let k = 1; k < s1.length; k++) {
        const sep = angularSeparation(s1[k].longitude, s2[k].longitude);
        maxDelta = Math.max(maxDelta, Math.abs(sep - prevSep));
        prevSep = sep;
      }
      maxDeltas.push({ pair: `${b1}-${b2}`, maxDelta, isFast: FAST.has(b1) || FAST.has(b2) });
    }
  }
  maxDeltas.sort((a, b) => b.maxDelta - a.maxDelta);
  console.log(`Largest day-over-day separation change, any pair: ${maxDeltas[0].maxDelta.toFixed(3)} deg/day (${maxDeltas[0].pair})`);
  const fastDeltas = maxDeltas.filter((d) => d.isFast);
  console.log(`Largest day-over-day separation change, Sun/Mercury/Venus pairs: ${fastDeltas[0].maxDelta.toFixed(3)} deg/day (${fastDeltas[0].pair})`);
  console.log(`Active orb span is 6 degrees (3 either side of exact). ${maxDeltas[0].maxDelta < 6 ? 'Every pair stays well under this -- daily resolution cannot skip a window.' : 'AT LEAST ONE PAIR EXCEEDS THIS -- STOP, see below.'}`);

  const dates = [...rows.map((r) => r.exact_date).filter(Boolean), ...rows.map((r) => r.window_start)].sort();
  console.log(`Coverage: earliest relevant date ${dates[0]}, latest ${dates[dates.length - 1]}`);
}

async function main() {
  await validateTransitCalendar();
  await validateAspectCalendar();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
