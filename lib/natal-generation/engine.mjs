// Pure natal-chart derivations owed by the engine per SPEC §4 / §11.2:
// decan, sect, degree flags, and a sign-consonant / widened-orb aspect
// engine computed fresh from longitudes. Only decan lookup touches
// Supabase (the existing `decan_reference` table); everything else here
// is pure math over chart_data already computed by the astrology proxy.
//
// WHY A FRESH ASPECT ENGINE: chart_data.aspects (written by the proxy at
// chart-creation time) is a flat angular calculation with NO sign-
// consonance check and a fixed ~8° cutoff regardless of aspect type --
// verified live on the dogfood chart (slug hejkhjq1zns5): 5 of 29 stored
// aspects are angle-in-range but not sign-consonant (e.g. Mercury Libra
// square Uranus Aquarius is a 4-sign gap, not the 3-sign gap a true
// square requires). SYNTHESIS_CALL_1_v12.md's locked parameters (§9 /
// §4.7) require 8°/6°/10° orbs, sign-consonant only -- this module
// recomputes aspects from raw longitudes rather than reusing the proxy's
// list. Approved by Avery during planning for this task.
//
// Reuses the transit engine's proven pure sign/longitude primitives
// (SIGNS, SIGN_ABBR_MAP, HOUSE_ORDINALS, signDistance, angularSeparation)
// rather than redefining them -- scripts/engine/contact-engine.mjs is a
// pure library with no Supabase dependency, safe to import from here.

import { createClient } from '@supabase/supabase-js';
import {
  SIGN_ABBR_MAP, HOUSE_ORDINALS, signDistance, angularSeparation,
} from '../../scripts/engine/contact-engine.mjs';

export { SIGN_ABBR_MAP, HOUSE_ORDINALS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Decan (SPEC §4.3: Chaldean order, looked up, never computed by hand) ───

let decanTableCache = null;

export async function loadDecanReference() {
  if (decanTableCache) return decanTableCache;
  const { data, error } = await supabase.from('decan_reference').select('*');
  if (error) throw new Error(`Could not load decan_reference: ${error.message}`);
  decanTableCache = data;
  return decanTableCache;
}

// signInput accepts either the 3-letter chart_data abbreviation or the
// full sign name. degreeInSign is 0-30 (chart_data's `position` field).
export async function computeDecan(signInput, degreeInSign) {
  const sign = SIGN_ABBR_MAP[signInput] ?? signInput;
  const decanNumber = Math.min(3, Math.floor(degreeInSign / 10) + 1);
  const table = await loadDecanReference();
  const row = table.find(r => r.sign === sign && r.decan_number === decanNumber);
  if (!row) throw new Error(`No decan_reference row for ${sign} decan ${decanNumber} (degree ${degreeInSign})`);
  return { ordinal: row.decan_ordinal, ruler: row.sub_ruler };
}

// ── Degree flags (SPEC §4.4: 29° anaretic, 0° ingress, nothing else) ───────

export function computeDegreeFlag(degreeInSign) {
  const d = Math.floor(degreeInSign);
  if (d === 29) return 'anaretic';
  if (d === 0) return 'ingress';
  return 'none';
}

// ── Sect (SPEC §4.5 -- whole-sign rule per this task's explicit brief:
// the Sun's OWN whole-sign house, not horizon/altitude math) ──────────────

const HOUSE_NUMBER = {
  First_House: 1, Second_House: 2, Third_House: 3, Fourth_House: 4,
  Fifth_House: 5, Sixth_House: 6, Seventh_House: 7, Eighth_House: 8,
  Ninth_House: 9, Tenth_House: 10, Eleventh_House: 11, Twelfth_House: 12,
};

export function computeSect(sunHouseKey) {
  const n = HOUSE_NUMBER[sunHouseKey];
  if (!n) throw new Error(`Unrecognized Sun house key for sect computation: ${sunHouseKey}`);
  return n <= 6 ? 'night' : 'day';
}

// ── Aspect engine (SPEC §4.7: 8° conj/opp/square/trine, +2° with a
// luminary involved; 6° sextile always; sign-consonant only -- the sign
// gap alone determines which aspect type is even eligible, so an
// angle-in-range, wrong-sign-gap contact is never returned) ────────────────

const ASPECT_TARGET_ANGLE = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const SIGN_GAP_TO_ASPECT = { 0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition' };

function orbThreshold(type, involvesLuminary) {
  if (type === 'sextile') return 6;
  return involvesLuminary ? 10 : 8;
}

// Returns { type, orb } or null. signA/signB must be full sign names.
export function computeAspect(lonA, signA, lonB, signB, involvesLuminary) {
  const gap = signDistance(signA, signB);
  const type = SIGN_GAP_TO_ASPECT[gap];
  if (!type) return null; // gap of 1 or 5: no sign relationship supports any aspect
  const angularDiff = angularSeparation(lonA, lonB);
  const residual = Math.abs(angularDiff - ASPECT_TARGET_ANGLE[type]);
  if (residual > orbThreshold(type, involvesLuminary)) return null;
  return { type, orb: Math.round(residual * 100) / 100 };
}

// ── Combined node axis (SPEC §24 / §4.1) ────────────────────────────────
//
// North and South are always exactly 180° apart, so a planet's angular
// residual to the axis is IDENTICAL on both ends -- only the named aspect
// type differs per end (conjunction<->opposition and sextile<->trine are
// complementary pairs; square is self-complementary, same type both
// ends). Because sextile (6° orb) and trine (8-10° orb) have different
// thresholds, the same residual can validate on only one end, or both:
//   - square: always self-paired -> one line, "square the nodal axis"
//   - conjunction/opposition: same threshold both ends -> always co-valid
//     when either validates -> dual-named line
//   - sextile/trine: co-valid when residual <= 6°; only the trine end
//     validates when 6° < residual <= 8-10° (read at its honest, wider
//     orb -- SPEC §4.7's orb-weight law) -> single-named line
//
// Verb forms for the axis phrasing, matching SYNTHESIS_CALL_1_v12.md §24/§27
// literally: "square the nodal axis," "conjunct the North Node (opposite
// the South Node)" -- conjunction/opposition take verb forms; square,
// sextile, and trine are unchanged in verb position.
const AXIS_VERB = { conjunction: 'conjunct', opposition: 'opposite', square: 'square', sextile: 'sextile', trine: 'trine' };

// Returns { display, orb, type } or null. `display` is the phrase after
// the subject planet's name, e.g. "square the nodal axis" or "conjunct
// the North Node (opposite the South Node)".
export function computeAxisAspect(lonP, signP, lonN, signN, lonS, signS, involvesLuminary) {
  const north = computeAspect(lonP, signP, lonN, signN, involvesLuminary);
  const south = computeAspect(lonP, signP, lonS, signS, involvesLuminary);
  if (!north && !south) return null;

  if (north?.type === 'square' || south?.type === 'square') {
    const hit = north?.type === 'square' ? north : south;
    return { display: 'square the nodal axis', orb: hit.orb, type: 'square' };
  }

  const parts = [];
  if (north) parts.push({ end: 'North', ...north });
  if (south) parts.push({ end: 'South', ...south });

  const primary = parts.find(p => p.type === 'conjunction' || p.type === 'sextile') ?? parts[0];
  const secondary = parts.find(p => p !== primary);

  if (secondary) {
    return {
      display: `${AXIS_VERB[primary.type]} the ${primary.end} Node (${AXIS_VERB[secondary.type]} the ${secondary.end} Node)`,
      orb: primary.orb,
      type: primary.type,
    };
  }
  return { display: `${AXIS_VERB[primary.type]} the ${primary.end} Node`, orb: primary.orb, type: primary.type };
}
