// Computes the ECLIPSED body's own sign-consonant aspects at each eclipse
// instant and loads them into eclipse_aspects. Fixes the CONFIGURATION
// field's current bug: it's computed from the Sun's aspects for every
// eclipse, which is wrong for a Lunar Eclipse (the eclipsed body there is
// the Moon, 180 degrees away, so its aspects differ). See docs/SPEC.md and
// scripts/create_eclipse_aspects.sql for the full ground rules.
//
// ANCHOR (the eclipsed body): Moon for a Lunar Eclipse, Sun for a Solar
// Eclipse. Its sign/degree at the eclipse instant is read STRAIGHT FROM the
// eclipse's own aspect_calendar row (body_1_sign/exact_degree for solar;
// body_2_sign/exact_degree for lunar -- body_2_sign is already the derived
// opposite sign, per load-eclipses.mjs) -- never re-derived from
// sky_positions. This matters concretely: two eclipses (2031-05-21,
// 2039-06-21) have hand-corrected signs/degrees in their aspect_calendar
// row (see BOUNDARY_CORRECTIONS in load-eclipses.mjs); reading from the
// eclipse row, not recomputing, carries those corrections through
// automatically. NO new positions are computed anywhere in this script.
//
// OTHER BODIES: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune,
// Pluto -- the same 8 for every eclipse. (aspect_calendar tracks Sun-Pluto;
// the anchor itself and the OTHER luminary are excluded -- the other
// luminary because that pairing is the eclipse's own defining axis, not a
// configuration. Since the anchor is always one luminary and the excluded
// body is always the other, this always nets out to the same 8 bodies.)
// Their real sign/degree/longitude/retrograde come from their own
// sky_positions row on the eclipse date.
//
// ASPECT STANDARD: identical to aspect_calendar -- sign-consonant only (the
// same SIGN_DIST_TO_ASPECT map), 3 degree active orb, no separate "exact"
// state (this is a snapshot at one frozen instant, not a moving window, so
// there's no window/pass/exact_date concept here -- just the aspect and its
// orb at that instant).
//
// A body with no qualifying aspect gets no row -- no "none" placeholder
// rows, matching aspect_calendar's own pattern.
//
// Deterministic and idempotent: identical aspect_calendar/sky_positions
// data always produces identical rows and IDs. Re-running upserts on id.
// No API calls of any kind -- pure Supabase reads, local math, one
// Supabase write.
//
// Usage: node --env-file=.env.local scripts/generate-eclipse-aspects.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const OTHER_BODIES = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

// Identical to scripts/generate-aspect-calendar.mjs -- same standard, reused
// on purpose rather than reimplemented.
const ASPECT_ANGLES = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const SIGN_DIST_TO_ASPECT = { 0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition' };
const ACTIVE_ORB = 3;

function signDistance(sign1, sign2) {
  const i1 = SIGNS.indexOf(sign1);
  const i2 = SIGNS.indexOf(sign2);
  const diff = Math.abs(i1 - i2);
  return Math.min(diff, 12 - diff);
}

function angularSeparation(lon1, lon2) {
  const diff = Math.abs(lon1 - lon2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Anchor longitude is RECONSTRUCTED from the eclipse row's own sign+degree
// (no sky_positions lookup for the anchor -- see header comment). This is
// the "frozen instant" value the ground rules specify.
function longitudeFromSignDegree(sign, degree) {
  return SIGNS.indexOf(sign) * 30 + degree;
}

async function fetchEclipses() {
  const { data, error } = await supabase
    .from('aspect_calendar')
    .select('id, event, exact_date, body_1_sign, body_2_sign, exact_degree')
    .in('event', ['Solar Eclipse', 'Lunar Eclipse'])
    .order('exact_date', { ascending: true });
  if (error) throw new Error(`Read failed for aspect_calendar eclipses: ${error.message}`);
  return data;
}

async function fetchOtherBodyPositions(dates) {
  const PAGE_SIZE = 1000;
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('sky_positions')
      .select('date, body, sign, sign_degree, longitude, retrograde')
      .in('body', OTHER_BODIES)
      .in('date', dates)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Read failed for sky_positions: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  // Map: date -> body -> row
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.date)) map.set(r.date, new Map());
    map.get(r.date).set(r.body, r);
  }
  return map;
}

function computeEclipseAspects(eclipse, positionsOnDate) {
  const isLunar = eclipse.event === 'Lunar Eclipse';
  const anchorBody = isLunar ? 'Moon' : 'Sun';
  const anchorSign = isLunar ? eclipse.body_2_sign : eclipse.body_1_sign;
  const anchorDegree = eclipse.exact_degree; // identical value for both eclipse types, per load-eclipses.mjs
  const anchorLon = longitudeFromSignDegree(anchorSign, anchorDegree);

  const rows = [];
  for (const otherBody of OTHER_BODIES) {
    const pos = positionsOnDate.get(otherBody);
    if (!pos) throw new Error(`Missing sky_positions row for ${otherBody} on ${eclipse.exact_date}`);

    const dist = signDistance(anchorSign, pos.sign);
    const aspect = SIGN_DIST_TO_ASPECT[dist] ?? null;
    if (!aspect) continue;

    const sep = angularSeparation(anchorLon, pos.longitude);
    const orb = Math.abs(sep - ASPECT_ANGLES[aspect]);
    if (orb > ACTIVE_ORB) continue;

    rows.push({
      id: `${eclipse.id}-${aspect}-${otherBody.toLowerCase()}`,
      eclipse_id: eclipse.id,
      eclipse_date: eclipse.exact_date,
      eclipse_event: eclipse.event,
      anchor_body: anchorBody,
      anchor_sign: anchorSign,
      anchor_degree: anchorDegree,
      other_body: otherBody,
      other_body_sign: pos.sign,
      other_body_degree: pos.sign_degree,
      other_body_retrograde: pos.retrograde,
      aspect,
      orb,
    });
  }
  return rows;
}

async function main() {
  const eclipses = await fetchEclipses();
  const dates = [...new Set(eclipses.map((e) => e.exact_date))];
  const positions = await fetchOtherBodyPositions(dates);

  const allRows = [];
  for (const eclipse of eclipses) {
    const positionsOnDate = positions.get(eclipse.exact_date);
    if (!positionsOnDate) throw new Error(`Missing sky_positions for date ${eclipse.exact_date}`);
    allRows.push(...computeEclipseAspects(eclipse, positionsOnDate));
  }

  console.log(`Computed ${allRows.length} eclipse-aspect rows across ${eclipses.length} eclipses (${eclipses.filter(e => e.event === 'Solar Eclipse').length} solar, ${eclipses.filter(e => e.event === 'Lunar Eclipse').length} lunar).`);

  const { error } = await supabase
    .from('eclipse_aspects')
    .upsert(allRows, { onConflict: 'id' });
  if (error) throw new Error(`Supabase write failed: ${error.message}`);

  console.log('Write complete.');
}

// Guard against running on import: this script writes to a live table.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
