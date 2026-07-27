// Computes the ECLIPSED body's own sign-consonant aspects at each eclipse's
// TRUE INSTANT (docs/SPEC.md §11A.10) and loads them into eclipse_aspects.
//
// ANCHOR (the eclipsed body): Moon for a Lunar Eclipse, Sun for a Solar
// Eclipse. Its sign/degree is read from the eclipse's own aspect_calendar
// row (body_1_sign/exact_degree for solar; body_2_sign/exact_degree for
// lunar) -- that row is itself now written at the true instant by
// scripts/load-eclipses.mjs, so this stays a single source of truth for the
// anchor rather than a second, possibly-drifting computation of the same
// number.
//
// OTHER BODIES: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune,
// Pluto -- the same 8 for every eclipse (the anchor and the OTHER luminary
// are excluded; see header note in create_eclipse_aspects.sql). TRUE-INSTANT
// BASIS: their sign/degree/longitude/retrograde now come fresh from
// scripts/lib/eclipse-true-instant.mjs at the eclipse's exact syzygy
// instant, NOT from their 00:00 UT sky_positions snapshot -- a snapshot up
// to ~1 degree off the true instant is exactly what can flip a near-orb-edge
// aspect (docs/SPEC.md §11A.10; two real cases already found: 2027-08-02 and
// 2045-08-12, both Sun-Neptune).
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
// WRITE MODEL -- delete-then-insert, not upsert (changed from the prior
// version of this script): the true-instant recompute can make a
// PREVIOUSLY qualifying aspect stop qualifying (position shifts past 3
// degrees) as well as make a new one start qualifying. A plain upsert can
// only add/update rows -- it would leave a stale row behind for an aspect
// that no longer exists. This script instead deletes every existing
// eclipse_aspects row for the eclipses it's about to recompute, then
// inserts the freshly computed set, so the table always reflects exactly
// the current qualifying aspects, nothing stale.
//
// Deterministic: identical aspect_calendar/true-instant engine output
// always produces identical rows and IDs. No API calls of any kind -- pure
// Supabase reads, local math (astronomy-engine), one delete + one insert.
//
// Usage: node --env-file=.env.local scripts/generate-eclipse-aspects.mjs

import { createClient } from '@supabase/supabase-js';
import { recomputeEclipse, SIGNS } from './lib/eclipse-true-instant.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

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
// (read from aspect_calendar, itself true-instant -- see header comment).
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

function computeEclipseAspects(eclipse) {
  const isLunar = eclipse.event === 'Lunar Eclipse';
  const anchorBody = isLunar ? 'Moon' : 'Sun';
  const anchorSign = isLunar ? eclipse.body_2_sign : eclipse.body_1_sign;
  const anchorDegree = eclipse.exact_degree; // identical value for both eclipse types, per load-eclipses.mjs
  const anchorLon = longitudeFromSignDegree(anchorSign, anchorDegree);

  // Fresh true-instant positions for all 10 tracked bodies; only the 8
  // OTHER_BODIES are used here (the anchor comes from aspect_calendar, per
  // the header comment).
  const { positions } = recomputeEclipse(eclipse.exact_date, isLunar ? 'lunar' : 'solar');

  const rows = [];
  for (const otherBody of OTHER_BODIES) {
    const pos = positions[otherBody];

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
      other_body_degree: pos.degree,
      other_body_retrograde: pos.retrograde,
      aspect,
      orb,
    });
  }
  return rows;
}

async function main() {
  const eclipses = await fetchEclipses();
  const eclipseIds = eclipses.map((e) => e.id);

  const allRows = [];
  for (const eclipse of eclipses) {
    allRows.push(...computeEclipseAspects(eclipse));
  }

  console.log(`Computed ${allRows.length} eclipse-aspect rows across ${eclipses.length} eclipses (${eclipses.filter(e => e.event === 'Solar Eclipse').length} solar, ${eclipses.filter(e => e.event === 'Lunar Eclipse').length} lunar), at the true syzygy instant.`);

  const { error: deleteError, count: deletedCount } = await supabase
    .from('eclipse_aspects')
    .delete({ count: 'exact' })
    .in('eclipse_id', eclipseIds);
  if (deleteError) throw new Error(`Supabase delete failed: ${deleteError.message}`);
  console.log(`Deleted ${deletedCount ?? 'unknown-count'} existing eclipse_aspects row(s) for these ${eclipseIds.length} eclipses.`);

  const { error: insertError } = await supabase
    .from('eclipse_aspects')
    .insert(allRows);
  if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);

  console.log(`Inserted ${allRows.length} row(s). Write complete.`);
}

// Guard against running on import: this script writes to a live table.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
