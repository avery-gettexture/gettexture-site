// Loads the 104 eclipse rows (2023-01-01 through 2046-07-31) into
// aspect_calendar. Source: NASA's Five Millennium Canon of Solar/Lunar
// Eclipses (eclipse.gsfc.nasa.gov), cross-checked against USNO (exact match,
// 2023-2026) and against sky_positions itself via
// scripts/verify-eclipse-dates.mjs (all 104 dates passed the lunation/node
// geometry check -- see that script's output for the margins).
//
// SIGN/DEGREE CONVENTION (ratified -- deliberate exception, do not "fix"):
// both body_1_sign and exact_degree always come from the SUN's own
// sky_positions row on the eclipse date, never the Moon's. The Sun moves
// under 1 degree/day, so its daily snapshot sits within about half a degree
// of the true eclipse moment; the Moon moves 13+ degrees/day, so its
// snapshot can be many degrees off and even land on the wrong side of a
// sign boundary. For a Solar Eclipse (conjunction), body_2_sign is the same
// as body_1_sign. For a Lunar Eclipse (opposition), body_2_sign is DERIVED
// as the sign exactly opposite body_1_sign -- never read from the Moon's
// row.
//
// SIGN-BOUNDARY VERIFICATION (ratified, one-time pass documented here so a
// re-run stays deterministic): any eclipse whose Sun-derived sign_degree
// comes out within 1 degree of a sign boundary (>29.0 or <1.0) is at risk of
// the Sun actually crossing that boundary later the same UTC day the 00:00
// snapshot was taken from -- which would mean the snapshot's sign is wrong
// for the true eclipse moment. All 104 rows were checked: 9 fell in that
// range, of which 5 genuinely straddle a sign change within their day (the
// other 4 were close to a boundary crossed on a different day, so no risk).
// Of those 5, each was checked against NASA's published TD time of greatest
// eclipse against the interpolated crossing time within that day: 3 landed
// before the crossing (stored sign already correct) and 2 landed after
// (2031-05-21 and 2039-06-21, both corrected below -- see
// BOUNDARY_CORRECTIONS). If the eclipse list ever changes, any newly
// boundary-adjacent event needs this same manual check repeated.
//
// Deterministic and idempotent: upserts on id. Writes nothing until this
// script is run.
//
// Usage: node --env-file=.env.local scripts/load-eclipses.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SOLAR_DATES = [
  '2023-04-20', '2023-10-14', '2024-04-08', '2024-10-02', '2025-03-29', '2025-09-21',
  '2026-02-17', '2026-08-12', '2027-02-06', '2027-08-02', '2028-01-26', '2028-07-22',
  '2029-01-14', '2029-06-12', '2029-07-11', '2029-12-05', '2030-06-01', '2030-11-25',
  '2031-05-21', '2031-11-14', '2032-05-09', '2032-11-03', '2033-03-30', '2033-09-23',
  '2034-03-20', '2034-09-12', '2035-03-09', '2035-09-02', '2036-02-27', '2036-07-23',
  '2036-08-21', '2037-01-16', '2037-07-13', '2038-01-05', '2038-07-02', '2038-12-26',
  '2039-06-21', '2039-12-15', '2040-05-11', '2040-11-04', '2041-04-30', '2041-10-25',
  '2042-04-20', '2042-10-14', '2043-04-09', '2043-10-03', '2044-02-28', '2044-08-23',
  '2045-02-16', '2045-08-12', '2046-02-05',
];

const LUNAR_DATES = [
  '2023-05-05', '2023-10-28', '2024-03-25', '2024-09-18', '2025-03-14', '2025-09-07',
  '2026-03-03', '2026-08-28', '2027-02-20', '2027-07-18', '2027-08-17', '2028-01-12',
  '2028-07-06', '2028-12-31', '2029-06-26', '2029-12-20', '2030-06-15', '2030-12-09',
  '2031-05-07', '2031-06-05', '2031-10-30', '2032-04-25', '2032-10-18', '2033-04-14',
  '2033-10-08', '2034-04-03', '2034-09-28', '2035-02-22', '2035-08-19', '2036-02-11',
  '2036-08-07', '2037-01-31', '2037-07-27', '2038-01-21', '2038-06-17', '2038-07-16',
  '2038-12-11', '2039-06-06', '2039-11-30', '2040-05-26', '2040-11-18', '2041-05-16',
  '2041-11-08', '2042-04-05', '2042-09-29', '2043-03-25', '2043-09-19', '2044-03-13',
  '2044-09-07', '2045-03-03', '2045-08-27', '2046-01-22', '2046-07-18',
];

function oppositeSign(sign) {
  return SIGNS[(SIGNS.indexOf(sign) + 6) % 12];
}

// Manually verified against NASA's published TD-of-greatest-eclipse time,
// for the two boundary-adjacent eclipses where the eclipse moment fell
// AFTER the Sun's sign crossing that day (see the header comment). Applied
// as a direct override of the Sun-snapshot-derived sign/degree.
const BOUNDARY_CORRECTIONS = new Map([
  ['solar-eclipse-2031-05-21', { sign: 'Gemini', degree: 0.0715 }],
  ['solar-eclipse-2039-06-21', { sign: 'Cancer', degree: 0.2085 }],
]);

async function fetchSunOnDates(dates) {
  const { data, error } = await supabase
    .from('sky_positions')
    .select('date, sign, sign_degree')
    .eq('body', 'Sun')
    .in('date', dates);
  if (error) throw new Error(`Read failed for Sun: ${error.message}`);
  const map = new Map(data.map((r) => [r.date, r]));
  const missing = dates.filter((d) => !map.has(d));
  if (missing.length > 0) throw new Error(`Sun missing sky_positions rows for: ${missing.join(', ')}`);
  return map;
}

function printSample(rows) {
  for (const r of rows) {
    console.log(`${r.exact_date}  ${r.event.padEnd(13)} ${r.body_1_sign}/${r.body_2_sign} @ ${r.exact_degree.toFixed(2)} deg   id=${r.id}`);
  }
}

async function main() {
  const allDates = [...new Set([...SOLAR_DATES, ...LUNAR_DATES])];
  const sun = await fetchSunOnDates(allDates);

  const rows = [];

  for (const date of SOLAR_DATES) {
    const s = sun.get(date);
    const id = `solar-eclipse-${date}`;
    const override = BOUNDARY_CORRECTIONS.get(id);
    const sign = override?.sign ?? s.sign;
    const degree = override?.degree ?? s.sign_degree;
    rows.push({
      id,
      event: 'Solar Eclipse',
      body_1: 'Sun',
      body_2: 'Moon',
      body_1_sign: sign,
      body_2_sign: sign, // conjunction -- same sign
      window_start: null,
      window_end: null,
      exact_date: date,
      pass_n: null,
      pass_m: null,
      body_1_retrograde: null,
      body_2_retrograde: null,
      exact_degree: degree,
    });
  }

  for (const date of LUNAR_DATES) {
    const s = sun.get(date);
    const id = `lunar-eclipse-${date}`;
    const override = BOUNDARY_CORRECTIONS.get(id);
    const sign = override?.sign ?? s.sign;
    const degree = override?.degree ?? s.sign_degree;
    rows.push({
      id,
      event: 'Lunar Eclipse',
      body_1: 'Sun',
      body_2: 'Moon',
      body_1_sign: sign,
      body_2_sign: oppositeSign(sign), // opposition -- derived, never read from Moon's row
      window_start: null,
      window_end: null,
      exact_date: date,
      pass_n: null,
      pass_m: null,
      body_1_retrograde: null,
      body_2_retrograde: null,
      exact_degree: degree,
    });
  }

  rows.sort((a, b) => (a.exact_date < b.exact_date ? -1 : a.exact_date > b.exact_date ? 1 : 0));

  console.log(`Writing ${rows.length} eclipse rows (${SOLAR_DATES.length} solar + ${LUNAR_DATES.length} lunar) to aspect_calendar.\n`);

  const { error } = await supabase
    .from('aspect_calendar')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`Supabase write failed: ${error.message}`);

  console.log('Done. Full list:\n');
  printSample(rows);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
