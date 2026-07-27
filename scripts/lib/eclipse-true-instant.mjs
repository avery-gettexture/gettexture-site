// Shared engine for the eclipse true-instant recompute (docs/SPEC.md
// §11A.10). Computes, self-contained and offline (no API calls, no reads of
// sky_positions/aspect_calendar), the exact Sun-Moon syzygy instant for a
// given eclipse and the true geocentric ecliptic position of all 10 tracked
// bodies (Sun, Moon, Mercury-Pluto) at that instant.
//
// GENERATION ENGINE: astronomy-engine (npm, MIT license, pure JS, no data
// files). Positions use Astronomy.GeoVector(body, time, aberration=true)
// converted via Astronomy.Ecliptic() -- apparent geocentric ecliptic
// longitude, true equinox of date -- applied uniformly to all 10 bodies
// (verified against the library's own SunPosition/EclipticGeoMoon
// convenience functions: differences are sub-arcsecond, i.e. the two code
// paths agree).
//
// SYZYGY DEFINITION: solar eclipse = exact Sun-Moon conjunction (geocentric
// ecliptic longitude difference = 0 deg); lunar eclipse = exact opposition
// (difference = 180 deg). Found by bisection on the signed, wrapped
// longitude difference, bracketed within +/-36 hours of the eclipse's
// currently-stored calendar date (relative Sun-Moon motion is smooth and
// monotonic in that direction over a span this short -- the full relative
// cycle is ~29.53 days, so there is exactly one crossing in this window).

import * as Astronomy from 'astronomy-engine';

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const TRACKED_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

const BRACKET_HALF_WIDTH_DAYS = 1.5; // +/-36 hours
const STEP_DAYS = 1 / 24; // 1 hour scan step to locate the sign-change bracket
const BISECTION_TOLERANCE_DAYS = 1e-8; // ~0.86 ms -- far tighter than needed

// Wrap to (-180, 180].
function normalizeSigned(deg) {
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

export function eclipticLongitude(bodyName, time) {
  const vec = Astronomy.GeoVector(Astronomy.Body[bodyName], time, true);
  return Astronomy.Ecliptic(vec).elon;
}

export function longitudeToSignDegree(lonDeg) {
  const norm = ((lonDeg % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30) % 12;
  return { sign: SIGNS[signIndex], degree: norm - signIndex * 30 };
}

// diff(t) for the syzygy we're solving: 0 at exact conjunction (solar) or
// exact opposition (lunar).
function syzygyDiff(time, kind) {
  const sunLon = eclipticLongitude('Sun', time);
  const moonLon = eclipticLongitude('Moon', time);
  let raw = moonLon - sunLon;
  if (kind === 'lunar') raw -= 180;
  return normalizeSigned(raw);
}

// Returns the AstroTime of the exact syzygy instant for one eclipse.
// kind: 'solar' | 'lunar'. seedDateStr: the eclipse's currently-stored
// exact_date (YYYY-MM-DD), used only to center the search bracket.
export function findSyzygyInstant(seedDateStr, kind) {
  const seed = Astronomy.MakeTime(new Date(`${seedDateStr}T00:00:00Z`));
  const start = seed.AddDays(-BRACKET_HALF_WIDTH_DAYS);
  const totalSteps = Math.round((2 * BRACKET_HALF_WIDTH_DAYS) / STEP_DAYS);

  let prevTime = start;
  let prevDiff = syzygyDiff(prevTime, kind);
  let bracket = null;

  for (let i = 1; i <= totalSteps; i++) {
    const t = start.AddDays(i * STEP_DAYS);
    const d = syzygyDiff(t, kind);
    // Looking for a negative-to-positive crossing (relative longitude is
    // steadily increasing -- Moon gains ~12.2 deg/day on the Sun on
    // average). A same-direction crossing this close to the seed date is
    // the true syzygy; ignore any (should not occur here) near +/-180 wrap.
    if (prevDiff < 0 && d >= 0) {
      bracket = [prevTime, prevDiff, t, d];
      break;
    }
    prevTime = t;
    prevDiff = d;
  }

  if (!bracket) {
    throw new Error(
      `No syzygy crossing found for seed ${seedDateStr} (${kind}) within +/-${BRACKET_HALF_WIDTH_DAYS} days -- eclipse date or kind may be wrong.`,
    );
  }

  let [tLo, dLo, tHi, dHi] = bracket;
  while (tHi.ut - tLo.ut > BISECTION_TOLERANCE_DAYS) {
    const tMid = Astronomy.MakeTime((tLo.ut + tHi.ut) / 2);
    const dMid = syzygyDiff(tMid, kind);
    if (dMid < 0) { tLo = tMid; dLo = dMid; } else { tHi = tMid; dHi = dMid; }
  }

  return tHi;
}

// Motion direction via central difference over +/-3 hours. Fine for our
// purposes (retrograde is a multi-day condition; a 6-hour window cleanly
// resolves direction without needing an instantaneous derivative).
export function isRetrograde(bodyName, time) {
  const dtDays = 3 / 24;
  const before = eclipticLongitude(bodyName, time.AddDays(-dtDays));
  const after = eclipticLongitude(bodyName, time.AddDays(dtDays));
  return normalizeSigned(after - before) < 0;
}

// Full 10-body position snapshot at an exact instant.
export function positionsAtInstant(time) {
  const out = {};
  for (const body of TRACKED_BODIES) {
    const lon = eclipticLongitude(body, time);
    const { sign, degree } = longitudeToSignDegree(lon);
    out[body] = {
      longitude: lon,
      sign,
      degree,
      retrograde: body === 'Sun' || body === 'Moon' ? false : isRetrograde(body, time),
    };
  }
  return out;
}

// Convert an astronomy-engine AstroTime to a Julian Day (UT) -- shared with
// the independent sweph validation script, which takes JD_UT directly.
export function toJulianDayUT(time) {
  return time.ut + 2451545.0;
}

// One-stop helper: given an eclipse's id/date/kind, returns the syzygy
// instant, the calendar UTC date it falls on (for the same-day sanity
// check), and the full 10-body position snapshot at that instant.
export function recomputeEclipse(seedDateStr, kind) {
  const time = findSyzygyInstant(seedDateStr, kind);
  const positions = positionsAtInstant(time);
  const isoInstant = time.date.toISOString();
  const instantUtcDate = isoInstant.slice(0, 10);
  return { time, isoInstant, instantUtcDate, positions };
}
