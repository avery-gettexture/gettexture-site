// Phase 3: assembles the Call 1 USER MESSAGE FORMAT block for one
// (chart, transiting body) pair, exactly per docs/TRANSIT_C_CALL_1_v3.md
// section 29 (including the NODES VARIANT), using engine-minted IDs from
// contact-engine.mjs.
//
// ENTRY/ACTIVATION MODEL (per the founder's restructure ruling): a brief's
// timeline has exactly two entry kinds -- NATAL_CONTACT and SKY_CONTACT.
// CONFIGURATIONs no longer mint their own entries. Instead, when body B
// aspects the focus body in the sky while both touch the same natal point
// in overlapping windows, that is written as a dated ACTIVATION fact
// attached to the relevant NATAL_CONTACT entry -- computed symmetrically,
// so the identical fact appears in both bodies' briefs when both are built.
//
// SKY_CONTACT placement (by pair speed class):
//   - SLOW pair (both bodies in Jupiter/Saturn/Uranus/Neptune/Pluto): ALWAYS
//     its own entry, regardless of natal activity; PLUS activation facts
//     wherever it also intersects a natal point.
//   - FAST-INVOLVING pair (Sun/Mercury/Venus/Mars on at least one side):
//     activation facts only when it intersects a natal point (no separate
//     entry); its own atmospheric (chart-untethered) entry when it touches
//     no natal point at all.
// Net invariant: every computed sky aspect of the focus body appears in its
// brief at least once -- as an entry, as facts, or both.
//
// Read-only: queries Supabase, prints the assembled brief, writes nothing
// and makes no API calls.
//
// Usage: node --env-file=.env.local scripts/engine/assemble-brief.mjs [Saturn|Mercury|Nodes]

import { createClient } from '@supabase/supabase-js';
import {
  extractNatalPoints, computeContactWindows, contactAnchorDate,
  windowOverlaps, natalCopresence, skyCopresenceSpans, eclipseCatches,
  mintContactId, mintAxisContactId, labelAxisContact, houseOfSign,
  isSlowPair, mintActivationId, mintEclipseTransitActivationId,
  assertSignConsonant, filterAndGroupForPassage, findActivationAnchor,
  findTruePassageRows,
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
    .eq('body', body).gte('date', start).lte('date', end)
    .order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function fetchCurrentPhaseRow(body) {
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('*').eq('body', body).lte('date', TODAY)
    .order('date', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error(`No current transit_calendar row for ${body}`);
  return data[0];
}

// STEP 5: sign_egress_date is stored per-leg, not per true passage (see
// findTruePassageRows's header comment in contact-engine.mjs), so an
// equality filter on it silently stops at a retrograde re-ingress. Fetch
// the body's full row history instead and walk it by adjacency. Nodes
// rows have no `sign` field (they carry north_sign/south_sign) and never
// fragment -- no stations, ever, so one axis occupancy is structurally
// always exactly one row -- so the walk is skipped for Nodes.
async function fetchPassageRows(body, currentRow) {
  if (body === 'Nodes') return [currentRow];
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('*').eq('body', body)
    .order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return findTruePassageRows(data, currentRow);
}

async function fetchAspectCalendarForBody(body, start, end) {
  const { data: d1, error: e1 } = await supabase.from('aspect_calendar').select('*').eq('body_1', body).lte('window_start', end).gte('window_end', start);
  if (e1) throw new Error(e1.message);
  const { data: d2, error: e2 } = await supabase.from('aspect_calendar').select('*').eq('body_2', body).lte('window_start', end).gte('window_end', start);
  if (e2) throw new Error(e2.message);
  return [...d1, ...d2];
}

async function fetchEclipsesInRange(start, end) {
  const { data, error } = await supabase.from('aspect_calendar').select('*')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse']).gte('exact_date', start).lte('exact_date', end)
    .order('exact_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// ── Passage description ───────────────────────────────────────────────

function describePassage(rows) {
  const ingressRow = rows.find(r => r.event_type === 'ingress' || r.event_type === 'retro_ingress');
  const stationCount = rows.filter(r => r.event_type === 'station_retrograde' || r.event_type === 'station_direct').length;
  const shape = stationCount === 0 ? 'clean forward passage'
    : stationCount === 2 ? 'one retrograde loop'
    : `${stationCount} reversals across this passage`;
  return {
    ingressDate: ingressRow?.date ?? rows[0].date,
    ingressDirect: ingressRow ? ingressRow.event_type === 'ingress' : true,
    // Read from the LAST row, not the first (STEP 5 fix): sign_egress_date
    // is stored per-leg, and only the final leg's own value can correctly
    // reflect the true final egress -- an earlier leg's value is scoped to
    // when THAT leg's dip happened, not the true passage end.
    egressDate: rows[rows.length - 1].sign_egress_date,
    shape,
  };
}

function eventLabel(eventType, degree) {
  if (eventType === 'ingress' || eventType === 'retro_ingress') return 'ingress';
  if (eventType === 'station_retrograde') return `station retrograde at ${degree.toFixed(1)}°`;
  if (eventType === 'station_direct') return `station direct at ${degree.toFixed(1)}°`;
  return eventType;
}

// ── Contact gathering ────────────────────────────────────────────────────
//
// Raw contacts are computed across the transiting body's ENTIRE tracked
// history (all signs, all passages, all time) -- this is unavoidable
// since a natal point's aspect to the transiting body recurs every time
// the body revisits a consonant sign. Every row is checked for sign-
// consonance (STEP 3, guard 1) the moment it's produced. Passage
// membership -- which of these belong to the body's CURRENT passage --
// is decided separately, by filterAndGroupForPassage, using the row's
// own recorded sign (STEP 2 Bug A/B fix), never by date-range overlap.

function computeRawContactsByPoint(focusBody, series, natalPoints) {
  const axisForFocus = focusBody === 'Nodes';
  const byPoint = new Map();
  for (const point of natalPoints) {
    const axisInvolved = axisForFocus || point.isAxis;
    const referenceSign = point.isAxis ? point.northSign : point.sign;
    const rows = computeContactWindows(series, point, axisInvolved);
    for (const row of rows) assertSignConsonant(row, referenceSign);
    byPoint.set(point.name, rows.map(row => ({ point, axisInvolved, key: point.name, ...row })));
  }
  return byPoint;
}

// Boundary dates are always stated (STEP 7): a contact already in orb
// when the phase opens states its true original open date even though
// that date precedes phaseStart; a contact still in orb at phase close
// states that explicitly, even when it also perfected in-phase.
function formatBoundaryDates(windowStart, windowEnd, exactDate, phaseStart, phaseEnd) {
  const exactInPhase = !!exactDate && exactDate >= phaseStart && exactDate <= phaseEnd;
  const openedBeforePhase = windowStart < phaseStart;
  const stillOpenAtPhaseClose = windowEnd > phaseEnd;

  const parts = [];
  if (openedBeforePhase) parts.push(`in orb at phase open (since ${windowStart})`);
  else parts.push(`orb opens ${windowStart}`);
  if (exactInPhase) parts.push(`exact ${exactDate}`);

  if (stillOpenAtPhaseClose) {
    if (!exactInPhase) {
      parts.push('no exact this phase -- phase closes mid-window');
    }
    parts.push('remains in orb at phase close');
  } else {
    parts.push(`separates ${windowEnd}`);
  }
  return parts.join(', ');
}

function formatContactDates(row, phaseStart, phaseEnd) {
  return formatBoundaryDates(row.windowStart, row.windowEnd, row.exactDate, phaseStart, phaseEnd);
}

function computeStatus(row, phaseStart, phaseEnd, siblingRows) {
  const exactInPhase = !!row.exactDate && row.exactDate >= phaseStart && row.exactDate <= phaseEnd;
  if (exactInPhase) return 'perfects this phase';
  const hasLaterExact = siblingRows.some(r => r !== row && r.exactDate);
  return hasLaterExact ? 'no exact this phase -- perfects on a later pass' : 'no exact this passage';
}

function aspectLabelFor(c, focusBody) {
  if (c.axisInvolved) return labelAxisContact(c.dist, focusBody === 'Nodes', c.point).label;
  return `${c.aspect} natal ${c.point.name}`;
}

// passageCounts must be the PASSAGE-scoped { n, m } from
// filterAndGroupForPassage (c.passagePassIndex/c.passagePassCount), never
// the row's own within-window crossing index (STEP 4).
function idFor(c, focusBody) {
  const passageCounts = { n: c.passagePassIndex, m: c.passagePassCount };
  if (c.axisInvolved) {
    const { kind } = labelAxisContact(c.dist, focusBody === 'Nodes', c.point);
    return mintAxisContactId(focusBody, kind, c.point.name, c, passageCounts);
  }
  return mintContactId(focusBody, c.aspect, c.point.name, c, passageCounts);
}

// ── Formatting helpers ────────────────────────────────────────────────────

// Includes the year: a phase can span a year boundary (the Nodes passage is
// ~19 months), and a same-body span can otherwise print as a false-looking
// duplicate -- e.g. the Sun's Pisces transit in 2025 and again in 2026 both
// read "Feb 19 - Mar 20" without a year to distinguish them.
function shortDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatCopresentNatal(matches) {
  if (matches.length === 0) return 'none';
  return matches.map(p => `${p.name} ${p.degree.toFixed(1)}° (${p.house ?? 'house unknown'})`).join(', ');
}

function formatCopresentSky(spansByBody, phaseStart, phaseEnd) {
  const entries = [];
  for (const [body, spans] of spansByBody) {
    for (const sp of spans) {
      const full = sp.start <= phaseStart && sp.end >= phaseEnd;
      entries.push(full ? `${body} (all phase)` : `${body} (${shortDate(sp.start)} – ${shortDate(sp.end)})`);
    }
  }
  return entries.length ? entries.join(', ') : 'none';
}

// ── Activation-fact rendering (STEP 6) ──────────────────────────────────
//
// An activation is a sky aspect that was effectively exact (within the 1
// degree band) while the host contact was in orb -- a deterministic form
// of the practitioner's trigger-transit judgment. DATE is the anchor:
// the day of closest approach within the shared span (ties resolve to
// the earlier day). When the sky aspect's own literal perfection falls
// outside the host contact's orb window, that's stated explicitly.

function formatActivationFact(fact) {
  const { id, otherBody, sky, anchorDate, perfectsOutsideHostOrb } = fact;
  const motionLine = `(${sky.body_1} ${sky.body_1_retrograde ? 'retrograde' : 'direct'}, ${sky.body_2} ${sky.body_2_retrograde ? 'retrograde' : 'direct'})`;
  const perfectionNote = sky.exact_date
    ? perfectsOutsideHostOrb
      ? `; perfects ${sky.exact_date}, after this contact separates`
      : `; perfects ${sky.exact_date}`
    : '; no exact in this window';
  const skyLine = `${otherBody} ${sky.event} the piece's planet, within 1° on ${anchorDate}${perfectionNote} ${motionLine}`;
  return (
`      - ID: ${id}
        BODY: ${otherBody}
        SKY_ASPECT: ${skyLine}
        DATE: ${anchorDate}`
  );
}

function formatEclipseTransitFact(fact) {
  return (
`      - ID: ${fact.id}
        ECLIPSE: ${fact.eclipse.event}, ${fact.eclipse.exact_date}, ${fact.eclipse.exact_degree.toFixed(1)}° ${fact.eclipse.body_1_sign}
        TRANSITING_POSITION: ${fact.focusDegree.toFixed(1)}° ${fact.focusSign} (${fact.end})
        DATE: ${fact.eclipse.exact_date}`
  );
}

// ── Main assembly ──────────────────────────────────────────────────────

async function assembleBrief(focusBody) {
  const { data: reading, error } = await supabase.from('readings').select('chart_data, birth_time_known, name').eq('slug', DOGFOOD_READING_SLUG).single();
  if (error || !reading) throw new Error(`Could not load reading: ${error?.message}`);
  const natalPoints = extractNatalPoints(reading.chart_data);
  const ascSign = natalPoints.find(p => p.name === 'Ascendant').sign;
  const risingKnown = reading.birth_time_known ?? true;

  const currentRow = await fetchCurrentPhaseRow(focusBody);
  const passageRows = await fetchPassageRows(focusBody, currentRow);
  const passage = describePassage(passageRows);
  const phaseStart = currentRow.date;
  const phaseEnd = currentRow.phase_end_date ?? passage.egressDate;

  const seriesBody = focusBody === 'Nodes' ? 'North Node' : focusBody;
  const series = await fetchFullSeries(seriesBody);
  const passageSign = focusBody === 'Nodes' ? currentRow.north_sign : currentRow.sign;

  // Raw (all-time, all-sign) contacts per natal point, sign-consonance
  // checked on every row (STEP 3 guard 1), then filtered down to THIS
  // passage occurrence (date range AND sign match -- see
  // filterAndGroupForPassage's header comment for why both are required)
  // and grouped by (point, aspect) for passage-scoped window/pass counts
  // (STEP 2 Bug A/B fix + STEP 4; STEP 3 guard 2 runs inside
  // filterAndGroupForPassage).
  const rawContactsByPoint = computeRawContactsByPoint(focusBody, series, natalPoints);
  const byAspectKey = new Map(); // "PointName|aspectKey" -> enriched rows, this passage only
  const passageContactsFlat = [];
  for (const [pointName, rows] of rawContactsByPoint) {
    const enriched = filterAndGroupForPassage(rows, passageSign, passage.ingressDate, passage.egressDate);
    for (const c of enriched) {
      const aspectKey = `${pointName}|${c.axisInvolved ? `axis-dist${c.dist}` : c.aspect}`;
      if (!byAspectKey.has(aspectKey)) byAspectKey.set(aspectKey, []);
      byAspectKey.get(aspectKey).push(c);
      passageContactsFlat.push(c);
    }
  }

  const timelineNatal = passageContactsFlat.filter(c =>
    contactAnchorDate(c) >= phaseStart && contactAnchorDate(c) <= phaseEnd,
  );
  const timelineNatalSet = new Set(timelineNatal);

  // ── Sky aspects: classify into SLOW-always-entries, FAST-activation-only,
  // FAST-atmospheric-entries. Also collect activation facts keyed by the
  // NATAL_CONTACT row they attach to.
  const skyRows = focusBody === 'Nodes' ? [] : await fetchAspectCalendarForBody(focusBody, phaseStart, phaseEnd);
  const skyContactEntries = [];
  const activationsByNatalRow = new Map(); // natalContact row -> [fact, ...]

  for (const sky of skyRows) {
    const otherBody = sky.body_1 === focusBody ? sky.body_2 : sky.body_1;
    if (otherBody === 'Moon') continue;
    const skyStart = sky.window_start ?? sky.exact_date;
    const skyEnd = sky.window_end ?? sky.exact_date;
    const slowPair = isSlowPair(focusBody, otherBody);

    // STEP 6: an activation qualifies iff the sky pair (focus body vs
    // otherBody -- no third natal-point contact required on otherBody's
    // side) comes within the 1-degree exact band at some point during a
    // host natal contact's own orb window.
    const facts = [];
    const focusOverlaps = timelineNatal.filter(c => windowOverlaps(c, skyStart, skyEnd));
    for (const fc of focusOverlaps) {
      const otherSeries = await fetchSeriesRange(otherBody, fc.windowStart, fc.windowEnd);
      const focusSlice = series.filter(r => r.date >= fc.windowStart && r.date <= fc.windowEnd);
      const anchorDate = findActivationAnchor(focusSlice, otherSeries, sky.event, fc.windowStart, fc.windowEnd);
      if (!anchorDate) continue;
      const perfectsOutsideHostOrb = !!sky.exact_date && (sky.exact_date < fc.windowStart || sky.exact_date > fc.windowEnd);
      const id = mintActivationId(sky.id, fc.point.name);
      facts.push({ natalContact: fc, fact: { id, otherBody, sky, anchorDate, perfectsOutsideHostOrb } });
    }

    if (slowPair) {
      skyContactEntries.push({ sky, otherBody, atmospheric: false });
    }
    if (facts.length > 0) {
      for (const f of facts) {
        if (!activationsByNatalRow.has(f.natalContact)) activationsByNatalRow.set(f.natalContact, []);
        activationsByNatalRow.get(f.natalContact).push(f.fact);
      }
    } else if (!slowPair) {
      skyContactEntries.push({ sky, otherBody, atmospheric: true });
    }
  }

  // ── Eclipse-to-transit activations (RULING 4): eclipses within the phase
  // whose degree is sign-consonant + within 3 deg of the focus body's OWN
  // position on eclipse day (either end of the lunation axis). Nodes piece
  // keeps its own full eclipse itinerary unchanged (not this mechanism).
  const eclipseFactsByEntry = new Map(); // entry (natal or sky row) -> [fact]
  const eclipsePhaseLevelFacts = [];
  if (focusBody !== 'Nodes') {
    const eclipses = await fetchEclipsesInRange(phaseStart, phaseEnd);
    for (const ec of eclipses) {
      const dayRow = series.find(r => r.date === ec.exact_date);
      if (!dayRow) continue;
      const pseudoPoint = [{ name: focusBody, isAxis: false, sign: dayRow.sign, degree: dayRow.sign_degree, house: null }];
      const catches = eclipseCatches(ec, pseudoPoint);
      if (catches.length === 0) continue;
      const id = mintEclipseTransitActivationId(ec.id, focusBody);
      const fact = { id, eclipse: ec, focusSign: dayRow.sign, focusDegree: dayRow.sign_degree, end: catches[0].end };
      // attach to the live entry (natal or sky) whose window contains eclipse date, else phase-level
      const liveNatal = timelineNatal.find(c => c.windowStart <= ec.exact_date && c.windowEnd >= ec.exact_date);
      const liveSky = skyContactEntries.find(e => (e.sky.window_start ?? e.sky.exact_date) <= ec.exact_date && (e.sky.window_end ?? e.sky.exact_date) >= ec.exact_date);
      if (liveNatal) {
        if (!eclipseFactsByEntry.has(liveNatal)) eclipseFactsByEntry.set(liveNatal, []);
        eclipseFactsByEntry.get(liveNatal).push(fact);
      } else if (liveSky) {
        if (!eclipseFactsByEntry.has(liveSky)) eclipseFactsByEntry.set(liveSky, []);
        eclipseFactsByEntry.get(liveSky).push(fact);
      } else {
        eclipsePhaseLevelFacts.push(fact);
      }
    }
  }

  // ── Render TIMELINE blocks ──
  const timelineBlocks = [];

  for (const c of timelineNatal) {
    const aspectKey = `${c.key}|${c.axisInvolved ? `axis-dist${c.dist}` : c.aspect}`;
    const siblings = byAspectKey.get(aspectKey);
    const activations = activationsByNatalRow.get(c) ?? [];
    const eclipseFacts = eclipseFactsByEntry.get(c) ?? [];
    const windowLine = c.passageWindowCount > 1 ? `\n    WINDOW: ${c.passageWindowIndex} of ${c.passageWindowCount} this passage` : '';
    const passLine = c.exactDate && c.passagePassCount > 1 ? `\n    PASS: ${c.passagePassIndex} of ${c.passagePassCount} this passage` : '';
    let block =
`  - ID: ${idFor(c, focusBody)}
    TYPE: NATAL_CONTACT
    ASPECT: ${c.axisInvolved ? aspectLabelFor(c, focusBody) : `${c.aspect} natal ${c.point.name} (${c.point.degree.toFixed(1)}° ${c.point.sign}, ${c.point.house ?? 'house unknown'})`}
    DATES: ${formatContactDates(c, phaseStart, phaseEnd)}${windowLine}${passLine}
    STATUS: ${computeStatus(c, phaseStart, phaseEnd, siblings)}`;
    if (activations.length) {
      block += `\n    ACTIVATIONS:\n${activations.map(formatActivationFact).join('\n')}`;
    }
    if (eclipseFacts.length) {
      block += `\n    ECLIPSE_ACTIVATIONS:\n${eclipseFacts.map(formatEclipseTransitFact).join('\n')}`;
    }
    timelineBlocks.push({ date: contactAnchorDate(c), text: block });
  }

  for (const entry of skyContactEntries) {
    const { sky, otherBody, atmospheric } = entry;
    const anchor = sky.exact_date ?? sky.window_start;
    const eclipseFacts = eclipseFactsByEntry.get(entry) ?? [];
    const skyDates = formatBoundaryDates(sky.window_start, sky.window_end, sky.exact_date, phaseStart, phaseEnd);
    const skyPassLine = sky.exact_date && sky.pass_m > 1 ? `\n    PASS: ${sky.pass_n} of ${sky.pass_m} this passage` : '';
    let block =
`  - ID: ${sky.id}
    TYPE: SKY_CONTACT
    ASPECT: ${sky.event === 'conjunction' ? 'conjunct' : sky.event} transiting ${otherBody}
    DATES: ${skyDates}${skyPassLine}
    STATUS: ${sky.exact_date ? 'perfects this phase' : 'no exact this phase'}${atmospheric ? '\n    TETHER: atmospheric -- no natal point caught' : ''}`;
    if (eclipseFacts.length) {
      block += `\n    ECLIPSE_ACTIVATIONS:\n${eclipseFacts.map(formatEclipseTransitFact).join('\n')}`;
    }
    timelineBlocks.push({ date: anchor, text: block });
  }

  timelineBlocks.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  // ── PASSAGE_CONTACTS (undated summary, outside this phase, within the
  // passage; grouped by point+aspect -- STEP 2 Bug B fix -- so a sextile
  // and a square to the same point can never be merged into one falsely-
  // summed line, and windows/passes are labeled and counted independently
  // per STEP 4). ──
  const passageContactsLines = [];
  for (const rows of byAspectKey.values()) {
    const outside = rows.filter(r => !timelineNatalSet.has(r));
    if (outside.length === 0) continue;
    const sample = outside[0];
    const label = sample.axisInvolved ? labelAxisContact(sample.dist, focusBody === 'Nodes', sample.point).label : `${sample.aspect} natal ${sample.point.name}`;
    const passCount = sample.passagePassCount ?? 0;
    const windowCount = sample.passageWindowCount;
    const windowNote = windowCount > 1 ? ` across ${windowCount} windows` : '';
    const passesText = passCount > 0 ? `${passCount} pass${passCount === 1 ? '' : 'es'}${windowNote} total this passage` : 'no exact this passage';
    passageContactsLines.push(`${label}, ${passesText}`);
  }

  // ── Copresence ──
  const natalCop = focusBody === 'Nodes'
    ? `North Node end: ${formatCopresentNatal(natalCopresence(currentRow.north_sign, natalPoints))}; South Node end: ${formatCopresentNatal(natalCopresence(currentRow.south_sign, natalPoints))}`
    : formatCopresentNatal(natalCopresence(currentRow.sign, natalPoints));

  const skySpans = new Map();
  for (const body of ALL_BODIES) {
    if (body === focusBody) continue;
    const otherSeries = await fetchSeriesRange(body, phaseStart, phaseEnd);
    const signsToCheck = focusBody === 'Nodes' ? [currentRow.north_sign, currentRow.south_sign] : [currentRow.sign];
    const spans = [];
    for (const sgn of signsToCheck) spans.push(...skyCopresenceSpans(otherSeries, sgn));
    if (spans.length) skySpans.set(body, spans);
  }
  const skyCop = formatCopresentSky(skySpans, phaseStart, phaseEnd);

  // ── Assemble the message ──
  const lines = [];
  if (focusBody === 'Nodes') {
    lines.push(`PLANET: Nodes`);
    lines.push(`AXIS: ${currentRow.north_sign} — ${currentRow.south_sign}`);
    if (risingKnown) lines.push(`HOUSES: North Node ${houseOfSign(currentRow.north_sign, ascSign)}, South Node ${houseOfSign(currentRow.south_sign, ascSign)}`);
    lines.push(`RISING_SIGN_KNOWN: ${risingKnown}`);
    lines.push('');
    lines.push('PASSAGE:');
    lines.push(`  INGRESS: ${passage.ingressDate}`);
    lines.push(`  EGRESS: ${passage.egressDate}`);
    lines.push(`  SHAPE: single phase -- the axis does not station`);
    lines.push('');
    lines.push('PHASE:');
    lines.push(`  INGRESS: ${passage.ingressDate}`);
    lines.push(`  EGRESS: ${passage.egressDate}`);
    lines.push('');
    lines.push(`COPRESENT_NATAL: ${natalCop}`);
    lines.push(`COPRESENT_SKY: ${skyCop}`);
    lines.push('');
    lines.push('TIMELINE:');
    timelineBlocks.forEach(b => lines.push(b.text));

    const eclipses = await fetchEclipsesInRange(passage.ingressDate, passage.egressDate);
    for (const e of eclipses) {
      const catches = eclipseCatches(e, natalPoints);
      const skyForEclipse = await fetchAspectCalendarForBody('Sun', e.exact_date, e.exact_date);
      const config = skyForEclipse.filter(s => s.id !== e.id && s.exact_date === e.exact_date).map(s => `${s.event} ${s.body_1 === 'Sun' ? s.body_2 : s.body_1}`).join(', ') || 'none';
      lines.push(
`  - TYPE: ECLIPSE
    ID: ${e.id}
    KIND: ${e.event === 'Solar Eclipse' ? 'solar' : 'lunar'}
    DATE: ${e.exact_date}
    POINT: ${e.exact_degree.toFixed(1)}° ${e.body_1_sign}${risingKnown ? `, ${houseOfSign(e.body_1_sign, ascSign)}` : ''}
    CONFIGURATION: ${config}
    NATAL_CAUGHT: ${catches.length ? catches.map(c => `${c.name} (${c.house ?? 'house unknown'}, ${c.end})`).join(', ') : 'none'}`);
    }
    lines.push('');
    lines.push('PASSAGE_CONTACTS: not used -- the single phase contains the whole passage');
  } else {
    lines.push(`PLANET: ${focusBody}`);
    lines.push(`SIGN: ${currentRow.sign}`);
    if (risingKnown) lines.push(`HOUSE: ${houseOfSign(currentRow.sign, ascSign)}`);
    lines.push(`RISING_SIGN_KNOWN: ${risingKnown}`);
    lines.push('');
    lines.push('PASSAGE:');
    lines.push(`  INGRESS: ${passage.ingressDate}, entering ${passage.ingressDirect ? 'direct' : 'retrograde'}`);
    lines.push(`  EGRESS: ${passage.egressDate}`);
    lines.push(`  SHAPE: ${passage.shape}`);
    lines.push('');
    lines.push('PHASE:');
    const motion = currentRow.event_type === 'station_retrograde' || currentRow.event_type === 'retro_ingress' ? 'RETROGRADE' : 'FORWARD';
    lines.push(`  MOTION: ${motion}`);
    lines.push(`  OPENED_BY: ${eventLabel(currentRow.event_type, currentRow.degree)} on ${currentRow.date}`);
    const closesRow = passageRows.find(r => r.date === phaseEnd) ?? null;
    const closesLabel = closesRow ? eventLabel(closesRow.event_type, closesRow.degree) : 'egress';
    lines.push(`  CLOSES: ${closesLabel} on ${phaseEnd}`);
    lines.push('');
    lines.push(`COPRESENT_NATAL: ${natalCop}`);
    lines.push(`COPRESENT_SKY: ${skyCop}`);
    lines.push('');
    lines.push('TIMELINE:');
    timelineBlocks.forEach(b => lines.push(b.text));
    lines.push('');
    lines.push(`PASSAGE_CONTACTS: ${passageContactsLines.length ? passageContactsLines.join('; ') : 'none beyond this phase'}`);
    if (eclipsePhaseLevelFacts.length) {
      lines.push('');
      lines.push('PHASE_LEVEL_ECLIPSE_ACTIVATIONS (no live entry to attach to this phase):');
      eclipsePhaseLevelFacts.forEach(f => lines.push(formatEclipseTransitFact(f)));
    }
  }

  const natalCount = timelineNatal.length;
  const skyCount = skyContactEntries.length;
  const activationCount = [...activationsByNatalRow.values()].reduce((s, a) => s + a.length, 0);
  const eclipseFactCount = [...eclipseFactsByEntry.values()].reduce((s, a) => s + a.length, 0) + eclipsePhaseLevelFacts.length;

  return { text: lines.join('\n'), counts: { natalCount, skyCount, activationCount, eclipseFactCount, totalEntries: natalCount + skyCount } };
}

async function main() {
  const arg = process.argv[2] ?? 'Saturn';
  const bodies = arg === 'all' ? ['Saturn', 'Mercury', 'Nodes'] : [arg];
  for (const focusBody of bodies) {
    if (!['Saturn', 'Mercury', 'Nodes'].includes(focusBody)) {
      throw new Error(`Unknown body ${focusBody}. Use Saturn, Mercury, Nodes, or all.`);
    }
    console.log(`\n${'='.repeat(78)}\nASSEMBLED CALL 1 INPUT -- ${focusBody}\n${'='.repeat(78)}\n`);
    const { text, counts } = await assembleBrief(focusBody);
    console.log(text);
    console.log(`\n[counts] entries: ${counts.totalEntries} (${counts.natalCount} NATAL_CONTACT, ${counts.skyCount} SKY_CONTACT); activation facts: ${counts.activationCount}; eclipse-to-transit facts: ${counts.eclipseFactCount}`);
    console.log(`\n${'='.repeat(78)}\nEnd of assembled brief for ${focusBody}. No API call made.\n${'='.repeat(78)}`);
  }
}

main().catch(err => {
  console.error(err.stack ?? err);
  process.exit(1);
});
