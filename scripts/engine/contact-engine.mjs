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
    if (sign === signA && Math.abs(pointDegree - deg) <= orb) catches.push({ name, end: 'same sign as eclipse', ...extra });
    if (sign === signB && Math.abs(pointDegree - deg) <= orb) catches.push({ name, end: 'opposite sign from eclipse', ...extra });
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

// ── ID minting (deterministic; regeneration from identical data reproduces identical IDs) ──

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

export function mintContactId(transitingBody, aspect, natalPointName, row) {
  const body = slug(transitingBody);
  const point = slug(natalPointName);
  const suffix = row.exactDate
    ? `${row.exactDate}-p${row.passN}of${row.passM}`
    : `${row.windowStart}-noexact`;
  return `${body}-${aspect}-natal-${point}-${suffix}`;
}

// kind: 'conjunct-node-north' | 'conjunct-node-south' | 'square-node-axis'.
// natalPointName is always included -- 'axis' when the natal side IS the
// axis, otherwise the specific point's name (e.g. 'Moon') -- so an ID is
// never ambiguous between "Nodes square the natal axis" and "Nodes square
// natal Moon," which land on the same dist value (3) but are different
// events to different points.
export function mintAxisContactId(transitingBody, kind, natalPointName, row) {
  const body = slug(transitingBody);
  const point = slug(natalPointName);
  const suffix = row.exactDate
    ? `${row.exactDate}-p${row.passN}of${row.passM}`
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
