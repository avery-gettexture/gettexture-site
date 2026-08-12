// Stage 2 of the structured-aspect-tables build (docs/SPEC.md §11A.11):
// pure, side-effect-free builder functions that shape already-computed
// facts into the five Stage 1 table row shapes. See
// scripts/create_reading_transit_contacts.sql,
// scripts/create_reading_eclipse_catches.sql,
// scripts/create_sky_pair_activations.sql, and
// scripts/create_eclipse_transiting_catches.sql for the authoritative
// column list each function here must match.
//
// FIELD CONVENTION: every plain-named field on a returned record matches a
// real column name in its Stage 1 table exactly -- these are the only
// fields Stage 3's future write code should ever read. A field prefixed
// with `_` is a render-time convenience only: a reference to an
// already-fetched row that assemble-brief.mjs's own text rendering still
// needs, which the real schema deliberately does NOT persist because it's
// reachable by foreign key (sky_aspect_id, candidate_sky_id, pair_sky_id).
// Never persisted, never read outside assemble-brief.mjs's rendering code.
//
// No engine math lives here -- every input is a value contact-engine.mjs
// (or assemble-brief.mjs's own orchestration) has already computed. This
// file only shapes data and mints IDs, reusing the exact mint* functions
// contact-engine.mjs already exports so IDs stay byte-identical to what
// assemble-brief.mjs minted before this refactor. This file makes no
// Supabase calls and writes nothing -- Stage 3 (a later, separate task)
// is what wires these shapes to actual table writes.

import {
  mintContactId, mintAxisContactId, mintActivationId, mintPairActivationId,
  mintEclipseTransitActivationId, mintReadingEclipseCatchId, labelAxisContact,
} from './contact-engine.mjs';

// ── reading_transit_contacts ────────────────────────────────────────────
//
// point: the full natal point object from extractNatalPoints() (needed to
// mint the ID and to populate sign/degree/house; not itself stored on the
// record). c: one row from filterAndGroupForPassage's enriched output for
// this point.
export function buildTransitContactRecord(readingSlug, focusBody, point, c, risingKnown) {
  const passageCounts = { n: c.passagePassIndex, m: c.passagePassCount };
  const axisKind = c.axisInvolved ? labelAxisContact(c.dist, focusBody === 'Nodes', point).kind : null;
  const contactId = c.axisInvolved
    ? mintAxisContactId(focusBody, axisKind, point.name, c, passageCounts)
    : mintContactId(focusBody, c.aspect, point.name, c, passageCounts);

  return {
    id: `${readingSlug}-${contactId}`.toLowerCase(),
    reading_slug: readingSlug,
    contact_id: contactId,
    body: focusBody,
    natal_point: point.name,
    natal_point_sign: point.isAxis ? null : point.sign,
    natal_point_north_sign: point.isAxis ? point.northSign : null,
    natal_point_south_sign: point.isAxis ? point.southSign : null,
    natal_point_degree: point.degree,
    // A single house column can't represent an axis point's two houses
    // (north/south) at once, so axis rows carry NULL here -- consistent
    // with the brief's own rendering, which never states a house on an
    // axis-involved ASPECT line (labelAxisContact's labels never mention
    // one).
    natal_point_house: (!risingKnown || point.isAxis) ? null : (point.house ?? null),
    aspect: c.aspect,
    axis_involved: c.axisInvolved,
    axis_kind: axisKind,
    transiting_sign: c.transitingSign,
    window_start: c.windowStart,
    window_end: c.windowEnd,
    still_open_at_series_end: c.stillOpenAtSeriesEnd,
    exact_date: c.exactDate ?? null,
    exact_degree: c.exactDegree ?? null,
    transiting_retrograde_at_exact: c.transitingRetrograde ?? null,
    passage_window_index: c.passageWindowIndex,
    passage_window_count: c.passageWindowCount,
    passage_pass_index: c.passagePassIndex ?? null,
    passage_pass_count: c.passagePassCount,
  };
}

// ── reading_natal_activations ───────────────────────────────────────────
//
// hostRecord: the reading_transit_contacts record this activation attaches
// to (already minted). sky: the full aspect_calendar row for the SKY_ASPECT
// leg (candidate vs. the host's own transiting planet) -- kept on the
// record as _sky since the real schema reaches it via sky_aspect_id
// instead of duplicating its fields. otherOwnContact: the candidate's own
// raw contact row to the SAME natal point (the NATAL_ASPECT leg) --
// reading-specific, so its scalar fields ARE persisted per SPEC.md 11A.11.
export function buildNatalActivationRecord(readingSlug, hostRecord, otherBody, sky, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb, otherOwnContact, motionState) {
  const activationId = mintActivationId(sky.id, hostRecord.natal_point);
  return {
    id: `${readingSlug}-${activationId}`.toLowerCase(),
    reading_slug: readingSlug,
    activation_id: activationId,
    host_contact_id: hostRecord.id,
    candidate_body: otherBody,
    sky_aspect_id: sky.id,
    anchor_date: anchorDate,
    perfects_before_host_orb: perfectsBeforeHostOrb,
    perfects_after_host_orb: perfectsAfterHostOrb,
    natal_aspect: otherOwnContact.aspect,
    natal_aspect_window_start: otherOwnContact.windowStart,
    natal_aspect_window_end: otherOwnContact.windowEnd,
    natal_aspect_exact_date: otherOwnContact.exactDate ?? null,
    natal_aspect_exact_degree: otherOwnContact.exactDegree ?? null,
    candidate_motion_state: motionState,
    _sky: sky,
  };
}

// ── reading_eclipse_catches ─────────────────────────────────────────────
//
// catchEntry: one entry from contact-engine.mjs's eclipseCatches() output
// ({name, sign, degree, house, end}). Shared verbatim by both the Nodes
// piece's TYPE: ECLIPSE entries and a planet piece's TYPE:
// ECLIPSE_ACTIVATION entries (SPEC.md 11A.8) -- callers on both sides call
// this same builder with the identical eclipseCatches() output.
export function buildEclipseCatchRecord(readingSlug, eclipseId, catchEntry, risingKnown) {
  return {
    id: mintReadingEclipseCatchId(readingSlug, eclipseId, catchEntry.name),
    reading_slug: readingSlug,
    eclipse_id: eclipseId,
    natal_point: catchEntry.name,
    natal_point_sign: catchEntry.sign,
    natal_point_degree: catchEntry.degree,
    natal_point_house: risingKnown ? (catchEntry.house ?? null) : null,
    catch_end: catchEntry.end,
  };
}

// ── sky_pair_activations ────────────────────────────────────────────────
//
// Chart-independent -- no reading_slug. hostSky/candSky/pairAspect are the
// three already-fetched aspect_calendar rows this fact resolves to
// (SPEC.md 11A.11); candSky and pairAspect are kept as render-only
// _sky/_pairAspect references (the real schema reaches them via
// candidate_sky_id/pair_sky_id instead of duplicating their fields).
export function buildSkyPairActivationRecord(hostSky, candSky, pairAspect, candidateBody, anchorDate, perfectsBeforeHostOrb, perfectsAfterHostOrb, hostOtherBody) {
  return {
    id: mintPairActivationId(candSky.id, hostSky.id),
    host_sky_id: hostSky.id,
    candidate_sky_id: candSky.id,
    pair_sky_id: pairAspect.id,
    candidate_body: candidateBody,
    anchor_date: anchorDate,
    perfects_before_host_orb: perfectsBeforeHostOrb,
    perfects_after_host_orb: perfectsAfterHostOrb,
    _sky: candSky,
    _pairAspect: pairAspect,
    _hostOtherBody: hostOtherBody,
  };
}

// ── eclipse_transiting_catches ──────────────────────────────────────────
//
// Chart-independent -- no reading_slug. eclipseRow: the aspect_calendar
// eclipse row. dayRow: the focus body's own sky_positions row on eclipse
// day. catchEnd: from eclipseCatches() applied to a single-point pseudo-
// natal-point representing the focus body's own transiting position (see
// assemble-brief.mjs's eclipse-to-transit gating check). This record's id
// is DELIBERATELY identical to the TYPE: ECLIPSE_ACTIVATION timeline entry
// it gates (per the Stage 1 SQL comment on this table) -- not a
// duplicate-by-accident.
export function buildEclipseTransitingCatchRecord(eclipseRow, focusBody, dayRow, catchEnd) {
  return {
    id: mintEclipseTransitActivationId(eclipseRow.id, focusBody),
    eclipse_id: eclipseRow.id,
    eclipse_date: eclipseRow.exact_date,
    eclipse_event: eclipseRow.event,
    transiting_body: focusBody,
    transiting_sign: dayRow.sign,
    transiting_degree: dayRow.sign_degree,
    catch_end: catchEnd,
  };
}
