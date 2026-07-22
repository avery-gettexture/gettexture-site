// STEP D: engine-scale exercise. Everything validated so far has been one
// chart, three bodies, one phase each -- every code branch those cases
// don't hit has shipped unverified. This runs the assembler across all ten
// bodies (Sun-Pluto + Nodes), across the real dogfood chart, three
// synthetic charts (including one with RISING_SIGN_KNOWN: false), and five
// cusp-geometry charts (STEP 4 -- see cuspChart() below), across each
// body's prior/current/future phase, and asserts the STEP C structural
// differ on every result. No human reads the output -- the differ is the
// judge.
//
// Read-only: queries Supabase (sky_positions, transit_calendar,
// aspect_calendar, and the real reading only for the "real chart" case),
// writes nothing, makes no AI/API calls. Synthetic charts are plain JS
// objects passed to assembleBrief() via its options.reading override --
// never written to the readings table.
//
// Usage: node --env-file=.env.local scripts/exercise-engine.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { assembleBrief } from './engine/assemble-brief.mjs';
import { checkConformance } from './template-conformance.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TODAY = new Date().toISOString().slice(0, 10);
const TRACKED_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Nodes'];

const planetTemplate = readFileSync('./docs/brief-template-planet.md', 'utf8');
const nodesTemplate = readFileSync('./docs/brief-template-nodes.md', 'utf8');

// ── Synthetic charts ──────────────────────────────────────────────────
//
// Shape matches exactly what extractNatalPoints() reads from a real
// reading row (scripts/engine/contact-engine.mjs): subject.{sun,moon,...,
// ascendant,medium_coeli,mean_north_lunar_node,mean_south_lunar_node},
// each { sign: 3-letter abbr, position: 0-30, house: 'Nth_House' }.
// Illustrative placements only -- these are test fixtures for exercising
// code paths, not charts anyone will read, so they're not (and don't need
// to be) validated against a professional ephemeris the way real
// production data is (SPEC.md's ephemeris rule governs real subscriber
// charts, not synthetic test fixtures).
function point(sign, position, house) {
  return { sign, position, house };
}

const SYNTHETIC_SPREAD = {
  name: 'Synthetic — Spread',
  birth_time_known: true,
  chart_data: {
    subject: {
      sun: point('Ari', 10, 'First_House'),
      moon: point('Tau', 15, 'Second_House'),
      mercury: point('Gem', 5, 'Third_House'),
      venus: point('Can', 20, 'Fourth_House'),
      mars: point('Leo', 8, 'Fifth_House'),
      jupiter: point('Vir', 12, 'Sixth_House'),
      saturn: point('Lib', 25, 'Seventh_House'),
      uranus: point('Sco', 3, 'Eighth_House'),
      neptune: point('Sag', 18, 'Ninth_House'),
      pluto: point('Cap', 22, 'Tenth_House'),
      ascendant: point('Ari', 0),
      medium_coeli: point('Cap', 0, 'Tenth_House'),
      mean_north_lunar_node: point('Ari', 10, 'First_House'),
      mean_south_lunar_node: point('Lib', 10, 'Seventh_House'),
    },
  },
};

// RISING_SIGN_KNOWN: false -- exercises house-suffix suppression and
// natal-Moon-contact exclusion across every body.
const SYNTHETIC_NO_BIRTH_TIME = {
  name: 'Synthetic — No Birth Time',
  birth_time_known: false,
  chart_data: {
    subject: {
      sun: point('Leo', 22, 'First_House'),
      moon: point('Sco', 9, 'Fourth_House'),
      mercury: point('Vir', 14, 'Second_House'),
      venus: point('Can', 27, 'Twelfth_House'),
      mars: point('Cap', 1, 'Sixth_House'),
      jupiter: point('Pis', 19, 'Eighth_House'),
      saturn: point('Gem', 6, 'Eleventh_House'),
      uranus: point('Aqu', 28, 'Seventh_House'),
      neptune: point('Tau', 4, 'Tenth_House'),
      pluto: point('Sco', 16, 'Fourth_House'),
      ascendant: point('Leo', 15),
      medium_coeli: point('Tau', 15, 'Tenth_House'),
      mean_north_lunar_node: point('Sag', 2, 'Fifth_House'),
      mean_south_lunar_node: point('Gem', 2, 'Eleventh_House'),
    },
  },
};

// Clustered: most points packed into three adjacent signs, so many
// transiting bodies spend long stretches (whole phases, for the slow
// bodies) touching none of them -- deliberately increases the odds of
// hitting "a planet with no natal contacts in phase" across the matrix
// rather than leaving it to chance.
const SYNTHETIC_CLUSTERED = {
  name: 'Synthetic — Clustered',
  birth_time_known: true,
  chart_data: {
    subject: {
      sun: point('Can', 2, 'First_House'),
      moon: point('Can', 18, 'First_House'),
      mercury: point('Leo', 9, 'Second_House'),
      venus: point('Can', 25, 'First_House'),
      mars: point('Vir', 14, 'Third_House'),
      jupiter: point('Leo', 27, 'Second_House'),
      saturn: point('Can', 11, 'First_House'),
      uranus: point('Vir', 3, 'Third_House'),
      neptune: point('Leo', 16, 'Second_House'),
      pluto: point('Can', 29, 'First_House'),
      ascendant: point('Can', 0),
      medium_coeli: point('Ari', 0, 'Tenth_House'),
      mean_north_lunar_node: point('Vir', 20, 'Third_House'),
      mean_south_lunar_node: point('Pis', 20, 'Ninth_House'),
    },
  },
};

// STEP 4 (permanent test-matrix addition, SPEC.md's validation law): cusp
// geometry is its own GEOMETRIC test class, separate from aspect-type
// coverage -- the cusp-seam crossing-detection bug (SPEC.md's July 21,
// 2026 decision-log entry) was invisible to aspect-type coverage because
// it depends on how close a receiving point sits to a sign boundary, not
// which aspect is involved. Five charts, one per degree-within-sign,
// place EVERY receiving point at that same degree (spread across
// different signs only for house variety) so the whole 13-point/9-body/
// all-aspect surface gets swept at each distance from a cusp: exactly on
// it (0.0), just off it (0.5), mid-sign (15.0 -- the control, should
// behave identically to any other non-cusp chart), and approaching the
// FAR cusp from the other side (29.5, 29.9).
function cuspChart(name, degree) {
  const s = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
  const h = ['First_House', 'Second_House', 'Third_House', 'Fourth_House', 'Fifth_House', 'Sixth_House',
    'Seventh_House', 'Eighth_House', 'Ninth_House', 'Tenth_House', 'Eleventh_House', 'Twelfth_House'];
  return {
    name,
    birth_time_known: true,
    chart_data: {
      subject: {
        sun: point(s[0], degree, h[0]),
        moon: point(s[1], degree, h[1]),
        mercury: point(s[2], degree, h[2]),
        venus: point(s[3], degree, h[3]),
        mars: point(s[4], degree, h[4]),
        jupiter: point(s[5], degree, h[5]),
        saturn: point(s[6], degree, h[6]),
        uranus: point(s[7], degree, h[7]),
        neptune: point(s[8], degree, h[8]),
        pluto: point(s[9], degree, h[9]),
        ascendant: point(s[0], degree),
        medium_coeli: point(s[9], degree, h[9]),
        mean_north_lunar_node: point(s[10], degree, h[10]),
        mean_south_lunar_node: point(s[4], degree, h[4]), // opposite sign of the north node above
      },
    },
  };
}

const CUSP_CHARTS = [
  cuspChart('Cusp — 0.0°', 0.0),
  cuspChart('Cusp — 0.5°', 0.5),
  cuspChart('Cusp — mid-sign 15.0° (control)', 15.0),
  cuspChart('Cusp — 29.5°', 29.5),
  cuspChart('Cusp — 29.9°', 29.9),
];

async function fetchRealReading() {
  const { data, error } = await supabase.from('readings').select('chart_data, birth_time_known, name').eq('slug', 'hejkhjq1zns5').single();
  if (error || !data) throw new Error(`Could not load real reading: ${error?.message}`);
  return { ...data, name: 'Real — dogfood chart' };
}

// ── Phase reference-date selection ──────────────────────────────────────
//
// Transit timing doesn't depend on the chart, so this is computed once per
// body and reused across all four charts. "prior"/"future" are found
// generically (no hardcoded dates per body): the day before the current
// phase's own opening date lands in the previous phase; the day after the
// current phase's own close lands in the next one.
async function phaseReferenceDates(body) {
  const dateField = body === 'Nodes' ? 'date' : 'date';
  const { data: currentRows, error } = await supabase
    .from('transit_calendar').select('*').eq('body', body === 'Nodes' ? 'Nodes' : body)
    .lte(dateField, TODAY).order(dateField, { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  const current = currentRows[0];
  const currentEnd = current.phase_end_date ?? current.sign_egress_date;

  const priorRef = shiftDate(current.date, -1);
  const futureRef = currentEnd ? shiftDate(currentEnd, 1) : null;

  return { current: TODAY, prior: priorRef, future: futureRef };
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fullBriefText(body, text, counts) {
  const eclipseComponent = body === 'Nodes' ? `, ${counts.eclipseEntryCount} ECLIPSE` : '';
  return `${text}\n\n[counts] entries: ${counts.totalEntries} (${counts.natalCount} NATAL_CONTACT, ${counts.skyCount} SKY_CONTACT${eclipseComponent}); `
    + `activation facts: ${counts.activationCount}; eclipse-to-transit facts: ${counts.eclipseFactCount}`;
}

// ── Main exercise ─────────────────────────────────────────────────────

async function main() {
  console.log('ENGINE-SCALE EXERCISE (STEP D)');
  console.log('Read-only. No writes, no AI/API calls. Synthetic charts are in-memory only.\n');

  const realReading = await fetchRealReading();
  const charts = [realReading, SYNTHETIC_SPREAD, SYNTHETIC_NO_BIRTH_TIME, SYNTHETIC_CLUSTERED, ...CUSP_CHARTS];

  // One extra targeted case per the founder's explicit unusual-case list:
  // an eclipse hit on the piece's planet (Saturn, 2025-09-21 -- Solar
  // Eclipse 28.3° Virgo lands 0.25° from transiting Saturn's own position
  // that day, confirmed by direct query against aspect_calendar +
  // sky_positions before writing this script). Saturn's CURRENT phase
  // already covers "a dip phase opened by re-ingress" (its real current
  // phase opened via re-ingress on 2026-02-14), so no separate case is
  // needed for that one.
  const extraCases = [{ body: 'Saturn', label: 'eclipse-hit-2025-09-21', referenceDate: '2025-09-21' }];

  let total = 0;
  let passed = 0;
  const failures = [];
  const noContactCases = [];
  const reIngressCasesSeen = [];

  const phaseDatesByBody = {};
  for (const body of TRACKED_BODIES) {
    phaseDatesByBody[body] = await phaseReferenceDates(body);
  }

  for (const chart of charts) {
    for (const body of TRACKED_BODIES) {
      const { current, prior, future } = phaseDatesByBody[body];
      const phaseCases = [
        { label: 'current', referenceDate: current },
        { label: 'prior', referenceDate: prior },
        ...(future ? [{ label: 'future', referenceDate: future }] : []),
      ];
      for (const { label, referenceDate } of phaseCases) {
        total++;
        const caseId = `${chart.name} | ${body} | ${label} (ref ${referenceDate})`;
        try {
          const { text, counts } = await assembleBrief(body, { reading: chart, referenceDate });
          const fullText = fullBriefText(body, text, counts);
          const template = body === 'Nodes' ? nodesTemplate : planetTemplate;
          const variant = body === 'Nodes' ? 'nodes' : 'planet';
          const { pass, failures: diffFailures } = checkConformance(template, fullText, variant);
          if (pass) {
            passed++;
          } else {
            failures.push({ case: caseId, issues: diffFailures });
          }
          if (counts.natalCount === 0 && body !== 'Nodes') noContactCases.push(caseId);
          if (text.includes('re-ingress')) reIngressCasesSeen.push(caseId);
        } catch (err) {
          failures.push({ case: caseId, issues: [{ entry: '(assembly)', field: '(crash)', issue: err.message }] });
        }
      }
    }
  }

  for (const { body, label, referenceDate } of extraCases) {
    total++;
    const caseId = `Real — dogfood chart | ${body} | ${label} (ref ${referenceDate})`;
    try {
      const { text, counts } = await assembleBrief(body, { reading: realReading, referenceDate });
      const fullText = fullBriefText(body, text, counts);
      const { pass, failures: diffFailures } = checkConformance(planetTemplate, fullText, 'planet');
      const eclipseHit = text.includes('TYPE: ECLIPSE_ACTIVATION');
      if (pass) passed++; else failures.push({ case: caseId, issues: diffFailures });
      console.log(`[extra case] ${caseId}: differ ${pass ? 'PASS' : 'FAIL'}; ECLIPSE_ACTIVATION present: ${eclipseHit}`);
    } catch (err) {
      failures.push({ case: caseId, issues: [{ entry: '(assembly)', field: '(crash)', issue: err.message }] });
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`${total} briefs generated, ${passed} passed the structural differ, ${total - passed} failed.`);
  if (failures.length) {
    console.log('\nFAILURES:');
    for (const f of failures) {
      console.log(`  ${f.case}`);
      for (const issue of f.issues) console.log(`    - [${issue.entry} / ${issue.field}] ${issue.issue}`);
    }
  }
  console.log(`\nCases with zero NATAL_CONTACT entries in phase (unusual case 1 -- "no natal contacts"): ${noContactCases.length}`);
  noContactCases.slice(0, 5).forEach(c => console.log(`  - ${c}`));
  if (noContactCases.length > 5) console.log(`  ... and ${noContactCases.length - 5} more`);
  console.log(`\nCases whose SHAPE/OPENED_BY text mentions re-ingress (unusual case 3 -- "dip phase opened by re-ingress"): ${reIngressCasesSeen.length}`);
  reIngressCasesSeen.slice(0, 5).forEach(c => console.log(`  - ${c}`));
}

main().catch(err => {
  console.error(err.stack ?? err);
  process.exit(1);
});
