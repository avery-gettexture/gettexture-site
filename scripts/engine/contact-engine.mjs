// Shared math for the transit contact engine (Phase 2 of the transit
// content build -- see docs/SPEC.md and the approved plan). This file is a
// pure library: it does not query Supabase and does not print anything.
// scripts/engine/print-itinerary.mjs (validation) and, later,
// scripts/engine/assemble-brief.mjs (Call 1 input) both import from here.
//
// It adapts the exact sign-consonant windowing algorithm already proven in
// scripts/generate-aspect-calendar.mjs (that file is not modified) to a
// transiting-body-vs-fixed-natal-point pairing: the natal point acts as a
// constant reference longitude/sign, so the same crossing-detection,
// dating, and pass-counting logic applies unchanged.
//
// RECEIVING MODEL: 13 natal points -- Sun through Pluto (10, including the
// Moon), ASC, MC, and the nodal axis as one point. The axis is always
// referenced by the natal North Node's longitude only -- the South Node's
// own longitude is never separately checked, which would double-count one
// physical alignment (AXIS MERGE RULE).
//
// AXIS ASPECT RESTRICTION (RULING): whenever either side of a contact is
// the nodal axis -- the natal axis as the receiving point, OR the transiting
// Nodes as the subject -- only conjunction (dist 0, or dist 6 for the
// north/south swap) and square (dist 3) are ever computed. Sextile/trine
// (dist 2/4) are excluded before any orb math runs: an axis's sextile from
// one end is always a trine from the other, an ambiguity only conjunction
// and square avoid. This applies transit-to-natal only; the natal-to-natal
// all-aspects merge elsewhere in the chart is unchanged.

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const SIGN_ABBR_MAP = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

export const HOUSE_ORDINALS = {
  First_House: '1st House', Second_House: '2nd House', Third_House: '3rd House',
  Fourth_House: '4th House', Fifth_House: '5th House', Sixth_House: '6th House',
  Seventh_House: '7th House', Eighth_House: '8th House', Ninth_House: '9th House',
  Tenth_House: '10th House', Eleventh_House: '11th House', Twelfth_House: '12th House',
};

const ASPECT_ANGLES = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const SIGN_DIST_TO_ASPECT = { 0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition' };
const ACTIVE_ORB = 3;

const HOUSE_NAMES = [
  '1st House', '2nd House', '3rd House', '4th House', '5th House', '6th House',
  '7th House', '8th House', '9th House', '10th House', '11th House', '12th House',
];

// Whole Sign house of a given sign, counted from the natal Ascendant's sign
// (the ASC establishes the 1st house; each subsequent sign is the next house).
export function houseOfSign(sign, ascSign) {
  const idx = (SIGNS.indexOf(sign) - SIGNS.indexOf(ascSign) + 12) % 12;
  return HOUSE_NAMES[idx];
}

export function signDistance(sign1, sign2) {
  const i1 = SIGNS.indexOf(sign1);
  const i2 = SIGNS.indexOf(sign2);
  const diff = Math.abs(i1 - i2);
  return Math.min(diff, 12 - diff);
}

export function angularSeparation(lon1, lon2) {
  const diff = Math.abs(lon1 - lon2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function interpolateDegree(degA, degB, f) {
  let adjB = degB;
  if (Math.abs(degB - degA) > 15) {
    adjB = degB > degA ? degB - 30 : degB + 30;
  }
  const result = degA + f * (adjB - degA);
  return ((result % 30) + 30) % 30;
}

// The angular distance between a transiting longitude and a natal point's
// longitude (angularSeparation) is unsigned by construction -- it folds to
// [0, 180]. That makes it safe for orb-width checks (|sep - angle| <= 3),
// but unsafe for exact-crossing detection at angle 0 (conjunction) or 180
// (opposition): sep - angle never changes sign there (it can only approach
// the boundary and turn back), so a sign-flip test silently misses every
// real exact crossing for those two aspect types. (This was found by
// testing this engine's own Saturn-return computation against a known
// crossing on 2027-03-28 -- see the phase-2 report for the parallel finding
// that scripts/generate-aspect-calendar.mjs has the identical gap in the
// already-shipped aspect_calendar table.)
//
// The fix: track the SIGNED circular difference to the nearest actual
// target longitude (natalLongitude +/- angle) instead. That value ranges
// continuously over (-180, 180] and genuinely crosses zero at exactness,
// for every aspect angle including 0 and 180.
function nearestTargetLongitude(transitingLon, natalLon, angle) {
  const t1 = ((natalLon + angle) % 360 + 360) % 360;
  if (angle === 0 || angle === 180) return t1; // conjunction/opposition: a single unambiguous point
  const t2 = ((natalLon - angle) % 360 + 360) % 360;
  return angularSeparation(transitingLon, t1) <= angularSeparation(transitingLon, t2) ? t1 : t2;
}

function signedCircularDiff(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// ── Natal point extraction ──────────────────────────────────────────────

const PLANET_KEYS = [
  ['Sun', 'sun'], ['Moon', 'moon'], ['Mercury', 'mercury'], ['Venus', 'venus'],
  ['Mars', 'mars'], ['Jupiter', 'jupiter'], ['Saturn', 'saturn'], ['Uranus', 'uranus'],
  ['Neptune', 'neptune'], ['Pluto', 'pluto'],
];

function toLongitude(sign, position) {
  const signName = SIGN_ABBR_MAP[sign] ?? sign;
  return SIGNS.indexOf(signName) * 30 + position;
}

// Returns the 13 natal receiving points: Sun through Pluto (10, including
// Moon), ASC, MC, and the nodal axis as one point (referenced by the natal
// North Node's longitude only).
export function extractNatalPoints(chartData) {
  const subject = chartData.subject;
  const points = [];

  for (const [name, key] of PLANET_KEYS) {
    const p = subject[key];
    points.push({
      name,
      isAxis: false,
      sign: SIGN_ABBR_MAP[p.sign] ?? p.sign,
      degree: p.position,
      longitude: toLongitude(p.sign, p.position),
      house: HOUSE_ORDINALS[p.house] ?? null,
    });
  }

  const asc = subject.ascendant;
  points.push({
    name: 'Ascendant',
    isAxis: false,
    sign: SIGN_ABBR_MAP[asc.sign] ?? asc.sign,
    degree: asc.position,
    longitude: toLongitude(asc.sign, asc.position),
    house: '1st House',
  });

  const mc = subject.medium_coeli;
  points.push({
    name: 'MC',
    isAxis: false,
    sign: SIGN_ABBR_MAP[mc.sign] ?? mc.sign,
    degree: mc.position,
    longitude: toLongitude(mc.sign, mc.position),
    house: HOUSE_ORDINALS[mc.house] ?? null,
  });

  const north = subject.mean_north_lunar_node;
  const south = subject.mean_south_lunar_node;
  points.push({
    name: 'Axis',
    isAxis: true,
    northSign: SIGN_ABBR_MAP[north.sign] ?? north.sign,
    southSign: SIGN_ABBR_MAP[south.sign] ?? south.sign,
    degree: north.position, // shared by construction (opposite points, same degree number)
    longitude: toLongitude(north.sign, north.position), // reference = North Node only
    northHouse: HOUSE_ORDINALS[north.house] ?? null,
    southHouse: HOUSE_ORDINALS[south.house] ?? null,
  });

  return points;
}

// ── Windowed contact computation (transiting body vs one fixed natal point) ──
//
// `axisInvolved` must be true whenever transitingBodyIsNodes is true OR
// natalPoint.isAxis is true (or both). It restricts the sign-consonant
// pre-filter to distances {0, 3, 6} and excludes {2, 4} -- see the AXIS
// ASPECT RESTRICTION note at the top of this file.
export function computeContactWindows(transitingSeries, natalPoint, axisInvolved) {
  const referenceSign = natalPoint.isAxis ? natalPoint.northSign : natalPoint.sign;
  const rows = [];
  let window = null;

  for (let k = 0; k < transitingSeries.length; k++) {
    const s = transitingSeries[k];
    const sep = angularSeparation(s.longitude, natalPoint.longitude);
    const dist = signDistance(s.sign, referenceSign);
    const aspect = SIGN_DIST_TO_ASPECT[dist] ?? null;
    const allowed = axisInvolved ? (dist === 0 || dist === 3 || dist === 6) : aspect !== null;
    const inOrb = allowed && Math.abs(sep - ASPECT_ANGLES[aspect]) <= ACTIVE_ORB;

    if (window && (!inOrb || aspect !== window.aspect)) {
      finalizeContactWindow(window, transitingSeries, natalPoint, rows);
      window = null;
    }
    if (inOrb) {
      if (!window) window = { aspect, dist, angle: ASPECT_ANGLES[aspect], idxs: [] };
      window.idxs.push(k);
    }
  }
  if (window) finalizeContactWindow(window, transitingSeries, natalPoint, rows); // series end -- caller fetches full range, so this is a true "still open" case, kept and flagged

  return rows;
}

function finalizeContactWindow(window, series, natalPoint, outRows) {
  const idxs = window.idxs;
  const windowStart = series[idxs[0]].date;
  const windowEnd = series[idxs[idxs.length - 1]].date;
  const stillOpenAtSeriesEnd = idxs[idxs.length - 1] === series.length - 1;

  // Signed circular difference to the nearest actual target longitude, per
  // day in the window -- see the note above computeContactWindows. This
  // replaces a naive sign-flip on (sep - angle), which cannot detect a
  // crossing at angle 0 or 180 (see the note above).
  const signed = idxs.map(idx => {
    const lon = series[idx].longitude;
    const target = nearestTargetLongitude(lon, natalPoint.longitude, window.angle);
    return signedCircularDiff(lon, target);
  });

  const crossings = [];
  for (let a = 0; a < idxs.length - 1; a++) {
    const d1 = signed[a];
    const d2 = signed[a + 1];
    if (d1 * d2 < 0) {
      const idxA = idxs[a];
      const idxB = idxs[a + 1];
      const f = Math.abs(d1) / (Math.abs(d1) + Math.abs(d2));
      const exactDegree = interpolateDegree(series[idxA].sign_degree, series[idxB].sign_degree, f);
      crossings.push({
        exactDate: series[idxA].date,
        exactDegree,
        transitingSignAtExact: series[idxA].sign,
        transitingRetrogradeAtExact: series[idxA].retrograde,
      });
    }
  }

  const base = { aspect: window.aspect, dist: window.dist, windowStart, windowEnd, stillOpenAtSeriesEnd };

  if (crossings.length === 0) {
    outRows.push({
      ...base,
      exactDate: null, passN: null, passM: null, exactDegree: null,
      transitingSign: series[idxs[0]].sign,
    });
    return;
  }
  crossings.forEach((c, i) => {
    outRows.push({
      ...base,
      exactDate: c.exactDate, passN: i + 1, passM: crossings.length,
      exactDegree: c.exactDegree, transitingSign: c.transitingSignAtExact,
      transitingRetrograde: c.transitingRetrogradeAtExact,
    });
  });
}

// A contact row's relevant date for phase/passage membership: exact_date if
// it perfects, otherwise window_start (per the spec's "no exact" dating).
export function contactAnchorDate(row) {
  return row.exactDate ?? row.windowStart;
}

export function windowOverlaps(row, startDate, endDate) {
  const s = row.windowStart;
  const e = row.windowEnd;
  return s <= endDate && e >= startDate;
}

// ── Passage SHAPE (STEP 5 fix) ──────────────────────────────────────────
//
// A passage's shape is what happened during its own time span (first
// ingress -> true final egress), independent of which passage's rows a
// given station is stamped with -- membership answers "whose passage is
// this row," shape answers "what happened during this span." An episode
// (a station_retrograde paired with its immediately-following
// station_direct) counts toward a passage's shape iff the episode's FULL
// span falls within [firstIngress, finalEgress] (a NULL bound is
// unbounded on that side). Because adjacent passages interleave, one
// physical episode can legitimately fall inside BOTH of two passages'
// bounds -- e.g. Saturn's one 2025 retrograde loop between Aries and
// Pisces counts toward both signs' shapes, honestly, since it is a true
// fact about both stories.
//
// stationRows: every station_retrograde/station_direct row for ONE body,
// date ascending (any sign -- not membership-filtered).
export function computeShape(stationRows, firstIngress, finalEgress) {
  const episodes = [];
  let pendingRetro = null;
  for (const r of stationRows) {
    if (r.event_type === 'station_retrograde') pendingRetro = r;
    else if (r.event_type === 'station_direct' && pendingRetro) {
      episodes.push({ retroDate: pendingRetro.date, directDate: r.date, crossesSign: pendingRetro.sign !== r.sign });
      pendingRetro = null;
    }
  }
  const inBounds = episodes.filter(e =>
    (firstIngress === null || e.retroDate >= firstIngress) &&
    (finalEgress === null || e.directDate <= finalEgress));
  const n = inBounds.length;
  const m = inBounds.filter(e => e.crossesSign).length;
  if (n === 0) return 'clean forward passage';
  if (n === 1 && m === 0) return 'one retrograde loop within the sign';
  if (n === 1 && m === 1) return 'one retrograde loop, carrying the body out of the sign and back';
  return `${n} retrograde episodes across this passage, ${m === 0 ? 'none of which' : `${m} of which`} carried the body out of the sign and back`;
}

// ── Passage SHAPE, structured per-segment form (per docs/brief-template-planet.md) ──
//
// Walks every motion segment across a passage's own bounds (first ingress to
// true final egress) in order, including any out-of-sign retrograde dip --
// membership answers "whose passage is this row," this answers "what
// happened during this span," same distinction as computeShape above, just
// rendered as the template's per-segment timeline instead of a summary
// sentence. Each line names the segment's own opening trigger (degree
// omitted -- already stated by the prior segment's own closing phrase),
// tagged [out of sign] whenever the segment's own recorded sign isn't the
// passage being described, followed by what closes it (the very next
// trigger in the body's full event sequence). A clean (no-dip) passage
// collapses to a single line, per the template's own note.
//
// bodyRows: every transit_calendar row for ONE body (any sign), date
// ascending, spanning from the passage's own first-ingress row through its
// own true-final-egress row (the next sign's ingress-type row, dated at
// sign_egress_date) -- both endpoints included.
export function computeShapeSegments(bodyRows, passageSign) {
  function openingLabel(row) {
    const outOfSign = row.sign !== passageSign;
    const tag = outOfSign ? ' [out of sign]' : '';
    if (row.event_type === 'ingress') return `ingress direct${tag} ${row.date}`;
    if (row.event_type === 're_ingress') return `re-ingress direct${tag} ${row.date}`;
    if (row.event_type === 'retro_ingress') return `retro-ingress to ${row.sign}${tag} ${row.date}`;
    if (row.event_type === 'station_retrograde') return `station retrograde${outOfSign ? ` in ${row.sign}` : ''}${tag} ${row.date}`;
    if (row.event_type === 'station_direct') return `station direct${outOfSign ? ` in ${row.sign}` : ''}${tag} ${row.date}`;
    return `${row.event_type}${tag} ${row.date}`;
  }

  // "closed by" is phrased from the CURRENT segment's own sign: any sign
  // change reads as "egress to {sign}", EXCEPT arriving back at the
  // passage's own home sign, which reads as "re-ingress to {sign}" instead
  // (the return leg of a dip). No sign change means an in-sign station,
  // named with its degree (and its own sign, only when that sign isn't the
  // passage's home sign -- the degree was never stated before this point).
  function closingPhrase(fromRow, toRow) {
    if (toRow.sign !== fromRow.sign) {
      return toRow.sign === passageSign ? `re-ingress to ${toRow.sign}` : `egress to ${toRow.sign}`;
    }
    const outOfSign = toRow.sign !== passageSign;
    const degreeText = `${toRow.degree.toFixed(1)}°${outOfSign ? ` ${toRow.sign}` : ''}`;
    if (toRow.event_type === 'station_retrograde') return `station retrograde at ${degreeText}`;
    if (toRow.event_type === 'station_direct') return `station direct at ${degreeText}`;
    return toRow.event_type;
  }

  const segments = [];
  for (let i = 0; i < bodyRows.length - 1; i++) {
    const from = bodyRows[i];
    const to = bodyRows[i + 1];
    segments.push(`${openingLabel(from)}, closed by ${closingPhrase(from, to)} on ${to.date}`);
  }
  return segments;
}

// ── Standing structural guards (STEP 3) ───────────────────────────────
//
// Both guards below are verification, not filters: they hard-throw if a
// row that has already been accepted somewhere turns out to be wrong,
// rather than silently excluding it. Two distinct failure modes, found
// while tracing the Saturn PASSAGE_CONTACTS bug (see SPEC.md and the
// build plan):
//
// SIGN-CONSONANCE: does this row's own claimed aspect match its own
// recorded sign, independent of the code path that computed it? Since
// `aspect` is *derived from* sign-distance at window-open time, this is
// a self-consistency canary -- it should never actually fire, and its
// value is catching a future algorithmic mistake, not this bug.
//
// PASSAGE-CONSONANCE (this build's addition -- flagged for review,
// not literally requested but follows directly from the bug found):
// does this row's recorded sign match the sign of the passage it was
// admitted into? THIS is the guard that would have caught the actual
// historical bug -- a Pisces-sign sextile-to-natal-Neptune window was
// admitted into Saturn's Aries passage's PASSAGE_CONTACTS because its
// windowEnd (2026-02-14, the day dated by the "earlier bracketing
// snapshot" convention -- see SPEC.md 11A.4) numerically coincided with
// the Aries passage's own ingress date, even though the row's own
// recorded sign was never Aries. Passage membership must be decided by
// sign match (see filterAndGroupForPassage below), never by date-range
// overlap -- this assertion is the independent double-check on that.

export function assertSignConsonant(row, referenceSign) {
  const expectedDist = signDistance(row.transitingSign, referenceSign);
  const expectedAspect = SIGN_DIST_TO_ASPECT[expectedDist] ?? null;
  if (row.aspect !== expectedAspect) {
    throw new Error(
      `SIGN-CONSONANCE VIOLATION: row claims aspect '${row.aspect}' to a point in `
      + `${referenceSign}, but its recorded transiting sign (${row.transitingSign}) has `
      + `sign-distance ${expectedDist} from ${referenceSign}, which is `
      + `'${expectedAspect ?? 'no aspect'}', not '${row.aspect}'. Refusing to proceed.`,
    );
  }
}

export function assertPassageConsonant(row, passageSign) {
  if (row.transitingSign !== passageSign) {
    throw new Error(
      `PASSAGE-CONSONANCE VIOLATION: a contact row recorded in sign ${row.transitingSign} `
      + `was admitted into the ${passageSign} passage's contact set. This is exactly the `
      + `bug class found in Saturn's PASSAGE_CONTACTS (a prior-passage window leaking in via `
      + `a dating-boundary coincidence, see SPEC.md) -- refusing to proceed.`,
    );
  }
}

// ── Passage-scoped windows and passes (STEP 4, and the STEP 2 Bug A/B fix) ──
//
// WINDOW = one continuous orb engagement. PASS = one exact perfection.
// Both are counted ACROSS THE PASSAGE -- the transiting body's entire
// residency in its home sign, per the PASSAGE definition in SPEC.md 11A.2
// (first ingress to FINAL egress, including any interval where it
// retrogrades out of the sign and back) -- never within a single window.
// The two counters are fully independent: a body that wobbles inside orb
// without ever leaving it can produce 2 passes in 1 window; a body that
// perfects, exits the sign, re-enters, and perfects twice more produces
// passes 1, 2, 3 of 3 across however many windows that took -- never 1 of
// 1 then 1 of 2.
//
// PASSAGE MEMBERSHIP (the actual STEP 2 Bug A/B fix): a row belongs to
// "this passage" iff it (a) overlaps the passage's date range AND (b) its
// own recorded sign (row.transitingSign) equals the passage's home sign
// -- BOTH conditions, not sign alone. Date range alone is what let a
// closed-out Pisces window bleed into the Aries passage's summary (its
// windowEnd numerically coincided with the Aries ingress date -- see the
// note above assertPassageConsonant); sign alone is wrong in the other
// direction for a fast body, which revisits the same sign many times
// across the tracked 2023-2046 range (Mercury returns to Cancer roughly
// yearly) -- sign-only filtering would merge every one of those unrelated
// passages' windows into "this passage." Date range narrows to roughly
// the right era; the sign check then independently verifies the narrowed
// set didn't pick up a boundary-adjacent neighbor. Within the admitted
// rows, grouping for both WINDOW and PASS counts is keyed by aspect
// identity (row.aspect, or row.dist for axis-involved contacts) -- not by
// natal point alone, which is the second half of the historical bug: it
// merged a real sextile and a real square to the same point into one
// falsely-summed, mislabeled line.
export function filterAndGroupForPassage(allRowsForPoint, passageSign, passageStart, passageEnd) {
  const dateFiltered = allRowsForPoint.filter(r => windowOverlaps(r, passageStart, passageEnd));
  const inPassage = dateFiltered.filter(r => r.transitingSign === passageSign);
  for (const row of inPassage) assertPassageConsonant(row, passageSign);

  const byAspectKey = new Map();
  for (const row of inPassage) {
    const aspectKey = row.axisInvolved ? `axis-dist${row.dist}` : row.aspect;
    if (!byAspectKey.has(aspectKey)) byAspectKey.set(aspectKey, []);
    byAspectKey.get(aspectKey).push(row);
  }

  const enriched = [];
  for (const rows of byAspectKey.values()) {
    const windowKeys = [];
    const seenWindows = new Set();
    for (const r of rows) {
      const wk = `${r.windowStart}|${r.windowEnd}`;
      if (!seenWindows.has(wk)) { seenWindows.add(wk); windowKeys.push(wk); }
    }
    const windowIndexOf = new Map(windowKeys.map((wk, i) => [wk, i + 1]));
    const windowCount = windowKeys.length;

    const exactRows = rows.filter(r => r.exactDate).sort((a, b) => (a.exactDate < b.exactDate ? -1 : 1));
    const passIndexOf = new Map(exactRows.map((r, i) => [r, i + 1]));
    const passCount = exactRows.length;

    for (const r of rows) {
      const wk = `${r.windowStart}|${r.windowEnd}`;
      enriched.push({
        ...r,
        passageWindowIndex: windowIndexOf.get(wk),
        passageWindowCount: windowCount,
        passagePassIndex: r.exactDate ? passIndexOf.get(r) : null,
        // Group-level total -- visible on every row in the group (exact or
        // not), so a no-exact row picked as PASSAGE_CONTACTS' representative
        // sample still reports the group's real total, never a false zero.
        passagePassCount: passCount,
      });
    }
  }
  return enriched;
}

// ── Activation qualification (STEP 6) ───────────────────────────────────
//
// An activation is a sky aspect that was effectively exact (within the 1
// degree band) while the host contact was in orb -- a deterministic form
// of the practitioner's trigger-transit judgment. Replaces the old
// window-overlap qualification test entirely; no third natal-point
// contact is required on the other body's side.
const EXACT_BAND = 1;

// focusSeries/otherSeries: sky_positions rows (date, longitude) already
// covering at least [hostWindowStart, hostWindowEnd]. aspectName: one of
// the five majors. Returns the anchor date (closest approach within the
// shared span; ties resolve to the earlier day) or null if the pair is
// never within the exact band while the host contact is in orb.
export function findActivationAnchor(focusSeries, otherSeries, aspectName, hostWindowStart, hostWindowEnd) {
  const angle = ASPECT_ANGLES[aspectName];
  const otherByDate = new Map(otherSeries.map(r => [r.date, r]));
  let best = null;
  for (const f of focusSeries) {
    if (f.date < hostWindowStart || f.date > hostWindowEnd) continue;
    const o = otherByDate.get(f.date);
    if (!o) continue;
    const sep = angularSeparation(f.longitude, o.longitude);
    const diff = Math.abs(sep - angle);
    if (diff > EXACT_BAND) continue;
    if (!best || diff < best.diff || (diff === best.diff && f.date < best.date)) {
      best = { date: f.date, diff };
    }
  }
  return best ? best.date : null;
}

// ── Copresence ─────────────────────────────────────────────────────────

export function natalCopresence(transitedSign, natalPoints) {
  const matches = [];
  for (const p of natalPoints) {
    if (p.isAxis) {
      if (p.northSign === transitedSign) matches.push({ name: 'Axis (North Node end)', degree: p.degree, house: p.northHouse });
      if (p.southSign === transitedSign) matches.push({ name: 'Axis (South Node end)', degree: p.degree, house: p.southHouse });
    } else if (p.sign === transitedSign) {
      matches.push({ name: p.name, degree: p.degree, house: p.house });
    }
  }
  return matches;
}

// otherBodySeries: sky_positions rows (date, sign) for one other tracked
// body, already restricted to the phase's date range by the caller.
export function skyCopresenceSpans(otherBodySeries, transitedSign) {
  const spans = [];
  let runStart = null;
  let prevDate = null;
  for (const row of otherBodySeries) {
    if (row.sign === transitedSign) {
      if (!runStart) runStart = row.date;
      prevDate = row.date;
    } else if (runStart) {
      spans.push({ start: runStart, end: prevDate });
      runStart = null;
    }
  }
  if (runStart) spans.push({ start: runStart, end: prevDate });
  return spans;
}

// ── Eclipse-to-natal catch ────────────────────────────────────────────
//
// RULING: a natal point is caught if within 3 degrees of the eclipse
// degree in EITHER the eclipse's own sign OR the directly opposite sign
// (the eclipse is a lunation on the axis). Reports which end caught it.
export function eclipseCatches(eclipseRow, natalPoints, orb = 3) {
  const signA = eclipseRow.body_1_sign; // Sun-derived sign, both eclipse types
  const signB = SIGNS[(SIGNS.indexOf(signA) + 6) % 12];
  const deg = eclipseRow.exact_degree;
  const catches = [];

  function check(name, sign, pointDegree, extra) {
    if (sign === signA && Math.abs(pointDegree - deg) <= orb) catches.push({ name, sign, degree: pointDegree, end: 'same sign as eclipse', ...extra });
    if (sign === signB && Math.abs(pointDegree - deg) <= orb) catches.push({ name, sign, degree: pointDegree, end: 'opposite sign from eclipse', ...extra });
  }

  for (const p of natalPoints) {
    if (p.isAxis) {
      check('Axis (North Node end)', p.northSign, p.degree, { house: p.northHouse });
      check('Axis (South Node end)', p.southSign, p.degree, { house: p.southHouse });
    } else {
      check(p.name, p.sign, p.degree, { house: p.house });
    }
  }
  return catches;
}

// ── Speed classification (for SKY_CONTACT placement -- see assemble-brief.mjs) ──

export const SLOW_BODIES = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
export const FAST_BODIES = new Set(['Sun', 'Mercury', 'Venus', 'Mars']);
export function isSlowPair(bodyA, bodyB) {
  return SLOW_BODIES.has(bodyA) && SLOW_BODIES.has(bodyB);
}

// ── ID minting (deterministic; regeneration from identical data reproduces identical IDs) ──

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

// Activation fact ID: canonical regardless of which body's brief renders it
// (the RULING requires identical facts attached in both directions), so it
// is keyed off the underlying aspect_calendar row's own ID plus the natal
// point caught -- never off the "focus body," which would produce two
// different IDs for what is structurally one fact.
export function mintActivationId(skyId, natalPointName) {
  return `${skyId}-activates-natal-${slug(natalPointName)}`;
}

// Eclipse-to-transit activation fact ID (RULING 4).
export function mintEclipseTransitActivationId(eclipseId, transitingBody) {
  return `${eclipseId}-activates-transiting-${slug(transitingBody)}`;
}

// passageCounts: { n, m } -- the PASSAGE-scoped pass index/count (see
// filterAndGroupForPassage above), NOT the row's own within-window
// crossing index. This is the STEP 4 semantic change: p{n}of{m} in the
// ID now counts passes across the whole passage, never within one window.
export function mintContactId(transitingBody, aspect, natalPointName, row, passageCounts) {
  const body = slug(transitingBody);
  const point = slug(natalPointName);
  const suffix = row.exactDate
    ? `${row.exactDate}-p${passageCounts.n}of${passageCounts.m}`
    : `${row.windowStart}-noexact`;
  return `${body}-${aspect}-natal-${point}-${suffix}`;
}

// kind: 'conjunct-node-north' | 'conjunct-node-south' | 'square-node-axis'.
// natalPointName is always included -- 'axis' when the natal side IS the
// axis, otherwise the specific point's name (e.g. 'Moon') -- so an ID is
// never ambiguous between "Nodes square the natal axis" and "Nodes square
// natal Moon," which land on the same dist value (3) but are different
// events to different points.
export function mintAxisContactId(transitingBody, kind, natalPointName, row, passageCounts) {
  const body = slug(transitingBody);
  const point = slug(natalPointName);
  const suffix = row.exactDate
    ? `${row.exactDate}-p${passageCounts.n}of${passageCounts.m}`
    : `${row.windowStart}-noexact`;
  return `${body}-${kind}-${point}-${suffix}`;
}

// Labels an axis-involved contact row (dist 0, 3, or 6). `transitingIsAxis`
// is true when the transiting body is Nodes; `natalPoint` is the full point
// object (natalPoint.isAxis distinguishes "target is the natal axis" from
// "target is some other point that happens to sit at a consonant
// sign-distance from the transiting axis," e.g. Nodes square natal Moon).
export function labelAxisContact(dist, transitingIsAxis, natalPoint) {
  const natalIsAxis = natalPoint.isAxis;
  const pointName = natalIsAxis ? 'the natal axis' : `natal ${natalPoint.name}`;

  if (dist === 3) {
    const label = transitingIsAxis
      ? `${natalIsAxis ? 'The natal axis' : `Natal ${natalPoint.name}`} squares the nodal axis`
      : `squares ${pointName}`;
    return { kind: 'square-node-axis', label };
  }
  if (dist === 0) {
    if (transitingIsAxis && natalIsAxis) return { kind: 'conjunct-node-north', label: 'transiting North Node conjunct natal North Node (South conjunct South, one event -- nodal return)' };
    if (transitingIsAxis) return { kind: 'conjunct-node-north', label: `transiting North Node conjunct ${pointName} (South Node opposite)` };
    return { kind: 'conjunct-node-north', label: `conjunct natal North Node, opposite natal South Node` };
  }
  // dist === 6
  if (transitingIsAxis && natalIsAxis) return { kind: 'conjunct-node-south', label: 'transiting North Node opposite natal North Node = conjunct natal South Node (one event)' };
  if (transitingIsAxis) return { kind: 'conjunct-node-south', label: `transiting South Node conjunct ${pointName} (North Node opposite)` };
  return { kind: 'conjunct-node-south', label: `conjunct natal South Node, opposite natal North Node` };
}
