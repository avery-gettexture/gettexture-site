// VALIDATION GATE printout (Phase 2). Prints the full contact itinerary for
// Saturn's current phase, Mercury's current phase, and the Nodes' current
// passage against the dogfood chart -- windows, exacts, passes,
// copresences, and (Nodes only) eclipse-to-natal catches -- for hand
// verification against Astro-Seek before anything is written to a table or
// sent to the API. Read-only: queries Supabase, writes nothing.
//
// Usage: node --env-file=.env.local scripts/engine/print-itinerary.mjs

import { createClient } from '@supabase/supabase-js';
import {
  SIGNS, extractNatalPoints, computeContactWindows, contactAnchorDate,
  windowOverlaps, natalCopresence, skyCopresenceSpans, eclipseCatches,
  mintContactId, mintAxisContactId, labelAxisContact, findTruePassageRows,
} from './contact-engine.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const DOGFOOD_READING_SLUG = 'hejkhjq1zns5';
const TODAY = new Date().toISOString().slice(0, 10);
const ALL_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const PAGE_SIZE = 1000;

// ── Fetch helpers ──────────────────────────────────────────────────────

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
    if (error) throw new Error(`sky_positions read failed for ${body}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function fetchSeriesRange(body, start, end) {
  const { data, error } = await supabase
    .from('sky_positions')
    .select('date, sign, sign_degree, longitude, retrograde')
    .eq('body', body)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });
  if (error) throw new Error(`sky_positions range read failed for ${body}: ${error.message}`);
  return data;
}

async function fetchCurrentPhaseRow(body) {
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('*')
    .eq('body', body)
    .lte('date', TODAY)
    .order('date', { ascending: false })
    .limit(1);
  if (error) throw new Error(`transit_calendar read failed for ${body}: ${error.message}`);
  if (!data.length) throw new Error(`No current transit_calendar row found for ${body} on or before ${TODAY}`);
  return data[0];
}

// Passage = the body's true continuous residency in its home sign,
// walked by adjacency rather than trusted from the (per-leg-scoped)
// stored sign_egress_date field -- see findTruePassageRows in
// contact-engine.mjs.
async function fetchPassageRows(body, currentRow) {
  if (body === 'Nodes') return [currentRow]; // no `sign` field, never fragments -- see assemble-brief.mjs
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('*')
    .eq('body', body)
    .order('date', { ascending: true });
  if (error) throw new Error(`transit_calendar passage read failed for ${body}: ${error.message}`);
  return findTruePassageRows(data, currentRow);
}

async function fetchAspectCalendarForBody(body, start, end) {
  const { data: d1, error: e1 } = await supabase
    .from('aspect_calendar')
    .select('*')
    .eq('body_1', body)
    .lte('window_start', end)
    .gte('window_end', start);
  if (e1) throw new Error(e1.message);
  const { data: d2, error: e2 } = await supabase
    .from('aspect_calendar')
    .select('*')
    .eq('body_2', body)
    .lte('window_start', end)
    .gte('window_end', start);
  if (e2) throw new Error(e2.message);
  return [...d1, ...d2];
}

async function fetchEclipses(start, end) {
  const { data, error } = await supabase
    .from('aspect_calendar')
    .select('*')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse'])
    .gte('exact_date', start)
    .lte('exact_date', end)
    .order('exact_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// ── Passage / phase description ───────────────────────────────────────

function describePassage(body, rows) {
  const ingressRow = rows.find(r => r.event_type === 'ingress' || r.event_type === 'retro_ingress');
  const stationCount = rows.filter(r => r.event_type === 'station_retrograde' || r.event_type === 'station_direct').length;
  const shape = stationCount === 0 ? 'clean forward passage'
    : stationCount === 2 ? 'one retrograde loop'
    : `${stationCount} reversals across this passage`;
  return {
    ingressDate: ingressRow?.date ?? rows[0].date,
    ingressDirect: ingressRow ? ingressRow.event_type === 'ingress' : true,
    egressDate: rows[rows.length - 1].sign_egress_date,
    shape,
    rows,
  };
}

function currentMotion(row) {
  if (row.event_type === 'station_direct' || row.event_type === 'ingress') return 'FORWARD';
  return 'RETROGRADE'; // station_retrograde or retro_ingress opens a retrograde phase
}

// ── Contact computation for one focus body vs all 13 natal points ──────

function computeAllContacts(focusBody, series, natalPoints) {
  const axisForFocus = focusBody === 'Nodes';
  const results = [];
  for (const point of natalPoints) {
    const axisInvolved = axisForFocus || point.isAxis;
    const rows = computeContactWindows(series, point, axisInvolved);
    for (const row of rows) {
      results.push({ point, axisInvolved, ...row });
    }
  }
  return results;
}

function formatContact(focusBody, c) {
  const anchor = contactAnchorDate(c);
  // This validation script does not compute passage-scoped window/pass
  // grouping (that lives in assemble-brief.mjs, the production path) --
  // IDs printed here use the row's own WITHIN-WINDOW pass numbers, so
  // they will not match assemble-brief.mjs's passage-scoped IDs for a
  // multi-window contact. Fine for this script's job (verifying degrees,
  // dates, and copresence against Astro-Seek), not authoritative for IDs.
  const windowScopedCounts = { n: c.passN, m: c.passM };
  let idLine, descLine;
  if (c.axisInvolved) {
    const { kind, label } = labelAxisContact(c.dist, focusBody === 'Nodes', c.point);
    idLine = mintAxisContactId(focusBody, kind, c.point.name, c, windowScopedCounts);
    descLine = label;
  } else {
    idLine = mintContactId(focusBody, c.aspect, c.point.name, c, windowScopedCounts);
    descLine = `${c.aspect} natal ${c.point.name} (${c.point.sign} ${c.point.degree.toFixed(2)}°, ${c.point.house ?? 'house unknown'})`;
  }
  const dates = c.exactDate
    ? `orb ${c.windowStart} -> exact ${c.exactDate} -> ${c.windowEnd}${c.stillOpenAtSeriesEnd ? ' (still open at data end)' : ''} [pass ${c.passN} of ${c.passM}]`
    : `orb ${c.windowStart} -> ${c.windowEnd}${c.stillOpenAtSeriesEnd ? ' (still open at data end)' : ''} -- no exact`;
  return `  [${anchor}] ${descLine}\n      ${dates}\n      id: ${idLine}`;
}

// ── Configuration detection ─────────────────────────────────────────────

async function findConfigurations(focusBody, focusContacts, phaseStart, phaseEnd, natalPoints) {
  const skyRows = await fetchAspectCalendarForBody(focusBody, phaseStart, phaseEnd);
  const configs = [];
  for (const sky of skyRows) {
    const otherBody = sky.body_1 === focusBody ? sky.body_2 : sky.body_1;
    if (otherBody === 'Moon') continue; // eclipses aside, Moon never appears here
    const skyStart = sky.window_start ?? sky.exact_date;
    const skyEnd = sky.window_end ?? sky.exact_date;
    // Focus body's own contacts overlapping this sky window
    const focusOverlaps = focusContacts.filter(c => windowOverlaps(c, skyStart, skyEnd));
    if (focusOverlaps.length === 0) continue;
    // Other body's contacts to the same natal points, in a window around the sky aspect.
    // otherBody is never 'Nodes' here (aspect_calendar never includes it), so the only
    // source of axis-involvement on this side is the natal point itself being the axis.
    const otherSeries = await fetchSeriesRange(otherBody, skyStart, skyEnd);
    for (const fc of focusOverlaps) {
      const otherAxisInvolved = fc.point.isAxis;
      const otherRows = computeContactWindows(otherSeries, fc.point, otherAxisInvolved);
      for (const oc of otherRows) {
        if (windowOverlaps(oc, skyStart, skyEnd) && windowOverlaps(oc, fc.windowStart, fc.windowEnd)) {
          configs.push({ focusContact: fc, otherBody, otherContact: { point: fc.point, axisInvolved: otherAxisInvolved, ...oc }, sky });
        }
      }
    }
  }
  return configs;
}

// ── Main per-body report ────────────────────────────────────────────────

async function reportBody(focusBody, natalPoints, seriesFull) {
  console.log(`\n${'='.repeat(78)}\n${focusBody.toUpperCase()}\n${'='.repeat(78)}`);

  const currentRow = await fetchCurrentPhaseRow(focusBody);
  const passageRows = await fetchPassageRows(focusBody, currentRow);
  const passage = describePassage(focusBody, passageRows);
  const phaseEnd = currentRow.phase_end_date ?? passage.egressDate;
  const transitedSign = focusBody === 'Nodes' ? null : currentRow.sign;

  console.log(`\nPASSAGE: ingress ${passage.ingressDate} (${passage.ingressDirect ? 'direct' : 'retrograde re-ingress'}) -> egress ${passage.egressDate}. Shape: ${passage.shape}.`);
  console.log(`Passage rows: ${passage.rows.map(r => `${r.event_type}@${r.date}`).join(' | ')}`);
  console.log(`\nCURRENT PHASE: opened by ${currentRow.event_type} on ${currentRow.date}, closes ${phaseEnd}. Motion: ${focusBody === 'Nodes' ? 'N/A (single phase, no stations)' : currentMotion(currentRow)}.`);
  if (transitedSign) console.log(`Sign: ${transitedSign}`);
  if (focusBody === 'Nodes') console.log(`Axis: North Node ${currentRow.north_sign} / South Node ${currentRow.south_sign}`);

  // Copresence
  if (focusBody === 'Nodes') {
    console.log(`\nNATAL COPRESENCE (North Node end, sign ${currentRow.north_sign}):`);
    natalCopresence(currentRow.north_sign, natalPoints).forEach(p => console.log(`  ${p.name} at ${p.degree.toFixed(2)}° (${p.house ?? 'house unknown'})`));
    console.log(`NATAL COPRESENCE (South Node end, sign ${currentRow.south_sign}):`);
    natalCopresence(currentRow.south_sign, natalPoints).forEach(p => console.log(`  ${p.name} at ${p.degree.toFixed(2)}° (${p.house ?? 'house unknown'})`));
  } else {
    console.log(`\nNATAL COPRESENCE (sign ${transitedSign}):`);
    const nc = natalCopresence(transitedSign, natalPoints);
    if (nc.length === 0) console.log('  none');
    nc.forEach(p => console.log(`  ${p.name} at ${p.degree.toFixed(2)}° (${p.house ?? 'house unknown'})`));
  }

  console.log(`\nSKY COPRESENCE during current phase (${currentRow.date} -> ${phaseEnd}):`);
  for (const otherBody of ALL_BODIES) {
    if (otherBody === focusBody) continue;
    const otherSeries = await fetchSeriesRange(otherBody, currentRow.date, phaseEnd);
    const signsToCheck = focusBody === 'Nodes' ? [currentRow.north_sign, currentRow.south_sign] : [transitedSign];
    for (const sgn of signsToCheck) {
      const spans = skyCopresenceSpans(otherSeries, sgn);
      spans.forEach(sp => console.log(`  ${otherBody} in ${sgn}: ${sp.start} -> ${sp.end}`));
    }
  }

  // Natal contacts. Passage membership requires BOTH date-range overlap
  // AND sign match (STEP 2 Bug A fix -- see filterAndGroupForPassage's
  // header comment in contact-engine.mjs): date alone let a closed-out
  // prior-sign window bleed in at a boundary coincidence; sign alone
  // over-admits for fast bodies that revisit the same sign many times
  // across the tracked range.
  const passageHomeSign = focusBody === 'Nodes' ? currentRow.north_sign : currentRow.sign;
  const allContacts = computeAllContacts(focusBody, seriesFull, natalPoints);
  const timeline = allContacts.filter(c => windowOverlaps(c, currentRow.date, phaseEnd) && contactAnchorDate(c) >= currentRow.date && contactAnchorDate(c) <= phaseEnd)
    .sort((a, b) => contactAnchorDate(a) < contactAnchorDate(b) ? -1 : 1);
  const passageOnly = allContacts.filter(c =>
    windowOverlaps(c, passage.ingressDate, passage.egressDate) && c.transitingSign === passageHomeSign && !timeline.includes(c))
    .sort((a, b) => contactAnchorDate(a) < contactAnchorDate(b) ? -1 : 1);

  console.log(`\nTIMELINE -- ${focusBody}'s current phase (${timeline.length} event${timeline.length === 1 ? '' : 's'}):`);
  if (timeline.length === 0) console.log('  (quiet phase -- no contact events)');
  timeline.forEach(c => console.log(formatContact(focusBody, c)));

  console.log(`\nPASSAGE_CONTACTS -- rest of this passage, undated summary (${passageOnly.length} contact-window${passageOnly.length === 1 ? '' : 's'}):`);
  const seen = new Set();
  passageOnly.forEach(c => {
    const key = c.axisInvolved ? `${c.point.name}-${c.dist}` : `${c.point.name}-${c.aspect}`;
    if (seen.has(key)) return;
    seen.add(key);
    const passesForPoint = passageOnly.filter(x => (x.axisInvolved ? `${x.point.name}-${x.dist}` === key : `${x.point.name}-${x.aspect}` === key) && x.exactDate);
    console.log(`  ${c.point.name}: ${c.axisInvolved ? labelAxisContact(c.dist, focusBody === 'Nodes', c.point).label : c.aspect}, ${passesForPoint.length || 'no exact'} pass(es) later in this passage`);
  });

  // Configurations
  const configs = await findConfigurations(focusBody, timeline, currentRow.date, phaseEnd, natalPoints);
  console.log(`\nCONFIGURATIONS during current phase (${configs.length}):`);
  configs.forEach(cfg => {
    console.log(`  ${focusBody} ${cfg.sky.event} ${cfg.otherBody} (sky window ${cfg.sky.window_start ?? cfg.sky.exact_date} -> ${cfg.sky.window_end ?? cfg.sky.exact_date}, exact ${cfg.sky.exact_date ?? 'none'})`);
    console.log(`    both also contact natal ${cfg.focusContact.point.name}: ${focusBody} ${cfg.focusContact.axisInvolved ? labelAxisContact(cfg.focusContact.dist, focusBody === 'Nodes', cfg.focusContact.point).label : cfg.focusContact.aspect} (${cfg.focusContact.exactDate ?? 'no exact'}), ${cfg.otherBody} ${cfg.otherContact.axisInvolved ? labelAxisContact(cfg.otherContact.dist, false, cfg.otherContact.point).label : cfg.otherContact.aspect} (${cfg.otherContact.exactDate ?? 'no exact'})`);
  });

  // Eclipses (Nodes only)
  if (focusBody === 'Nodes') {
    const eclipses = await fetchEclipses(passage.ingressDate, passage.egressDate);
    console.log(`\nECLIPSES in this passage (${eclipses.length}):`);
    eclipses.forEach(e => {
      console.log(`  ${e.event} ${e.exact_date}: ${e.exact_degree.toFixed(2)}° ${e.body_1_sign} (id: ${e.id})`);
      const catches = eclipseCatches(e, natalPoints);
      if (catches.length === 0) {
        console.log('    natal points caught: none');
      } else {
        catches.forEach(c => console.log(`    natal points caught: ${c.name} (${c.house ?? 'house unknown'}), ${c.end}`));
      }
    });
  }

  return { currentRow, passage, timeline, passageOnly, configs };
}

// ── Entry point ──────────────────────────────────────────────────────────

async function main() {
  console.log(`Transit contact engine -- validation printout. TODAY = ${TODAY}.`);

  const { data: reading, error } = await supabase
    .from('readings')
    .select('chart_data, name')
    .eq('slug', DOGFOOD_READING_SLUG)
    .single();
  if (error || !reading) throw new Error(`Could not load reading ${DOGFOOD_READING_SLUG}: ${error?.message}`);

  const natalPoints = extractNatalPoints(reading.chart_data);
  console.log(`\nChart: ${reading.name} (slug ${DOGFOOD_READING_SLUG}). 13 receiving points:`);
  natalPoints.forEach(p => {
    if (p.isAxis) console.log(`  Axis: North ${p.northSign} ${p.degree.toFixed(2)}° (${p.northHouse}) / South ${p.southSign} ${p.degree.toFixed(2)}° (${p.southHouse})`);
    else console.log(`  ${p.name}: ${p.sign} ${p.degree.toFixed(2)}° (${p.house ?? 'house unknown'})`);
  });

  console.log('\nFetching full sky_positions history for Saturn, Mercury, North Node...');
  const [saturnSeries, mercurySeries, nodeSeries] = await Promise.all([
    fetchFullSeries('Saturn'),
    fetchFullSeries('Mercury'),
    fetchFullSeries('North Node'),
  ]);
  console.log(`Saturn: ${saturnSeries.length} rows. Mercury: ${mercurySeries.length} rows. North Node: ${nodeSeries.length} rows.`);

  await reportBody('Saturn', natalPoints, saturnSeries);
  await reportBody('Mercury', natalPoints, mercurySeries);
  await reportBody('Nodes', natalPoints, nodeSeries);

  console.log(`\n${'='.repeat(78)}\nEnd of validation printout. Nothing was written to any table.\n${'='.repeat(78)}`);
}

main().catch(err => {
  console.error(err.stack ?? err);
  process.exit(1);
});
