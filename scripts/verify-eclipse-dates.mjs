// Read-only check (writes nothing): verifies the 104 NASA-sourced eclipse
// dates for 2023-01-01 through 2046-07-31 against sky_positions. For each
// date, confirms the Sun and Moon are near-conjunct (solar) or near-opposite
// (lunar), and that the Sun sits close to the lunar node axis -- the
// geometric signature of a real eclipse. The Moon moves ~13 degrees/day, so
// a wrong date would show up as a large deviation, not a subtle one.
//
// Usage: node --env-file=.env.local scripts/verify-eclipse-dates.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Source: NASA's Five Millennium Canon of Solar/Lunar Eclipses
// (eclipse.gsfc.nasa.gov), cross-checked against USNO for 2023-2026.
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

function angularSeparation(lon1, lon2) {
  const diff = Math.abs(lon1 - lon2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

async function fetchBodyOnDates(body, dates) {
  const { data, error } = await supabase
    .from('sky_positions')
    .select('date, longitude, sign, sign_degree')
    .eq('body', body)
    .in('date', dates);
  if (error) throw new Error(`Read failed for ${body}: ${error.message}`);
  const map = new Map(data.map((r) => [r.date, r]));
  const missing = dates.filter((d) => !map.has(d));
  if (missing.length > 0) throw new Error(`${body} missing sky_positions rows for: ${missing.join(', ')}`);
  return map;
}

async function main() {
  const allDates = [...new Set([...SOLAR_DATES, ...LUNAR_DATES])];
  const sun = await fetchBodyOnDates('Sun', allDates);
  const moon = await fetchBodyOnDates('Moon', allDates);
  const northNode = await fetchBodyOnDates('North Node', allDates);
  const southNode = await fetchBodyOnDates('South Node', allDates);

  console.log(`Checking ${SOLAR_DATES.length} solar + ${LUNAR_DATES.length} lunar = ${SOLAR_DATES.length + LUNAR_DATES.length} eclipse dates.\n`);

  function axisDistance(lon, date) {
    return Math.min(
      angularSeparation(lon, northNode.get(date).longitude),
      angularSeparation(lon, southNode.get(date).longitude),
    );
  }

  let worstSunMoonSolar = { date: null, value: -1 };
  let worstSunMoonLunar = { date: null, value: -1 };
  let worstAxisSolar = { date: null, value: -1 };
  let worstAxisLunar = { date: null, value: -1 };
  const FLAG_THRESHOLD_SUNMOON = 15; // degrees -- well beyond one day's Moon motion
  const FLAG_THRESHOLD_AXIS = 20; // degrees -- beyond the widest traditional eclipse limit
  const flagged = [];

  for (const date of SOLAR_DATES) {
    const sep = angularSeparation(sun.get(date).longitude, moon.get(date).longitude);
    const axis = axisDistance(sun.get(date).longitude, date);
    if (sep > worstSunMoonSolar.value) worstSunMoonSolar = { date, value: sep };
    if (axis > worstAxisSolar.value) worstAxisSolar = { date, value: axis };
    if (sep > FLAG_THRESHOLD_SUNMOON || axis > FLAG_THRESHOLD_AXIS) {
      flagged.push(`SOLAR ${date}: Sun-Moon sep ${sep.toFixed(2)} deg, axis dist ${axis.toFixed(2)} deg`);
    }
  }

  for (const date of LUNAR_DATES) {
    const sep = angularSeparation(sun.get(date).longitude, moon.get(date).longitude);
    const oppositionDeviation = Math.abs(180 - sep);
    const axis = axisDistance(sun.get(date).longitude, date);
    if (oppositionDeviation > worstSunMoonLunar.value) worstSunMoonLunar = { date, value: oppositionDeviation };
    if (axis > worstAxisLunar.value) worstAxisLunar = { date, value: axis };
    if (oppositionDeviation > FLAG_THRESHOLD_SUNMOON || axis > FLAG_THRESHOLD_AXIS) {
      flagged.push(`LUNAR ${date}: opposition deviation ${oppositionDeviation.toFixed(2)} deg, axis dist ${axis.toFixed(2)} deg`);
    }
  }

  console.log(`Worst-case Sun-Moon conjunction deviation (solar eclipses): ${worstSunMoonSolar.value.toFixed(2)} deg on ${worstSunMoonSolar.date}`);
  console.log(`Worst-case Sun-Moon opposition deviation (lunar eclipses): ${worstSunMoonLunar.value.toFixed(2)} deg on ${worstSunMoonLunar.date}`);
  console.log(`Worst-case Sun-to-node-axis distance (solar eclipses): ${worstAxisSolar.value.toFixed(2)} deg on ${worstAxisSolar.date}`);
  console.log(`Worst-case Sun-to-node-axis distance (lunar eclipses): ${worstAxisLunar.value.toFixed(2)} deg on ${worstAxisLunar.date}`);
  console.log(`\n(For reference: the Moon moves ~13 deg/day, so this range of deviation is expected purely from the 00:00 UTC snapshot landing somewhere up to ~24 hours from the true eclipse moment -- it is not itself evidence of a wrong date. A wrong date would show up as values far outside this range.)`);

  console.log(`\nFlagged rows (Sun-Moon deviation > ${FLAG_THRESHOLD_SUNMOON} deg or axis distance > ${FLAG_THRESHOLD_AXIS} deg): ${flagged.length}`);
  for (const line of flagged) console.log(`  ${line}`);

  if (flagged.length === 0) {
    console.log('\nAll 104 dates pass the lunation/node geometry check.');
  } else {
    console.log('\nSTOP -- one or more dates failed the geometry check. Do not proceed to loading rows.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
