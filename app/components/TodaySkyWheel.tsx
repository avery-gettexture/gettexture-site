'use client';

// The real "Today's Sky" wheel (SPEC §16, August 15, 2026 — replaces the
// natal-chart-data placeholder that stood in until this was built; aspect
// lines wired in as a follow-up, see the wheel-fixes entry). Reuses
// NatalChartWheelWeb's drawing engine rather than duplicating it: this file
// only shapes get_current_sky_positions() rows into the "subject" format
// that engine expects, and get_current_sky_aspects() rows into the
// "aspects" format it expects, then renders it in no-birth-time mode.
//
// No Ascendant/Midheaven/houses exist for "the sky today" — there's no
// birth data involved at all. Each planet is still assigned a 30°-wide
// wedge matching its own sign (whole-sign-style, locked to Aries = 1st)
// because the engine's collision-avoidance layout groups planets by wedge;
// leaving every planet in the engine's default wedge would make it treat
// planets in entirely different signs as neighbors and mis-place them.

import NatalChartWheelWeb from './NatalChartWheelWeb';

interface SkyPosition {
  body: string;
  sign: string;
  sign_degree: number;
  retrograde: boolean;
}

interface SkyAspect {
  body_1: string;
  body_2: string;
  event: string;
}

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const HOUSE_NAMES = [
  'First_House', 'Second_House', 'Third_House', 'Fourth_House',
  'Fifth_House', 'Sixth_House', 'Seventh_House', 'Eighth_House',
  'Ninth_House', 'Tenth_House', 'Eleventh_House', 'Twelfth_House',
];

// get_current_sky_positions()'s body-name strings -> NatalChartWheelWeb's
// subject keys (same re-keying HomeTodaySkyPanel already does for glyphs).
const BODY_TO_SUBJECT_KEY: Record<string, string> = {
  Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus', Mars: 'mars',
  Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluto',
  'North Node': 'mean_north_lunar_node', 'South Node': 'mean_south_lunar_node',
};

export default function TodaySkyWheel({ positions, aspects, size }: { positions: SkyPosition[]; aspects?: SkyAspect[]; size?: number }) {
  const subject: Record<string, any> = {};
  for (const pos of positions) {
    const key = BODY_TO_SUBJECT_KEY[pos.body];
    const signIndex = ZODIAC_SIGNS.indexOf(pos.sign);
    if (!key || signIndex === -1) continue;
    subject[key] = {
      name: pos.body,
      sign: pos.sign,
      house: HOUSE_NAMES[signIndex],
      abs_pos: signIndex * 30 + pos.sign_degree,
      position: pos.sign_degree,
      retrograde: pos.retrograde,
    };
  }

  // get_current_sky_aspects() rows -> the {p1_name, p2_name, aspect} shape
  // NatalChartWheelWeb's mapChartData() already expects and matches against
  // each subject entry's `name` (set above), same as natal chart_data.
  const chartAspects = (aspects ?? []).map(a => ({
    p1_name: a.body_1, p2_name: a.body_2, aspect: a.event,
  }));

  return <NatalChartWheelWeb chartData={{ subject, aspects: chartAspects }} birthTimeKnown={false} size={size} />;
}
