import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ── Prompts ────────────────────────────────────────────────────────────────
const CALL1_PROMPT = fs.readFileSync(
  path.join(process.cwd(), 'lib/prompts/synthesis_c1_prompt.txt'),
  'utf-8'
);
const CALL3_PROMPT = fs.readFileSync(
  path.join(process.cwd(), 'lib/prompts/synthesis_c3_prompt.txt'),
  'utf-8'
);

// ── Config ─────────────────────────────────────────────────────────────────
const MODEL = 'claude-opus-4-8';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

// ── Supabase (server-side with service role for writes) ────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Planet order and Supabase column mapping ───────────────────────────────
const PLANETS = [
  { name: 'Sun',        subjectKey: 'sun',                    dbCol: 'sun'        },
  { name: 'Moon',       subjectKey: 'moon',                   dbCol: 'moon'       },
  { name: 'Mercury',    subjectKey: 'mercury',                dbCol: 'mercury'    },
  { name: 'Venus',      subjectKey: 'venus',                  dbCol: 'venus'      },
  { name: 'Mars',       subjectKey: 'mars',                   dbCol: 'mars'       },
  { name: 'Jupiter',    subjectKey: 'jupiter',                dbCol: 'jupiter'    },
  { name: 'Saturn',     subjectKey: 'saturn',                 dbCol: 'saturn'     },
  { name: 'Uranus',     subjectKey: 'uranus',                 dbCol: 'uranus'     },
  { name: 'Neptune',    subjectKey: 'neptune',                dbCol: 'neptune'    },
  { name: 'Pluto',      subjectKey: 'pluto',                  dbCol: 'pluto'      },
  { name: 'Ascendant',  subjectKey: 'ascendant',              dbCol: 'asc_reading'},
  { name: 'Midheaven',  subjectKey: 'medium_coeli',           dbCol: 'mc'         },
  { name: 'North Node', subjectKey: 'mean_north_lunar_node',  dbCol: 'north_node' },
  { name: 'South Node', subjectKey: 'mean_south_lunar_node',  dbCol: 'south_node' },
];

const HOUSE_ORDINALS: Record<string, string> = {
  First_House: '1st House', Second_House: '2nd House', Third_House: '3rd House',
  Fourth_House: '4th House', Fifth_House: '5th House', Sixth_House: '6th House',
  Seventh_House: '7th House', Eighth_House: '8th House', Ninth_House: '9th House',
  Tenth_House: '10th House', Eleventh_House: '11th House', Twelfth_House: '12th House',
};

const SIGN_ABBR_MAP: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

// ── Extract planet input from chart_data ───────────────────────────────────

function extractPlanetInput(
  planetName: string,
  subjectKey: string,
  chartData: any,
  birthTimeKnown: boolean,
): string | null {
  const subject = chartData?.subject;
  if (!subject) return null;

  const planet = subject[subjectKey];
  if (!planet) return null;

  const sign = SIGN_ABBR_MAP[planet.sign] ?? planet.sign ?? '';
  const degree = planet.position != null ? Math.round(planet.position * 10) / 10 : 0;
  const retrograde = planet.retrograde ?? false;
  const isAngle = ['ascendant', 'medium_coeli'].includes(subjectKey);
  const house = birthTimeKnown && !isAngle && planet.house
    ? (HOUSE_ORDINALS[planet.house] ?? null)
    : null;

  // Find planets in same sign (excluding self)
  const planetsInSameSign: string[] = [];
  for (const p of PLANETS) {
    if (p.subjectKey === subjectKey) continue;
    const other = subject[p.subjectKey];
    if (!other) continue;
    if ((SIGN_ABBR_MAP[other.sign] ?? other.sign) === sign) {
      const otherDeg = Math.round((other.position ?? 0) * 10) / 10;
      planetsInSameSign.push(`${p.name} ${otherDeg}°`);
    }
  }

  // Find aspects involving this planet (within 3° orb)
  const aspects = chartData?.aspects ?? [];
  const myAspects = aspects
    .filter((a: any) => {
      const nameMatch = a.p1_name === planet.name || a.p2_name === planet.name;
      return nameMatch && a.orbit <= 3;
    })
    .map((a: any) => {
      const otherName = a.p1_name === planet.name ? a.p2_name : a.p1_name;
      return `  ${planetName} ${a.aspect} ${otherName}, ${a.orbit}°`;
    });

  // Build user message
  const lines: string[] = [
    `PLANET: ${planetName}`,
    `SIGN: ${sign}`,
    `DEGREE: ${degree}°`,
  ];
  if (house) lines.push(`HOUSE: ${house}`);
  lines.push(`RISING_SIGN_KNOWN: ${birthTimeKnown}`);
  lines.push(`RETROGRADE: ${retrograde}`);
  lines.push(`PLANETS_IN_SAME_SIGN: ${planetsInSameSign.length > 0 ? planetsInSameSign.join(', ') : 'none'}`);
  if (myAspects.length > 0) {
    lines.push('ASPECTS:');
    lines.push(...myAspects);
  } else {
    lines.push('ASPECTS: none');
  }

  return lines.join('\n');
}

// ── Anthropic call ─────────────────────────────────────────────────────────

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxTokens: number,
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (response.ok) {
      const data = await response.json() as any;
      return data.content[0].text as string;
    }

    if (response.status === 429) {
      const wait = Math.pow(2, attempt + 2);
      await new Promise(r => setTimeout(r, wait * 1000));
      continue;
    }

    const error = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${error}`);
  }
  throw new Error('Max retries exceeded');
}

// ── Parse delimited output ─────────────────────────────────────────────────

function parseOutput(raw: string): string {
  const start = raw.indexOf('[START]');
  const end = raw.indexOf('[END]');
  if (start === -1 || end === -1) throw new Error('Missing [START]/[END] delimiters');
  return raw.slice(start + '[START]'.length, end).trim();
}

// ── Generate one planet ────────────────────────────────────────────────────

async function generatePlanet(
  planetName: string,
  subjectKey: string,
  chartData: any,
  birthTimeKnown: boolean,
): Promise<string> {
  const userMessage = extractPlanetInput(planetName, subjectKey, chartData, birthTimeKnown);
  if (!userMessage) throw new Error(`No data for ${planetName}`);

  // Call 1 — brief
  const brief = await callAnthropic(CALL1_PROMPT, userMessage, 0.4, 2048);

  // Call 3 — prose
  const call3Message = userMessage + '\nBRIEF:\n' + brief;
  const raw = await callAnthropic(CALL3_PROMPT, call3Message, 0.7, 4096);

  return parseOutput(raw);
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    // Fetch reading from Supabase
    const { data: reading, error: fetchError } = await supabase
      .from('readings')
      .select('*')
      .eq('slug', slug)
      .single();

    if (fetchError || !reading) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    const chartData = reading.chart_data;
    const birthTimeKnown = reading.birth_time_known ?? true;
    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    // Generate first planet to warm cache, then rest in parallel
    const [first, ...rest] = PLANETS;

    // First planet — cache warm
    try {
      results[first.dbCol] = await generatePlanet(first.name, first.subjectKey, chartData, birthTimeKnown);
      await supabase.from('readings').update({ [first.dbCol]: results[first.dbCol] }).eq('slug', slug);
    } catch (e: any) {
      errors[first.name] = e.message;
    }

    // Rest in parallel — cache should be warm now
    await Promise.allSettled(
      rest.map(async (planet) => {
        try {
          const prose = await generatePlanet(planet.name, planet.subjectKey, chartData, birthTimeKnown);
          results[planet.dbCol] = prose;
          await supabase.from('readings').update({ [planet.dbCol]: prose }).eq('slug', slug);
        } catch (e: any) {
          errors[planet.name] = e.message;
        }
      })
    );

    return NextResponse.json({
      success: true,
      generated: Object.keys(results).length,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
