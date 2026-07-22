// Phase 3: assembles the Call 1 USER MESSAGE FORMAT block for one
// (chart, transiting body) pair, conformed field-for-field to the two
// authored format templates -- docs/brief-template-planet.md and
// docs/brief-template-nodes.md, the binding structural contract -- using
// engine-minted IDs from contact-engine.mjs.
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
//     wherever it also intersects a natal point; PLUS its own ACTIVATIONS
//     when a third body B reaches the 1-degree band with the piece's
//     planet while this pair's aspect is in orb AND B also aspects the
//     pair's other member (PAIR_ASPECT leg -- same two-leg shape as a
//     natal-contact activation, second leg's target swapped from a natal
//     point to the pair's other transiting member). B may itself be a
//     slow body already carrying its own SKY_CONTACT entry elsewhere in
//     the same brief -- expected, not a conflict.
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
  SIGNS, extractNatalPoints, computeContactWindows, contactAnchorDate,
  windowOverlaps, natalCopresence, skyCopresenceSpans, eclipseCatches,
  mintContactId, mintAxisContactId, labelAxisContact, houseOfSign,
  isSlowPair, SLOW_BODIES, mintActivationId, mintPairActivationId, mintEclipseTransitActivationId,
  assertSignConsonant, filterAndGroupForPassage, findActivationAnchor,
  computeShapeSegments,
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

// Used only to label what closes a phase (line label, falls back to a
// generic "egress" when nothing is found -- e.g. the trailing-edge case
// where phaseEnd itself is NULL).
async function fetchBodyRowAtDate(body, date) {
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('event_type, degree, sign').eq('body', body).eq('date', date).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Every transit_calendar row for a body across a passage's own bounds (any
// sign), used to build SHAPE's per-segment timeline -- see computeShapeSegments.
async function fetchBodyRowsInRange(body, start, end) {
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('date, event_type, sign, degree')
    .eq('body', body).gte('date', start).lte('date', end)
    .order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// Nodes row at a specific date, for SHAPE's single closing line (needs the
// incoming axis' sign pair, not just a single body's sign).
async function fetchNodesRowAtDate(date) {
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('north_sign, south_sign').eq('body', 'Nodes').eq('date', date).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function fetchAspectCalendarForBody(body, start, end) {
  const { data: d1, error: e1 } = await supabase.from('aspect_calendar').select('*').eq('body_1', body).lte('window_start', end).gte('window_end', start);
  if (e1) throw new Error(e1.message);
  const { data: d2, error: e2 } = await supabase.from('aspect_calendar').select('*').eq('body_2', body).lte('window_start', end).gte('window_end', start);
  if (e2) throw new Error(e2.message);
  return [...d1, ...d2];
}

// All aspect_calendar rows between one specific pair of bodies (either
// storage order) overlapping [start, end] -- used only for a sky-pair
// activation's PAIR_ASPECT leg (candidate B vs. the host pair's other
// member), never for focusBody's own aspects (fetchAspectCalendarForBody
// already covers those).
async function fetchAspectCalendarBetween(bodyA, bodyB, start, end) {
  const { data, error } = await supabase.from('aspect_calendar').select('*')
    .or(`and(body_1.eq.${bodyA},body_2.eq.${bodyB}),and(body_1.eq.${bodyB},body_2.eq.${bodyA})`)
    .lte('window_start', end).gte('window_end', start);
  if (error) throw new Error(error.message);
  return data;
}

async function fetchEclipsesInRange(start, end) {
  const { data, error } = await supabase.from('aspect_calendar').select('*')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse']).gte('exact_date', start).lte('exact_date', end)
    .order('exact_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// ── Passage description ───────────────────────────────────────────────
//
// Passage identity and bounds are now stored directly on every transit_
// calendar row (passage_id, passage_first_ingress_date, sign_egress_date
// -- the STEP 5 data fix), so currentRow alone answers "whose passage is
// this and what are its bounds." SHAPE is the one thing that still needs
// its own query, and deliberately does NOT use passage-membership rows:
// membership answers "whose passage is this row," shape answers "what
// happened during this span" -- an episode that occurs during two
// interleaved passages' shared overlap window (e.g. Saturn's one 2025
// retrograde loop between Aries and Pisces) is a true fact about BOTH of
// them, so it must be countable from each side even though the episode's
// own rows are stamped with only one of the two passage_ids.
//
// A passage's TRUE first ingress can only ever be a forward crossing
// (retrograde motion can only re-enter a sign the body has already
// forward-crossed into earlier -- it can never arrive first), so
// ingressDirect is always true when the first ingress is known at all. It
// is unknown (not false) for the rare case where currentRow's own passage
// is a pre-range one still open today (its true first ingress predates
// 2023-01-01) -- not currently true of Saturn, Mercury, or Nodes, but
// handled rather than left to crash if it ever is.

// SHAPE (planet variant): the structured per-segment timeline required by
// docs/brief-template-planet.md -- see computeShapeSegments. Nodes never
// station (mean node, constant retrograde motion) and is handled entirely
// separately in assembleBrief() (its own single-line SHAPE needs the
// incoming axis' sign pair, not a body-row sequence).
async function describePassage(currentRow) {
  const firstIngress = currentRow.passage_first_ingress_date;
  const finalEgress = currentRow.sign_egress_date;
  // Nodes' SHAPE is a single axis-aware line built separately in
  // assembleBrief() (it needs the incoming axis' sign pair, not a body-row
  // sequence) -- no station/ingress rows to walk here.
  if (currentRow.body === 'Nodes') {
    return { ingressDate: firstIngress, ingressDirect: firstIngress !== null ? true : null, egressDate: finalEgress, shape: null };
  }
  const shapeRangeStart = firstIngress ?? '2023-01-01';
  const shapeRows = await fetchBodyRowsInRange(currentRow.body, shapeRangeStart, finalEgress);
  const shape = computeShapeSegments(shapeRows, currentRow.sign);
  return {
    ingressDate: firstIngress,
    ingressDirect: firstIngress !== null ? true : null,
    egressDate: finalEgress,
    shape,
  };
}

// OPENED_BY vocabulary: ingress | re-ingress | retro-ingress | station
// retrograde | station direct -- whatever trigger row the piece's CURRENT
// phase actually opened with (always this sign's own passage, so
// retro-ingress is a real, expected case here, not just a SHAPE-only word).
function eventLabel(eventType, degree) {
  if (eventType === 'ingress') return 'ingress';
  if (eventType === 're_ingress') return 're-ingress';
  if (eventType === 'retro_ingress') return 'retro-ingress';
  if (eventType === 'station_retrograde') return `station retrograde at ${degree.toFixed(1)}°`;
  if (eventType === 'station_direct') return `station direct at ${degree.toFixed(1)}°`;
  return eventType;
}

// CLOSES: from the current phase's own sign, ANY departure -- a true
// forward egress or a backward retro-ingress dip alike -- reads uniformly
// as "egress to {sign}" (the template's own only CLOSES example uses this
// wording; "re-ingress" is an arrival word, and only ever names an
// OPENED_BY trigger, never a CLOSES one). No sign change means an in-sign
// station, named with degree as before.
function closesLabelFor(currentRow, closesRow) {
  if (!closesRow) return 'egress';
  if (closesRow.sign !== currentRow.sign) return `egress to ${closesRow.sign}`;
  if (closesRow.event_type === 'station_retrograde') return `station retrograde at ${closesRow.degree.toFixed(1)}°`;
  if (closesRow.event_type === 'station_direct') return `station direct at ${closesRow.degree.toFixed(1)}°`;
  return closesRow.event_type;
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

// SKY_CONTACT STATUS must derive from the same phase-boundary check DATES
// already uses -- previously it only checked "does an exact date exist at
// all," so a sky aspect whose exact date falls outside the phase (DATES
// correctly says "no exact this phase") could still say STATUS: perfects
// this phase, a real contradiction found in live output (a
// mercury-sextile-venus entry). Sky-sky aspects don't have "passage"
// semantics the way natal contacts do, so the wording stays the sky
// contact's own ("no exact this phase"), not computeStatus's natal phrasing.
function computeSkyStatus(sky, phaseStart, phaseEnd) {
  const exactInPhase = !!sky.exact_date && sky.exact_date >= phaseStart && sky.exact_date <= phaseEnd;
  return exactInPhase ? 'perfects this phase' : 'no exact this phase';
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

function formatCopresentNatal(matches, risingKnown) {
  if (matches.length === 0) return 'none';
  return matches.map(p => `${p.name} ${p.degree.toFixed(1)}°${risingKnown ? ` (${p.house ?? 'house unknown'})` : ''}`).join(', ');
}

function formatCopresentSky(spansByBody, phaseStart, phaseEnd) {
  const entries = [];
  for (const [body, spans] of spansByBody) {
    for (const sp of spans) {
      const label = sp.label ?? body;
      const full = sp.start <= phaseStart && sp.end >= phaseEnd;
      entries.push(full ? `${label} (all phase)` : `${label} (${shortDate(sp.start)} – ${shortDate(sp.end)})`);
    }
  }
  return entries.length ? entries.join(', ') : 'none';
}

// The transiting Nodes never appear in ALL_BODIES (they're computed from
// 'North Node' sky_positions rows, same as elsewhere in this file); South
// Node's sign is always the opposite sign, derived, never queried directly.
// Only used when focusBody itself isn't Nodes (checking the axis against
// itself is meaningless).
function nodesCopresenceSpans(northSeries, transitedSign) {
  const spans = [];
  let runStart = null, runEnd = null, runLabel = null;
  for (const row of northSeries) {
    const southSign = SIGNS[(SIGNS.indexOf(row.sign) + 6) % 12];
    const label = row.sign === transitedSign ? 'North Node' : southSign === transitedSign ? 'South Node' : null;
    if (label) {
      if (!runStart) { runStart = row.date; runLabel = label; }
      runEnd = row.date;
    } else if (runStart) {
      spans.push({ start: runStart, end: runEnd, label: runLabel });
      runStart = null;
    }
  }
  if (runStart) spans.push({ start: runStart, end: runEnd, label: runLabel });
  return spans;
}

// ── Activation-fact rendering (STEP 6) ──────────────────────────────────
//
// An activation is a sky aspect that was effectively exact (within the 1
// degree band) while the host contact was in orb -- a deterministic form
// of the practitioner's trigger-transit judgment. DATE is the anchor:
// the day of closest approach within the shared span (ties resolve to
// the earlier day). Every activation shows BOTH legs: SKY_ASPECT (the
// third body vs. the piece's planet) and NATAL_ASPECT (that same third
// body's own contact to the natal point being activated) -- per
// docs/brief-template-planet.md. When the sky aspect's own literal
// perfection falls outside the host contact's orb window, that's stated
// explicitly, directionally: "before this contact begins" when perfection
// precedes the host window opening, "after this contact separates" when
// it follows the close.

// Overlap test for raw aspect_calendar rows (snake_case window_start/
// window_end, falling back to exact_date same as skyStart/skyEnd
// elsewhere in this file) -- windowOverlaps() from contact-engine.mjs only
// accepts computeContactWindows' camelCase rows, not these.
function rawWindowOverlaps(row, startDate, endDate) {
  const s = row.window_start ?? row.exact_date;
  const e = row.window_end ?? row.exact_date;
  return s <= endDate && e >= startDate;
}

function formatActivationFact(fact) {
  const {
    id, otherBody, sky, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb,
    natalAspect, pointName, motionState,
  } = fact;
  const motionLine = `(${sky.body_1} ${sky.body_1_retrograde ? 'retrograde' : 'direct'}, ${sky.body_2} ${sky.body_2_retrograde ? 'retrograde' : 'direct'})`;
  const perfectionNote = sky.exact_date
    ? perfectsBeforeHostOrb
      ? `; perfects ${sky.exact_date}, before this contact begins`
      : perfectsAfterHostOrb
        ? `; perfects ${sky.exact_date}, after this contact separates`
        : `; perfects ${sky.exact_date}`
    : '; no exact in this window';
  const skyLine = `${otherBody} ${sky.event} the piece's planet, within 1° on ${anchorDate}${perfectionNote} ${motionLine}`;
  const natalLine = `${otherBody} ${natalAspect.aspect} natal ${pointName}, ${natalAspect.exactDate ? `exact ${natalAspect.exactDate}` : 'no exact'} (${otherBody} ${motionState})`;
  return (
`      - ID: ${id}
        BODY: ${otherBody}
        SKY_ASPECT: ${skyLine}
        NATAL_ASPECT: ${natalLine}
        DATE: ${anchorDate}`
  );
}

// ── Sky-pair activation rendering (slow-pair SKY_CONTACT ACTIVATIONS) ──
//
// A slow-pair SKY_CONTACT's own activation: a third body B that reached the
// 1-degree band with the piece's planet while the pair's aspect was in
// orb, AND itself aspects the pair's OTHER member. Same two-leg qualifying
// test as formatActivationFact's natal-contact activations, with the
// second leg's target swapped from a natal point to the pair's other
// transiting member -- so it carries PAIR_ASPECT instead of NATAL_ASPECT.
// Directional before/after-host-orb phrasing applies to SKY_ASPECT exactly
// as it does for natal activations; PAIR_ASPECT states its own exact date
// plainly, same as NATAL_ASPECT does.
function formatPairActivationFact(fact) {
  const {
    id, otherBody, sky, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb,
    pairAspect, hostOtherBody,
  } = fact;
  const motionLine = `(${sky.body_1} ${sky.body_1_retrograde ? 'retrograde' : 'direct'}, ${sky.body_2} ${sky.body_2_retrograde ? 'retrograde' : 'direct'})`;
  const perfectionNote = sky.exact_date
    ? perfectsBeforeHostOrb
      ? `; perfects ${sky.exact_date}, before this pair's aspect begins`
      : perfectsAfterHostOrb
        ? `; perfects ${sky.exact_date}, after this pair's aspect separates`
        : `; perfects ${sky.exact_date}`
    : '; no exact in this window';
  const skyLine = `${otherBody} ${sky.event} the piece's planet, within 1° on ${anchorDate}${perfectionNote} ${motionLine}`;
  const motionOf = (row, body) => ((body === row.body_1 ? row.body_1_retrograde : row.body_2_retrograde) ? 'retrograde' : 'direct');
  const pairLine = `${otherBody} ${pairAspect.event} ${hostOtherBody}, ${pairAspect.exact_date ? `exact ${pairAspect.exact_date}` : 'no exact'} (${otherBody} ${motionOf(pairAspect, otherBody)}, ${hostOtherBody} ${motionOf(pairAspect, hostOtherBody)})`;
  return (
`      - ID: ${id}
        BODY: ${otherBody}
        SKY_ASPECT: ${skyLine}
        PAIR_ASPECT: ${pairLine}
        DATE: ${anchorDate}`
  );
}

// Shared by both the Nodes piece's own ECLIPSE entries and the planet
// variant's ECLIPSE_ACTIVATION entries: "conjunct"/"opposite the eclipse
// degree" per which end of the lunation axis caught the point; an end with
// nothing caught is omitted rather than stated as empty.
function formatNatalCaughtField(catches, risingKnown) {
  if (catches.length === 0) return 'none';
  return catches
    .map(c => `${c.name} (${c.degree.toFixed(1)}° ${c.sign}${risingKnown && c.house ? `, ${c.house}` : ''}) ${c.end === 'same sign as eclipse' ? 'conjunct' : 'opposite'} the eclipse degree`)
    .join('; ');
}

// A standalone TIMELINE entry (TYPE: ECLIPSE_ACTIVATION) for a non-Nodes
// piece: an eclipse landing within 3 deg of the piece's planet on eclipse
// day. NATAL_CAUGHT here checks ALL 13 natal points (not just the focus
// body) against the eclipse degree.
function formatEclipseActivationEntry(entry) {
  const { id, eclipse, catches, risingKnown, house } = entry;
  const houseText = risingKnown ? `, ${house}` : '';
  return (
`  - ID: ${id}
    TYPE: ECLIPSE_ACTIVATION
    ECLIPSE: ${eclipse.event}, ${eclipse.exact_date}, ${eclipse.exact_degree.toFixed(1)}° ${eclipse.body_1_sign}${houseText}
    DATES: eclipse falls within 3° of the piece's planet on ${eclipse.exact_date}
    NATAL_CAUGHT: ${formatNatalCaughtField(catches, risingKnown)}`
  );
}

// ── Main assembly ──────────────────────────────────────────────────────

export async function assembleBrief(focusBody) {
  const { data: reading, error } = await supabase.from('readings').select('chart_data, birth_time_known, name').eq('slug', DOGFOOD_READING_SLUG).single();
  if (error || !reading) throw new Error(`Could not load reading: ${error?.message}`);
  const natalPoints = extractNatalPoints(reading.chart_data);
  const ascSign = natalPoints.find(p => p.name === 'Ascendant').sign;
  const risingKnown = reading.birth_time_known ?? true;
  // Unknown birth time: natal Moon CONTACTS are excluded entirely (its
  // degree is uncertain by more than the active orb) -- SPEC.md 3.5. This
  // scopes only the contact/timeline computation; copresence (sign-level,
  // no degree precision needed) is unaffected.
  const contactNatalPoints = risingKnown ? natalPoints : natalPoints.filter(p => p.name !== 'Moon');

  const currentRow = await fetchCurrentPhaseRow(focusBody);
  const passage = await describePassage(currentRow);
  const phaseStart = currentRow.date;
  const phaseEnd = currentRow.phase_end_date ?? passage.egressDate;
  // Edge case (not currently true of Saturn/Mercury/Nodes): if currentRow's
  // own passage is still a pre-range one, its true first ingress predates
  // the data and passage.ingressDate is NULL. Bound date-range filtering at
  // the data's own start rather than passing NULL through -- "we have no
  // evidence of anything before this" is the honest boundary substitute.
  const passageIngressForFiltering = passage.ingressDate ?? '2023-01-01';

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
  const rawContactsByPoint = computeRawContactsByPoint(focusBody, series, contactNatalPoints);
  const byAspectKey = new Map(); // "PointName|aspectKey" -> enriched rows, this passage only
  const passageContactsFlat = [];
  for (const [pointName, rows] of rawContactsByPoint) {
    const enriched = filterAndGroupForPassage(rows, passageSign, passageIngressForFiltering, passage.egressDate);
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

    // STEP 6, corrected: an activation still requires BOTH legs -- (A)
    // otherBody has its own contact to the SAME natal point, overlapping
    // the host contact's window (unchanged from the old CONFIGURATION
    // rule); AND (B) the sky pair reaches the 1-degree exact band at some
    // point during the host contact's own orb window (this is what STEP 6
    // actually replaces -- the old blunt "sky window overlaps host window"
    // date-range test, upgraded to real exactness). An earlier version of
    // this code dropped leg A entirely (sky-proximity alone); that was a
    // mistake, caught in review, fixed here.
    const facts = [];
    const focusOverlaps = timelineNatal.filter(c => windowOverlaps(c, skyStart, skyEnd));
    for (const fc of focusOverlaps) {
      const otherSeries = await fetchSeriesRange(otherBody, fc.windowStart, fc.windowEnd);
      const otherRows = computeContactWindows(otherSeries, fc.point, fc.point.isAxis);
      const otherOwnContact = otherRows.find(oc =>
        windowOverlaps(oc, skyStart, skyEnd) && windowOverlaps(oc, fc.windowStart, fc.windowEnd));
      if (!otherOwnContact) continue; // leg A

      const focusSlice = series.filter(r => r.date >= fc.windowStart && r.date <= fc.windowEnd);
      const anchorDate = findActivationAnchor(focusSlice, otherSeries, sky.event, fc.windowStart, fc.windowEnd);
      if (!anchorDate) continue; // leg B

      const perfectsBeforeHostOrb = !!sky.exact_date && sky.exact_date < fc.windowStart;
      const perfectsAfterHostOrb = !!sky.exact_date && sky.exact_date > fc.windowEnd;
      const id = mintActivationId(sky.id, fc.point.name);
      // NATAL_ASPECT's motion state: otherBody's own state at ITS aspect's
      // exact date when it perfects, else at the activation's anchor date
      // (the only concrete reference point a no-exact contact has).
      const motionRefDate = otherOwnContact.exactDate ?? anchorDate;
      const motionRow = otherSeries.find(r => r.date === motionRefDate);
      const motionState = motionRow ? (motionRow.retrograde ? 'retrograde' : 'direct') : 'unknown';
      facts.push({
        natalContact: fc,
        fact: {
          id, otherBody, sky, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb,
          natalAspect: otherOwnContact, pointName: fc.point.name, motionState,
        },
      });
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

  // ── Sky-pair activations: a slow-pair SKY_CONTACT's own ACTIVATIONS.
  // A third body B activates the pair when (leg 1) B reaches the 1-degree
  // band with the piece's planet while the pair's own aspect is in orb,
  // AND (leg 2) B has its own aspect to the pair's OTHER member, that
  // aspect's window overlapping both B's activating window and the host
  // pair's own window -- the identical two-leg shape as the natal-contact
  // activations above, second leg's target swapped from a natal point to
  // the pair's other transiting member (PAIR_ASPECT, not NATAL_ASPECT).
  // Every skyRows entry (Moon already excluded) is a candidate B; B may
  // itself be a slow-pair host elsewhere in this same brief -- that is
  // expected, not a conflict (facts repeat where relevant; entries never
  // duplicate).
  const slowPairHosts = skyContactEntries.filter(e => !e.atmospheric && isSlowPair(focusBody, e.otherBody));
  const candidateSkyRows = skyRows.filter(s => (s.body_1 === focusBody ? s.body_2 : s.body_1) !== 'Moon')
    .map(s => ({ sky: s, otherBody: s.body_1 === focusBody ? s.body_2 : s.body_1 }));
  const pairActivationsByHostId = new Map(); // host sky.id -> [fact, ...]

  for (const host of slowPairHosts) {
    const hostStart = host.sky.window_start ?? host.sky.exact_date;
    const hostEnd = host.sky.window_end ?? host.sky.exact_date;
    const focusSliceH = series.filter(r => r.date >= hostStart && r.date <= hostEnd);

    for (const cand of candidateSkyRows) {
      const candB = cand.otherBody;
      if (candB === host.otherBody) continue; // must be a THIRD body, not the pair's own other member
      const candSky = cand.sky;

      const candSeriesOverHost = await fetchSeriesRange(candB, hostStart, hostEnd);
      const anchorDate = findActivationAnchor(focusSliceH, candSeriesOverHost, candSky.event, hostStart, hostEnd);
      if (!anchorDate) continue; // leg 1

      const candStart = candSky.window_start ?? candSky.exact_date;
      const candEnd = candSky.window_end ?? candSky.exact_date;
      const rangeStart = candStart < hostStart ? candStart : hostStart;
      const rangeEnd = candEnd > hostEnd ? candEnd : hostEnd;
      const pairRows = await fetchAspectCalendarBetween(candB, host.otherBody, rangeStart, rangeEnd);
      const pairAspect = pairRows.find(r => rawWindowOverlaps(r, candStart, candEnd) && rawWindowOverlaps(r, hostStart, hostEnd));
      if (!pairAspect) continue; // leg 2

      const perfectsBeforeHostOrb = !!candSky.exact_date && candSky.exact_date < hostStart;
      const perfectsAfterHostOrb = !!candSky.exact_date && candSky.exact_date > hostEnd;
      const id = mintPairActivationId(candSky.id, host.sky.id);
      const fact = {
        id, otherBody: candB, sky: candSky, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb,
        pairAspect, hostOtherBody: host.otherBody,
      };
      if (!pairActivationsByHostId.has(host.sky.id)) pairActivationsByHostId.set(host.sky.id, []);
      pairActivationsByHostId.get(host.sky.id).push(fact);
    }
  }

  // ── Eclipse-to-transit entries (RULING 4): eclipses within the phase
  // whose degree is sign-consonant + within 3 deg of the focus body's OWN
  // position on eclipse day (either end of the lunation axis) become their
  // own standalone TIMELINE entries (TYPE: ECLIPSE_ACTIVATION), sorted into
  // the timeline like anything else -- never nested inside another entry.
  // Nodes piece keeps its own full eclipse itinerary unchanged (not this
  // mechanism).
  const eclipseActivationEntries = [];
  if (focusBody !== 'Nodes') {
    const eclipses = await fetchEclipsesInRange(phaseStart, phaseEnd);
    for (const ec of eclipses) {
      const dayRow = series.find(r => r.date === ec.exact_date);
      if (!dayRow) continue;
      const pseudoPoint = [{ name: focusBody, isAxis: false, sign: dayRow.sign, degree: dayRow.sign_degree, house: null }];
      const focusCatches = eclipseCatches(ec, pseudoPoint);
      if (focusCatches.length === 0) continue;
      const id = mintEclipseTransitActivationId(ec.id, focusBody);
      const catches = eclipseCatches(ec, natalPoints);
      eclipseActivationEntries.push({
        id, eclipse: ec, catches, risingKnown, house: houseOfSign(ec.body_1_sign, ascSign),
      });
    }
  }

  // ── Render TIMELINE blocks ──
  const timelineBlocks = [];
  const showWindowPass = focusBody !== 'Nodes'; // Nodes' single non-stationing passage makes every axis contact a single pass -- no WINDOW/PASS lines ever (per docs/brief-template-nodes.md)

  for (const c of timelineNatal) {
    const aspectKey = `${c.key}|${c.axisInvolved ? `axis-dist${c.dist}` : c.aspect}`;
    const siblings = byAspectKey.get(aspectKey);
    const activations = activationsByNatalRow.get(c) ?? [];
    const windowLine = showWindowPass ? `\n    WINDOW: ${c.passageWindowIndex} of ${c.passageWindowCount} this passage` : '';
    const passLine = showWindowPass
      ? `\n    PASS: ${c.exactDate ? `${c.passagePassIndex} of ${c.passagePassCount} this passage` : '(none this window)'}`
      : '';
    const houseText = risingKnown ? `, ${c.point.house ?? 'house unknown'}` : '';
    let block =
`  - ID: ${idFor(c, focusBody)}
    TYPE: NATAL_CONTACT
    ASPECT: ${c.axisInvolved ? aspectLabelFor(c, focusBody) : `${c.aspect} natal ${c.point.name} (${c.point.degree.toFixed(1)}° ${c.point.sign}${houseText})`}
    DATES: ${formatContactDates(c, phaseStart, phaseEnd)}${windowLine}${passLine}
    STATUS: ${computeStatus(c, phaseStart, phaseEnd, siblings)}`;
    if (activations.length) {
      block += `\n    ACTIVATIONS:\n${activations.map(formatActivationFact).join('\n')}`;
    }
    timelineBlocks.push({ date: contactAnchorDate(c), text: block });
  }

  for (const entry of skyContactEntries) {
    const { sky, otherBody, atmospheric } = entry;
    const anchor = sky.exact_date ?? sky.window_start;
    const skyDates = formatBoundaryDates(sky.window_start, sky.window_end, sky.exact_date, phaseStart, phaseEnd);
    const skyPassLine = sky.exact_date && sky.pass_m > 1 ? `\n    PASS: ${sky.pass_n} of ${sky.pass_m} this passage` : '';
    let block =
`  - ID: ${sky.id}
    TYPE: SKY_CONTACT
    ASPECT: ${sky.event === 'conjunction' ? 'conjunct' : sky.event} transiting ${otherBody}
    DATES: ${skyDates}${skyPassLine}
    STATUS: ${computeSkyStatus(sky, phaseStart, phaseEnd)}${atmospheric ? '\n    TETHER: atmospheric -- no natal point caught' : ''}`;
    const pairActivations = pairActivationsByHostId.get(sky.id) ?? [];
    if (pairActivations.length) {
      block += `\n    ACTIVATIONS:\n${pairActivations.map(formatPairActivationFact).join('\n')}`;
    }
    timelineBlocks.push({ date: anchor, text: block });
  }

  for (const entry of eclipseActivationEntries) {
    timelineBlocks.push({ date: entry.eclipse.exact_date, text: formatEclipseActivationEntry(entry) });
  }

  timelineBlocks.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  // ── Copresence ──
  // COPRESENT_NATAL doesn't exist for the Nodes variant at all (per
  // docs/brief-template-nodes.md) -- the axis-to-natal relationship is
  // carried entirely by timeline contacts instead.
  const natalCop = focusBody === 'Nodes' ? null : formatCopresentNatal(natalCopresence(currentRow.sign, natalPoints), risingKnown);

  const skySpans = new Map();
  for (const body of ALL_BODIES) {
    if (!SLOW_BODIES.has(body) || body === focusBody) continue;
    const otherSeries = await fetchSeriesRange(body, phaseStart, phaseEnd);
    const signsToCheck = focusBody === 'Nodes' ? [currentRow.north_sign, currentRow.south_sign] : [currentRow.sign];
    const spans = [];
    for (const sgn of signsToCheck) spans.push(...skyCopresenceSpans(otherSeries, sgn));
    if (spans.length) skySpans.set(body, spans);
  }
  if (focusBody !== 'Nodes') {
    const nodeSeries = await fetchSeriesRange('North Node', phaseStart, phaseEnd);
    const nodeSpans = nodesCopresenceSpans(nodeSeries, currentRow.sign);
    if (nodeSpans.length) skySpans.set('Nodes', nodeSpans);
  }
  const skyCop = formatCopresentSky(skySpans, phaseStart, phaseEnd);

  // ── Assemble the message ──
  const lines = [];
  if (focusBody === 'Nodes') {
    const nextNodesRow = await fetchNodesRowAtDate(passage.egressDate);
    lines.push(`PLANET: Nodes`);
    lines.push(`AXIS: North Node ${currentRow.north_sign} — South Node ${currentRow.south_sign}`);
    if (risingKnown) lines.push(`HOUSES: North Node ${houseOfSign(currentRow.north_sign, ascSign)}, South Node ${houseOfSign(currentRow.south_sign, ascSign)}`);
    lines.push(`RISING_SIGN_KNOWN: ${risingKnown}`);
    lines.push('');
    lines.push('PASSAGE:');
    lines.push(`  INGRESS: ${passage.ingressDate}`);
    lines.push(`  EGRESS: ${passage.egressDate}`);
    lines.push('  SHAPE:');
    lines.push(`    - ingress ${passage.ingressDate}, closed by egress to North Node ${nextNodesRow.north_sign} / South Node ${nextNodesRow.south_sign} on ${passage.egressDate}`);
    lines.push('');
    lines.push('PHASE:');
    lines.push(`  INGRESS: ${passage.ingressDate}`);
    lines.push(`  EGRESS: ${passage.egressDate}`);
    lines.push('');
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
    NATAL_CAUGHT: ${formatNatalCaughtField(catches, risingKnown)}`);
    }
  } else {
    lines.push(`PLANET: ${focusBody}`);
    lines.push(`SIGN: ${currentRow.sign}`);
    if (risingKnown) lines.push(`HOUSE: ${houseOfSign(currentRow.sign, ascSign)}`);
    lines.push(`RISING_SIGN_KNOWN: ${risingKnown}`);
    lines.push('');
    lines.push('PASSAGE:');
    const ingressPhrase = passage.ingressDate !== null
      ? passage.ingressDate
      : 'predates tracked data (before 2023-01-01), direction unknown';
    lines.push(`  INGRESS: ${ingressPhrase}`);
    lines.push(`  EGRESS: ${passage.egressDate}`);
    if (passage.shape.length <= 1) {
      lines.push(`  SHAPE: ${passage.shape[0] ?? ''}`);
    } else {
      lines.push('  SHAPE:');
      passage.shape.forEach(seg => lines.push(`    - ${seg}`));
    }
    lines.push('');
    lines.push('PHASE:');
    const motion = currentRow.event_type === 'station_retrograde' || currentRow.event_type === 'retro_ingress' ? 'RETROGRADE' : 'FORWARD';
    lines.push(`  MOTION: ${motion}`);
    lines.push(`  OPENED_BY: ${eventLabel(currentRow.event_type, currentRow.degree)} on ${currentRow.date}`);
    const closesRow = phaseEnd ? await fetchBodyRowAtDate(focusBody, phaseEnd) : null;
    lines.push(`  CLOSES: ${closesLabelFor(currentRow, closesRow)} on ${phaseEnd}`);
    lines.push('');
    lines.push(`COPRESENT_NATAL: ${natalCop}`);
    lines.push(`COPRESENT_SKY: ${skyCop}`);
    lines.push('');
    lines.push('TIMELINE:');
    timelineBlocks.forEach(b => lines.push(b.text));
  }

  const natalCount = timelineNatal.length;
  const skyCount = skyContactEntries.length;
  // "activation facts" is a single combined count in the template's
  // [counts] line -- natal-contact activations and sky-pair activations
  // are the same fact category (a third body B caught at the 1-degree
  // band), just attached to different host entry types.
  const natalActivationCount = [...activationsByNatalRow.values()].reduce((s, a) => s + a.length, 0);
  const pairActivationCount = [...pairActivationsByHostId.values()].reduce((s, a) => s + a.length, 0);
  const activationCount = natalActivationCount + pairActivationCount;
  const eclipseFactCount = eclipseActivationEntries.length;

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

// Guard against running on import: certify-calendars.mjs imports
// assembleBrief() as a library function, and without this guard the mere
// act of importing this module would also print a full brief to stdout
// (main() ran unconditionally). Only run when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err.stack ?? err);
    process.exit(1);
  });
}
