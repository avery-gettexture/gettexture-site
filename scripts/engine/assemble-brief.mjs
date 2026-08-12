// Phase 3: assembles the Call 1 USER MESSAGE FORMAT block for one
// (chart, transiting body) pair, conformed field-for-field to the two
// authored format templates -- docs/brief-template-planet.md and
// docs/brief-template-nodes.md, the binding structural contract -- using
// engine-minted IDs from contact-engine.mjs.
//
// STAGE 2 (SPEC.md §11A.11): computation mints the structured records
// matching the Stage 1 table shapes (reading_transit_contacts,
// reading_natal_activations, reading_eclipse_catches, sky_pair_activations,
// eclipse_transiting_catches) as first-class in-memory objects, ONCE, via
// the pure builders in structured-records.mjs -- this file now reads and
// stringifies those records into brief text rather than computing facts
// inline as it renders. No table is written to here; that's Stage 3.
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
  SIGNS, extractNatalPoints, computeContactWindows,
  windowOverlaps, natalCopresence, skyCopresenceSpans, eclipseCatches,
  eclipseAnchorSign, labelAxisContact, houseOfSign,
  isSlowPair, SLOW_BODIES, findActivationAnchor,
  assertSignConsonant, filterAndGroupForPassage,
  computeShapeSegments, skyWindowPassageIndex,
} from './contact-engine.mjs';
import {
  buildTransitContactRecord, buildNatalActivationRecord, buildEclipseCatchRecord,
  buildSkyPairActivationRecord, buildEclipseTransitingCatchRecord,
} from './structured-records.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const DOGFOOD_READING_SLUG = 'hejkhjq1zns5';
const TODAY = new Date().toISOString().slice(0, 10);
const ALL_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const PAGE_SIZE = 1000;

// Render-time reverse lookup, the inverse of labelAxisContact's own dist ->
// kind branching (contact-engine.mjs) -- lets rendering reconstruct which
// branch to print from a record's stored axis_kind without also having to
// carry the numeric dist as a non-schema field.
const AXIS_KIND_TO_DIST = { 'conjunct-node-north': 0, 'square-node-axis': 3, 'conjunct-node-south': 6 };

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

// All aspect_calendar rows (ALL time, not phase-scoped) for one specific
// pair+event -- used only for GAP 3's WINDOW computation, which needs the
// full "aspect passage" (can span years for the slowest pairs) to count
// distinct orb-engagement windows within it, mirroring how pass_n/pass_m
// were computed at the data layer (see skyWindowPassageIndex).
async function fetchAspectCalendarForPairEvent(bodyA, bodyB, event) {
  const { data, error } = await supabase.from('aspect_calendar').select('*')
    .or(`and(body_1.eq.${bodyA},body_2.eq.${bodyB}),and(body_1.eq.${bodyB},body_2.eq.${bodyA})`)
    .eq('event', event);
  if (error) throw new Error(error.message);
  return data;
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

async function fetchCurrentPhaseRow(body, referenceDate) {
  const { data, error } = await supabase
    .from('transit_calendar')
    .select('*').eq('body', body).lte('date', referenceDate)
    .order('date', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error(`No transit_calendar row for ${body} at or before ${referenceDate}`);
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

// RULING A companion clause applies here too: `end` is always a phase/
// passage-close boundary (phaseEnd, or a Nodes passage's egressDate) --
// an eclipse landing exactly on that date belongs to the next phase or
// passage, which opens then, so `end` is exclusive.
async function fetchEclipsesInRange(start, end) {
  const { data, error } = await supabase.from('aspect_calendar').select('*')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse']).gte('exact_date', start).lt('exact_date', end)
    .order('exact_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

// CONFIGURATION (Nodes ECLIPSE entry only): the eclipsed body's own real
// aspects, read from eclipse_aspects (SPEC.md §11A.9) -- replaces the old
// homemade Sun-only computation, which was wrong for lunar eclipses.
async function fetchEclipseAspects(eclipseId) {
  const { data, error } = await supabase.from('eclipse_aspects').select('*').eq('eclipse_id', eclipseId);
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

// MOTION: FORWARD for an ingress/re-ingress/station-direct opening (the
// body is moving forward as this phase begins), RETROGRADE for a station-
// retrograde/retro-ingress opening. Explicit lookup with a throwing
// default (STEP D) rather than the previous "RETROGRADE if X or Y, else
// FORWARD" ternary, which would have silently mis-called FORWARD for any
// event_type it didn't recognize.
function motionForOpeningEvent(eventType) {
  if (eventType === 'station_retrograde' || eventType === 'retro_ingress') return 'RETROGRADE';
  if (eventType === 'ingress' || eventType === 're_ingress' || eventType === 'station_direct') return 'FORWARD';
  throw new Error(`motionForOpeningEvent: unrecognized event_type "${eventType}"`);
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
  // STEP D: an OPENED_BY trigger outside the five known event types is a
  // real data/schema problem, not a value this function can safely render
  // -- printing the raw string would be a plausible-looking guess at
  // vocabulary the template never defined.
  throw new Error(`eventLabel: unrecognized event_type "${eventType}" -- not one of ingress | re_ingress | retro_ingress | station_retrograde | station_direct`);
}

// CLOSES: from the current phase's own sign, ANY departure -- a true
// forward egress or a backward retro-ingress dip alike -- reads uniformly
// as "egress to {sign}" (the template's own only CLOSES example uses this
// wording; "re-ingress" is an arrival word, and only ever names an
// OPENED_BY trigger, never a CLOSES one). No sign change means an in-sign
// station, named with degree as before.
function closesLabelFor(currentRow, phaseEnd, closesRow) {
  // No known phase-end date at all (the rare open-ended pre-range/post-
  // range edge case) is a legitimate "we don't know yet" state -- the
  // plain 'egress' fallback is honest here, not a guess.
  if (!phaseEnd) return 'egress';
  // phaseEnd names a real date, so a missing row at that date is a data
  // problem (this phase's own closing trigger should always exist in
  // transit_calendar), not a legitimate unknown -- throw rather than
  // silently reusing the same 'egress' text for a different situation.
  if (!closesRow) {
    throw new Error(`closesLabelFor: no transit_calendar row for ${currentRow.body} at phase-close date ${phaseEnd}`);
  }
  if (closesRow.sign !== currentRow.sign) return `egress to ${closesRow.sign}`;
  if (closesRow.event_type === 'station_retrograde') return `station retrograde at ${closesRow.degree.toFixed(1)}°`;
  if (closesRow.event_type === 'station_direct') return `station direct at ${closesRow.degree.toFixed(1)}°`;
  throw new Error(`closesLabelFor: unrecognized in-sign event_type "${closesRow.event_type}" closing ${currentRow.body}'s phase`);
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

// RULING A (companion clause): an exact date landing exactly ON a phase
// boundary belongs to the phase that OPENS on that date, never the phase
// that closes on it -- consistent with the half-open current-phase lookup
// elsewhere (date <= today < phase_end_date). So phaseEnd itself is
// EXCLUSIVE here: a date equal to phaseEnd belongs to the next phase,
// which opens then. phaseStart stays inclusive (this phase owns its own
// opening date). Shared by every exact-date-based phase-membership check
// in this file (natal contacts' STATUS/DATES, sky contacts' STATUS/DATES,
// and the natal timeline membership filter) so all four agree.
function exactBelongsToPhase(exactDate, phaseStart, phaseEnd) {
  return !!exactDate && exactDate >= phaseStart && exactDate < phaseEnd;
}

// A structured contact record's relevant date for phase/passage
// membership: exact_date if it perfects, otherwise window_start -- the
// snake_case-field counterpart of contact-engine.mjs's contactAnchorDate,
// which reads the camelCase fields of a raw (pre-record) contact row.
function recordAnchorDate(record) {
  return record.exact_date ?? record.window_start;
}

// Boundary dates are always stated (STEP 7): a contact already in orb
// when the phase opens states its true original open date even though
// that date precedes phaseStart; a contact still in orb at phase close
// states that explicitly, even when it also perfected in-phase.
function formatBoundaryDates(windowStart, windowEnd, exactDate, phaseStart, phaseEnd) {
  const exactInPhase = exactBelongsToPhase(exactDate, phaseStart, phaseEnd);
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

function formatContactDates(record, phaseStart, phaseEnd) {
  return formatBoundaryDates(record.window_start, record.window_end, record.exact_date, phaseStart, phaseEnd);
}

// GUARD (added after the cusp-seam crossing-detection fix, SPEC.md's
// July 21, 2026 entry): a COMPLETE passage -- one with a known ingress AND
// a known egress, both within tracked sky_positions data -- traverses
// every degree 0-30 of its sign, so any natal point within orb during it
// MUST perfect at the matching degree, now that crossing detection
// actually catches it. "No exact this passage" is therefore proven
// structurally impossible for a complete passage; the only honest way
// this branch can still fire is a genuinely RANGE-TRUNCATED passage (a
// pre-range passage whose true start predates 2023-01-01, or one whose
// true egress falls beyond the tracked data's end) -- in those cases the
// text is a real "we don't know," not a bug. If a complete passage ever
// reaches this branch, that is a real bug wearing plausible output, not a
// value this function can safely render -- throw loudly rather than
// silently emit undocumented behavior.
function computeStatus(record, phaseStart, phaseEnd, siblingRecords, passageIsComplete) {
  const exactInPhase = exactBelongsToPhase(record.exact_date, phaseStart, phaseEnd);
  if (exactInPhase) return 'perfects this phase';
  const hasLaterExact = siblingRecords.some(r => r !== record && r.exact_date);
  if (hasLaterExact) return 'no exact this phase -- perfects on a later pass';
  if (passageIsComplete) {
    throw new Error(
      `computeStatus: "no exact this passage" reached for a COMPLETE passage (${record.natal_point ?? '?'} ${record.aspect ?? ''}) -- `
      + 'proven structurally impossible; a complete passage traverses every degree of its sign, so this natal point must perfect. Investigate before rendering.',
    );
  }
  return 'no exact this passage';
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
  const exactInPhase = exactBelongsToPhase(sky.exact_date, phaseStart, phaseEnd);
  return exactInPhase ? 'perfects this phase' : 'no exact this phase';
}

// ASPECT label for a reading_transit_contacts record. Axis-involved rows
// reconstruct the numeric dist labelAxisContact branches on from the
// record's own stored axis_kind (AXIS_KIND_TO_DIST) rather than carrying
// dist as an extra non-schema field, and pass a minimal synthetic natal-
// point object ({isAxis, name}) built from the record's own natal_point/
// axis_involved fields -- everything labelAxisContact needs is already on
// the record under its schema names.
function aspectLabelFor(record, focusBody) {
  if (record.axis_involved) {
    const dist = AXIS_KIND_TO_DIST[record.axis_kind];
    const natalPoint = { isAxis: record.natal_point === 'Axis', name: record.natal_point };
    return labelAxisContact(dist, focusBody === 'Nodes', natalPoint).label;
  }
  return `${record.aspect} natal ${record.natal_point}`;
}

// ── Formatting helpers ────────────────────────────────────────────────────

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
      entries.push(full ? `${label} (all phase)` : `${label} (${sp.start} – ${sp.end})`);
    }
  }
  return entries.length ? entries.join(', ') : 'none';
}

// Nodes-variant COPRESENT_SKY only (docs/brief-template-nodes.md): grouped
// by body, since the planet variant's per-span rendering above never says
// WHICH end of the axis a copresent body shares -- undecidable from the
// rest of the brief and interpretively significant (a body sharing the
// South Node's house reads oppositely from one sharing the North Node's).
// Sign/end/house are stated once per body (house is derivable from the end
// label plus the HOUSES header, stated anyway per the always-show principle
// used throughout this brief); every dated span for that body is then
// comma-joined inside one set of parens; bodies are joined with "; ".
function formatCopresentSkyNodes(spansByBody, phaseStart, phaseEnd, ascSign, risingKnown) {
  const entries = [];
  for (const [body, spans] of spansByBody) {
    // GUARD: a slow body cannot be copresent with BOTH nodal ends during one
    // passage -- that would require crossing six signs in ~18 months, proven
    // impossible at Jupiter's speed or slower. Grouping by body is lossless
    // ONLY under this assumption; if it ever fails against real data, that's
    // a genuine surprise to investigate, not a case to render around.
    const ends = new Set(spans.map(sp => sp.axisEnd));
    if (ends.size > 1) {
      throw new Error(`formatCopresentSkyNodes: ${body} is copresent with both nodal ends in one passage (${[...ends].join(', ')}) -- proven structurally impossible for a slow body; investigate before rendering.`);
    }
    const { axisEnd, sign } = spans[0];
    const houseText = risingKnown ? `, ${houseOfSign(sign, ascSign)}` : '';
    const spanTexts = spans.map(sp => {
      const full = sp.start <= phaseStart && sp.end >= phaseEnd;
      return full ? 'all phase' : `${sp.start} – ${sp.end}`;
    });
    entries.push(`${body} in ${sign}, ${axisEnd} end${houseText} (${spanTexts.join(', ')})`);
  }
  return entries.length ? entries.join('; ') : 'none';
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
// accepts computeContactWindows' camelCase rows, not these. Also reused
// for reading_transit_contacts records below: their window_start/window_end
// are always non-null (NOT NULL per the Stage 1 schema), so the `??
// exact_date` fallback here never actually triggers for them -- it's the
// exact same overlap test contact-engine.mjs's windowOverlaps() performs on
// the pre-record camelCase rows.
function rawWindowOverlaps(row, startDate, endDate) {
  const s = row.window_start ?? row.exact_date;
  const e = row.window_end ?? row.exact_date;
  return s <= endDate && e >= startDate;
}

// pointName: the host contact record's own natal_point -- passed in by the
// caller (which already has the host record in scope) rather than stored
// on the activation record itself, since it's implicit via host_contact_id
// in the real schema.
function formatActivationFact(fact, pointName) {
  const {
    activation_id, candidate_body, _sky, anchor_date, perfects_before_host_orb, perfects_after_host_orb,
    natal_aspect, natal_aspect_exact_date, candidate_motion_state,
  } = fact;
  const motionLine = `(${_sky.body_1} ${_sky.body_1_retrograde ? 'retrograde' : 'direct'}, ${_sky.body_2} ${_sky.body_2_retrograde ? 'retrograde' : 'direct'})`;
  const perfectionNote = _sky.exact_date
    ? perfects_before_host_orb
      ? `; perfects ${_sky.exact_date}, before this contact begins`
      : perfects_after_host_orb
        ? `; perfects ${_sky.exact_date}, after this contact separates`
        : `; perfects ${_sky.exact_date}`
    : '; no exact in this window';
  const skyLine = `${candidate_body} ${_sky.event} the piece's planet, within 1° on ${anchor_date}${perfectionNote} ${motionLine}`;
  const natalLine = `${candidate_body} ${natal_aspect} natal ${pointName}, ${natal_aspect_exact_date ? `exact ${natal_aspect_exact_date}` : 'no exact'} (${candidate_body} ${candidate_motion_state})`;
  return (
`      - ID: ${activation_id}
        BODY: ${candidate_body}
        SKY_ASPECT: ${skyLine}
        NATAL_ASPECT: ${natalLine}
        DATE: ${anchor_date}`
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
// plainly, same as NATAL_ASPECT does. id/candidate_body/_sky/anchor_date/
// perfects_before_host_orb/perfects_after_host_orb/_pairAspect/
// _hostOtherBody are all read directly off the sky_pair_activations record.
function formatPairActivationFact(fact) {
  const {
    id, candidate_body, _sky, anchor_date, perfects_before_host_orb, perfects_after_host_orb,
    _pairAspect, _hostOtherBody,
  } = fact;
  const motionLine = `(${_sky.body_1} ${_sky.body_1_retrograde ? 'retrograde' : 'direct'}, ${_sky.body_2} ${_sky.body_2_retrograde ? 'retrograde' : 'direct'})`;
  const perfectionNote = _sky.exact_date
    ? perfects_before_host_orb
      ? `; perfects ${_sky.exact_date}, before this pair's aspect begins`
      : perfects_after_host_orb
        ? `; perfects ${_sky.exact_date}, after this pair's aspect separates`
        : `; perfects ${_sky.exact_date}`
    : '; no exact in this window';
  const skyLine = `${candidate_body} ${_sky.event} the piece's planet, within 1° on ${anchor_date}${perfectionNote} ${motionLine}`;
  const motionOf = (row, body) => ((body === row.body_1 ? row.body_1_retrograde : row.body_2_retrograde) ? 'retrograde' : 'direct');
  const pairLine = `${candidate_body} ${_pairAspect.event} ${_hostOtherBody}, ${_pairAspect.exact_date ? `exact ${_pairAspect.exact_date}` : 'no exact'} (${candidate_body} ${motionOf(_pairAspect, candidate_body)}, ${_hostOtherBody} ${motionOf(_pairAspect, _hostOtherBody)})`;
  return (
`      - ID: ${id}
        BODY: ${candidate_body}
        SKY_ASPECT: ${skyLine}
        PAIR_ASPECT: ${pairLine}
        DATE: ${anchor_date}`
  );
}

// Shared by both the Nodes piece's own ECLIPSE entries and the planet
// variant's ECLIPSE_ACTIVATION entries: "conjunct"/"opposite the eclipse
// degree" per which end of the lunation axis caught the point; an end with
// nothing caught is omitted rather than stated as empty. catches: an array
// of reading_eclipse_catches records (structured-records.mjs).
function formatNatalCaughtField(catches, risingKnown) {
  if (catches.length === 0) return 'none';
  return catches
    .map(c => `${c.natal_point} (${c.natal_point_degree.toFixed(1)}° ${c.natal_point_sign}${risingKnown && c.natal_point_house ? `, ${c.natal_point_house}` : ''}) ${c.catch_end === 'same sign as eclipse' ? 'conjunct' : 'opposite'} the eclipse degree`)
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
    ECLIPSE: ${eclipse.event}, ${eclipse.exact_date}, ${eclipse.exact_degree.toFixed(1)}° ${eclipseAnchorSign(eclipse)}${houseText}
    DATES: eclipse falls within 3° of the piece's planet on ${eclipse.exact_date}
    NATAL_CAUGHT: ${formatNatalCaughtField(catches, risingKnown)}`
  );
}

// ── Main assembly ──────────────────────────────────────────────────────

// options.reading: an in-memory { chart_data, birth_time_known, name }
// override, bypassing the dogfood Supabase fetch entirely -- used ONLY by
// the engine-scale exercise (scripts/exercise-engine.mjs) to run synthetic
// charts without ever writing a row to the readings table. options.
// referenceDate: which date counts as "today" for phase selection --
// lets the same exercise walk a body's prior/current/future phases
// without waiting for real time to pass. Both default to normal
// production behavior (the dogfood reading, real today) when omitted.
export async function assembleBrief(focusBody, options = {}) {
  const { reading: readingOverride, referenceDate = TODAY } = options;
  let reading = readingOverride;
  if (!reading) {
    const { data, error } = await supabase.from('readings').select('chart_data, birth_time_known, name').eq('slug', DOGFOOD_READING_SLUG).single();
    if (error || !data) throw new Error(`Could not load reading: ${error?.message}`);
    reading = data;
  }
  // Structured records (SPEC.md §11A.11) key on a reading_slug. The real
  // dogfood fetch always used DOGFOOD_READING_SLUG (the query's own filter
  // value); an override reading (exercise-engine.mjs's synthetic and
  // real-chart cases) never has a slug at all, since those charts are never
  // written to the readings table -- 'synthetic' is an honest placeholder,
  // not a guess, and never affects brief TEXT (reading_slug never renders).
  const readingSlug = readingOverride ? (readingOverride.slug ?? 'synthetic') : DOGFOOD_READING_SLUG;
  const natalPoints = extractNatalPoints(reading.chart_data);
  const ascSign = natalPoints.find(p => p.name === 'Ascendant').sign;
  const risingKnown = reading.birth_time_known ?? true;
  // Unknown birth time: natal Moon CONTACTS are excluded entirely (its
  // degree is uncertain by more than the active orb) -- SPEC.md 3.5. This
  // scopes only the contact/timeline computation; copresence (sign-level,
  // no degree precision needed) is unaffected.
  const contactNatalPoints = risingKnown ? natalPoints : natalPoints.filter(p => p.name !== 'Moon');
  const pointByName = new Map(contactNatalPoints.map(p => [p.name, p]));

  const currentRow = await fetchCurrentPhaseRow(focusBody, referenceDate);
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

  // Full-series cache, scoped to this one assembleBrief() call -- GAP 3's
  // WINDOW computation needs the OTHER body's full sky_positions history
  // for every SKY_CONTACT entry, and several entries commonly share the
  // same other body (e.g. multiple Uranus-Neptune passes), so this avoids
  // re-fetching identical data repeatedly within one brief.
  const fullSeriesCache = new Map([[seriesBody, series]]);
  async function getFullSeries(body) {
    if (!fullSeriesCache.has(body)) fullSeriesCache.set(body, await fetchFullSeries(body));
    return fullSeriesCache.get(body);
  }

  // Raw (all-time, all-sign) contacts per natal point, sign-consonance
  // checked on every row (STEP 3 guard 1), then filtered down to THIS
  // passage occurrence (date range AND sign match -- see
  // filterAndGroupForPassage's header comment for why both are required),
  // then minted ONCE each into a reading_transit_contacts record (STAGE 2)
  // and grouped by (point, aspect) for passage-scoped window/pass counts
  // (STEP 2 Bug A/B fix + STEP 4; STEP 3 guard 2 runs inside
  // filterAndGroupForPassage).
  const rawContactsByPoint = computeRawContactsByPoint(focusBody, series, contactNatalPoints);
  const byAspectKey = new Map(); // "PointName|aspectKey" -> reading_transit_contacts records, this passage only
  const passageContactRecords = [];
  for (const [pointName, rows] of rawContactsByPoint) {
    const enriched = filterAndGroupForPassage(rows, passageSign, passageIngressForFiltering, passage.egressDate);
    for (const c of enriched) {
      const record = buildTransitContactRecord(readingSlug, focusBody, pointByName.get(pointName), c, risingKnown);
      const aspectKey = `${record.natal_point}|${record.axis_involved ? record.axis_kind : record.aspect}`;
      if (!byAspectKey.has(aspectKey)) byAspectKey.set(aspectKey, []);
      byAspectKey.get(aspectKey).push(record);
      passageContactRecords.push(record);
    }
  }

  const timelineNatal = passageContactRecords.filter(record =>
    // RULING A companion clause: an anchor date landing exactly on phaseEnd
    // belongs to the next phase (which opens then), not this one -- see
    // exactBelongsToPhase's header comment.
    recordAnchorDate(record) >= phaseStart && recordAnchorDate(record) < phaseEnd,
  );

  // ── Sky aspects: classify into SLOW-always-entries, FAST-activation-only,
  // FAST-atmospheric-entries. Also collect activation facts keyed by the
  // NATAL_CONTACT record they attach to.
  const skyRows = focusBody === 'Nodes' ? [] : await fetchAspectCalendarForBody(focusBody, phaseStart, phaseEnd);
  const skyContactEntries = [];
  const activationsByNatalRow = new Map(); // reading_transit_contacts record -> [reading_natal_activations record, ...]
  const allNatalActivationRecords = [];

  for (const sky of skyRows) {
    const otherBody = sky.body_1 === focusBody ? sky.body_2 : sky.body_1;
    if (otherBody === 'Moon') continue;
    const skyStart = sky.window_start ?? sky.exact_date;
    const skyEnd = sky.window_end ?? sky.exact_date;
    const slowPair = isSlowPair(focusBody, otherBody);

    // RULING A -- phase membership requires real interior overlap: strictly
    // skyStart < phaseEnd AND skyEnd > phaseStart. This excludes ONLY
    // degenerate zero-duration touches (a window that separates exactly on
    // this phase's own opening date, or opens exactly on its closing date)
    // -- it can never drop a window with any real overlap, including one
    // that spans a station and is correctly a member of BOTH phases it
    // overlaps. Gates only whether this sky aspect becomes ITS OWN
    // SKY_CONTACT timeline entry -- it still remains eligible as a natal-
    // or pair-activation candidate below regardless (those qualify against
    // the HOST's own window, not phase bounds, by original design: an
    // activation may legitimately perfect before a phase opens or after it
    // closes, per the existing before/after-host-orb phrasing).
    const skyInPhase = skyStart < phaseEnd && skyEnd > phaseStart;

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
    const focusOverlaps = timelineNatal.filter(record => rawWindowOverlaps(record, skyStart, skyEnd));
    for (const fc of focusOverlaps) {
      const otherSeries = await fetchSeriesRange(otherBody, fc.window_start, fc.window_end);
      const otherRows = computeContactWindows(otherSeries, pointByName.get(fc.natal_point), fc.axis_involved);
      const otherOwnContact = otherRows.find(oc =>
        windowOverlaps(oc, skyStart, skyEnd) && windowOverlaps(oc, fc.window_start, fc.window_end));
      if (!otherOwnContact) continue; // leg A

      const focusSlice = series.filter(r => r.date >= fc.window_start && r.date <= fc.window_end);
      const anchorDate = findActivationAnchor(focusSlice, otherSeries, sky.event, fc.window_start, fc.window_end);
      if (!anchorDate) continue; // leg B

      const perfectsBeforeHostOrb = !!sky.exact_date && sky.exact_date < fc.window_start;
      const perfectsAfterHostOrb = !!sky.exact_date && sky.exact_date > fc.window_end;
      // NATAL_ASPECT's motion state: otherBody's own state at ITS aspect's
      // exact date when it perfects, else at the activation's anchor date
      // (the only concrete reference point a no-exact contact has).
      const motionRefDate = otherOwnContact.exactDate ?? anchorDate;
      const motionRow = otherSeries.find(r => r.date === motionRefDate);
      // otherSeries was fetched specifically to cover [fc.window_start,
      // fc.window_end], and motionRefDate is always inside that range by
      // construction -- a missing row here is a genuine data gap, not a
      // legitimate unknown (STEP D: was previously a silent 'unknown'
      // fallback in the rendered brief text).
      if (!motionRow) {
        throw new Error(`motion state: no sky_positions row for ${otherBody} at ${motionRefDate} (expected within fetched range ${fc.window_start}..${fc.window_end})`);
      }
      const motionState = motionRow.retrograde ? 'retrograde' : 'direct';
      const activationRecord = buildNatalActivationRecord(
        readingSlug, fc, otherBody, sky, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb, otherOwnContact, motionState,
      );
      allNatalActivationRecords.push(activationRecord);
      facts.push({ natalContact: fc, fact: activationRecord });
    }

    if (slowPair && skyInPhase) {
      skyContactEntries.push({ sky, otherBody, atmospheric: false });
    }
    if (facts.length > 0) {
      for (const f of facts) {
        if (!activationsByNatalRow.has(f.natalContact)) activationsByNatalRow.set(f.natalContact, []);
        activationsByNatalRow.get(f.natalContact).push(f.fact);
      }
    } else if (!slowPair && skyInPhase) {
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
  const pairActivationsByHostId = new Map(); // host sky.id -> [sky_pair_activations record, ...]
  const allSkyPairActivationRecords = [];

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
      const pairRecord = buildSkyPairActivationRecord(
        host.sky, candSky, pairAspect, candB, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb, host.otherBody,
      );
      allSkyPairActivationRecords.push(pairRecord);
      if (!pairActivationsByHostId.has(host.sky.id)) pairActivationsByHostId.set(host.sky.id, []);
      pairActivationsByHostId.get(host.sky.id).push(pairRecord);
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
  const allEclipseCatchRecords = [];
  const allEclipseTransitingCatchRecords = [];
  if (focusBody !== 'Nodes') {
    const eclipses = await fetchEclipsesInRange(phaseStart, phaseEnd);
    for (const ec of eclipses) {
      const dayRow = series.find(r => r.date === ec.exact_date);
      if (!dayRow) continue;
      const pseudoPoint = [{ name: focusBody, isAxis: false, sign: dayRow.sign, degree: dayRow.sign_degree, house: null }];
      const focusCatches = eclipseCatches(ec, pseudoPoint);
      if (focusCatches.length === 0) continue;
      const transitingCatchRecord = buildEclipseTransitingCatchRecord(ec, focusBody, dayRow, focusCatches[0].end);
      allEclipseTransitingCatchRecords.push(transitingCatchRecord);
      const catches = eclipseCatches(ec, natalPoints).map(c => buildEclipseCatchRecord(readingSlug, ec.id, c, risingKnown));
      allEclipseCatchRecords.push(...catches);
      eclipseActivationEntries.push({
        id: transitingCatchRecord.id, eclipse: ec, catches, risingKnown, house: houseOfSign(eclipseAnchorSign(ec), ascSign),
      });
    }
  }

  // ── Render TIMELINE blocks ──
  const timelineBlocks = [];
  // Complete = known ingress AND known egress, both within tracked data --
  // same convention already used elsewhere (ingressDirect, the "predates
  // tracked data" PASSAGE phrasing). Threaded into computeStatus's guard.
  const passageIsComplete = passage.ingressDate !== null && passage.egressDate !== null;

  for (const c of timelineNatal) {
    const aspectKey = `${c.natal_point}|${c.axis_involved ? c.axis_kind : c.aspect}`;
    const siblings = byAspectKey.get(aspectKey);
    const activations = activationsByNatalRow.get(c) ?? [];
    // NODES UNIFORMITY: WINDOW/PASS are always shown, including for the
    // Nodes axis (always "1 of 1" -- the axis never stations, so it
    // crosses each degree once; uninformative but consistent, which is
    // the point of always-show). No exceptions remain anywhere.
    const windowLine = `\n    WINDOW: ${c.passage_window_index} of ${c.passage_window_count} this passage`;
    const passLine = `\n    PASS: ${c.exact_date ? `${c.passage_pass_index} of ${c.passage_pass_count} this passage` : '(none this window)'}`;
    const houseText = risingKnown ? `, ${c.natal_point_house ?? 'house unknown'}` : '';
    let block =
`  - ID: ${c.contact_id}
    TYPE: NATAL_CONTACT
    ASPECT: ${c.axis_involved ? aspectLabelFor(c, focusBody) : `${c.aspect} natal ${c.natal_point} (${c.natal_point_degree.toFixed(1)}° ${c.natal_point_sign}${houseText})`}
    DATES: ${formatContactDates(c, phaseStart, phaseEnd)}${windowLine}${passLine}
    STATUS: ${computeStatus(c, phaseStart, phaseEnd, siblings, passageIsComplete)}`;
    if (activations.length) {
      block += `\n    ACTIVATIONS:\n${activations.map(f => formatActivationFact(f, c.natal_point)).join('\n')}`;
    }
    timelineBlocks.push({ date: recordAnchorDate(c), text: block, id: c.contact_id });
  }

  for (const entry of skyContactEntries) {
    const { sky, otherBody, atmospheric } = entry;
    const anchor = sky.exact_date ?? sky.window_start;
    const skyDates = formatBoundaryDates(sky.window_start, sky.window_end, sky.exact_date, phaseStart, phaseEnd);

    // GAP 3: WINDOW and PASS are always shown on every SKY_CONTACT entry,
    // symmetric with NATAL_CONTACT -- absence must never require
    // interpretation. WINDOW needs the aspect's full all-time history to
    // count distinct orb-engagement spans within its own "aspect passage"
    // (skyWindowPassageIndex); PASS reuses pass_n/pass_m, already computed
    // at the data layer with the identical passage scoping.
    const pairEventRows = await fetchAspectCalendarForPairEvent(sky.body_1, sky.body_2, sky.event);
    const otherFullSeries = await getFullSeries(otherBody);
    const hostWindowKey = `${sky.window_start}|${sky.window_end}`;
    const { windowIndex, windowCount } = skyWindowPassageIndex(pairEventRows, series, otherFullSeries, hostWindowKey);
    const windowLine = `\n    WINDOW: ${windowIndex} of ${windowCount} this passage`;
    const passLine = `\n    PASS: ${sky.exact_date ? `${sky.pass_n} of ${sky.pass_m} this passage` : '(none this window)'}`;

    let block =
`  - ID: ${sky.id}
    TYPE: SKY_CONTACT
    ASPECT: ${sky.event === 'conjunction' ? 'conjunct' : sky.event} transiting ${otherBody}
    DATES: ${skyDates}${windowLine}${passLine}
    STATUS: ${computeSkyStatus(sky, phaseStart, phaseEnd)}${atmospheric ? '\n    TETHER: atmospheric -- no natal point caught' : ''}`;
    const pairActivations = pairActivationsByHostId.get(sky.id) ?? [];
    if (pairActivations.length) {
      block += `\n    ACTIVATIONS:\n${pairActivations.map(formatPairActivationFact).join('\n')}`;
    }
    timelineBlocks.push({ date: anchor, text: block, id: sky.id });
  }

  for (const entry of eclipseActivationEntries) {
    timelineBlocks.push({ date: entry.eclipse.exact_date, text: formatEclipseActivationEntry(entry), id: entry.id });
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
    for (const sgn of signsToCheck) {
      const rawSpans = skyCopresenceSpans(otherSeries, sgn);
      // Tag which axis end this sign belongs to -- only meaningful (and only
      // consumed downstream) when focusBody is the Nodes piece itself; see
      // formatCopresentSkyNodes.
      if (focusBody === 'Nodes') {
        const axisEnd = sgn === currentRow.north_sign ? 'North Node' : 'South Node';
        spans.push(...rawSpans.map(sp => ({ ...sp, sign: sgn, axisEnd })));
      } else {
        spans.push(...rawSpans);
      }
    }
    if (spans.length) skySpans.set(body, spans);
  }
  if (focusBody !== 'Nodes') {
    const nodeSeries = await fetchSeriesRange('North Node', phaseStart, phaseEnd);
    const nodeSpans = nodesCopresenceSpans(nodeSeries, currentRow.sign);
    if (nodeSpans.length) skySpans.set('Nodes', nodeSpans);
  }
  const skyCop = focusBody === 'Nodes'
    ? formatCopresentSkyNodes(skySpans, phaseStart, phaseEnd, ascSign, risingKnown)
    : formatCopresentSky(skySpans, phaseStart, phaseEnd);

  // ── Assemble the message ──
  const lines = [];
  let eclipseEntryCount = 0; // Nodes variant only -- TYPE: ECLIPSE entries, a counted entry type per docs/brief-template-nodes.md's own [counts] line
  const nodesEclipseIds = []; // Nodes variant only -- ids of the TYPE: ECLIPSE entries above, for entryIds below
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
    eclipseEntryCount = eclipses.length;
    for (const e of eclipses) {
      nodesEclipseIds.push(e.id);
      const catches = eclipseCatches(e, natalPoints).map(c => buildEclipseCatchRecord(readingSlug, e.id, c, risingKnown));
      allEclipseCatchRecords.push(...catches);
      const anchorSign = eclipseAnchorSign(e);
      const aspectRows = await fetchEclipseAspects(e.id);
      const config = aspectRows
        .slice()
        .sort((a, b) => ALL_BODIES.indexOf(a.other_body) - ALL_BODIES.indexOf(b.other_body))
        .map(a => `${a.aspect} ${a.other_body}`)
        .join(', ') || 'none';
      lines.push(
`  - TYPE: ECLIPSE
    ID: ${e.id}
    KIND: ${e.event === 'Solar Eclipse' ? 'solar' : 'lunar'}
    DATE: ${e.exact_date}
    POINT: ${e.exact_degree.toFixed(1)}° ${anchorSign}${risingKnown ? `, ${houseOfSign(anchorSign, ascSign)}` : ''}
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
    lines.push(`  MOTION: ${motionForOpeningEvent(currentRow.event_type)}`);
    lines.push(`  OPENED_BY: ${eventLabel(currentRow.event_type, currentRow.degree)} on ${currentRow.date}`);
    const closesRow = phaseEnd ? await fetchBodyRowAtDate(focusBody, phaseEnd) : null;
    lines.push(`  CLOSES: ${closesLabelFor(currentRow, phaseEnd, closesRow)} on ${phaseEnd}`);
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

  // entryIds: every engine-minted id that appears as its own [ID: ...] /
  // TIMELINE entry -- NATAL_CONTACT, SKY_CONTACT, and (planet pieces only)
  // ECLIPSE_ACTIVATION via timelineBlocks, plus (Nodes only) the TYPE:
  // ECLIPSE entries appended after TIMELINE. Excludes nested ACTIVATIONS
  // facts, which are not standalone entries. This is the set Call 2's
  // [ENTRY: {id}] tags must match exactly -- not counts.totalEntries, which
  // (for planet pieces) omits ECLIPSE_ACTIVATION entries by construction.
  const entryIds = [...timelineBlocks.map(b => b.id), ...nodesEclipseIds];

  const meta = focusBody === 'Nodes'
    ? {
        trigger_id: currentRow.id,
        phase_opened_date: phaseStart,
        phase_end_date: phaseEnd,
        sign: null,
        motion: null,
        north_sign: currentRow.north_sign,
        south_sign: currentRow.south_sign,
      }
    : {
        trigger_id: currentRow.id,
        phase_opened_date: phaseStart,
        phase_end_date: phaseEnd,
        sign: currentRow.sign,
        motion: motionForOpeningEvent(currentRow.event_type),
        north_sign: null,
        south_sign: null,
      };

  return {
    text: lines.join('\n'),
    counts: {
      natalCount, skyCount, activationCount, eclipseFactCount, eclipseEntryCount,
      totalEntries: natalCount + skyCount + eclipseEntryCount,
    },
    meta,
    entryIds,
    // STAGE 2 (SPEC.md §11A.11): the structured records minted while
    // building this brief, one array per Stage 1 table shape. Additive --
    // existing callers (exercise-engine.mjs, certify-calendars.mjs)
    // destructure only the fields above and are unaffected by this array
    // existing. Not written to any table (Stage 3, not yet built).
    records: {
      readingTransitContacts: passageContactRecords,
      readingNatalActivations: allNatalActivationRecords,
      readingEclipseCatches: allEclipseCatchRecords,
      skyPairActivations: allSkyPairActivationRecords,
      eclipseTransitingCatches: allEclipseTransitingCatchRecords,
    },
  };
}

async function main() {
  const arg = process.argv[2] ?? 'Saturn';
  const bodies = arg === 'all' ? ['Saturn', 'Mercury', 'Nodes'] : [arg];
  for (const focusBody of bodies) {
    if (!['Saturn', 'Mercury', 'Nodes'].includes(focusBody)) {
      throw new Error(`Unknown body ${focusBody}. Use Saturn, Mercury, Nodes, or all.`);
    }
    console.log(`\n${'='.repeat(78)}\nASSEMBLED CALL 1 INPUT -- ${focusBody}\n${'='.repeat(78)}\n`);
    const { text, counts, meta, entryIds } = await assembleBrief(focusBody);
    console.log(text);
    const eclipseComponent = focusBody === 'Nodes' ? `, ${counts.eclipseEntryCount} ECLIPSE` : '';
    console.log(`\n[counts] entries: ${counts.totalEntries} (${counts.natalCount} NATAL_CONTACT, ${counts.skyCount} SKY_CONTACT${eclipseComponent}); activation facts: ${counts.activationCount}; eclipse-to-transit facts: ${counts.eclipseFactCount}`);
    console.log(`[meta] ${JSON.stringify(meta)}`);
    console.log(`[entryIds] (${entryIds.length}): ${entryIds.join(', ')}`);
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
