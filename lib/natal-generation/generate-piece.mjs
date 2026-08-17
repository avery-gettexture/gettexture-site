// Natal generation core: given a reading already in memory, assembles the
// Call 1 USER MESSAGE FORMAT block (SYNTHESIS_CALL_1_v12.md §27) for one
// of the 13 placements -- 10 planets, Ascendant, Midheaven, and the
// combined Nodes axis (SPEC §4.1: 13 placements, not 14) -- then runs
// Call 1 -> Call 2 and returns prose. Mirrors
// lib/transit-generation/generate-piece.mjs's separation: pure assembly
// (assembleGenerationInputs, zero API calls, usable for a dry run) vs.
// full generation (generateNatalPlacement).
//
// STAGE 1 NOTE: the Anthropic-calling half (generateNatalPlacement) reads
// its system prompts from lib/prompts/synthesis_c1_prompt.txt /
// synthesis_c2_prompt.txt LAZILY (only when actually called) specifically
// so this module can be imported for dry runs before Stage 2 copies the
// finalized prompts into place -- lib/prompts/synthesis_c2_prompt.txt
// does not exist yet as of Stage 1.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SIGN_ABBR_MAP, HOUSE_ORDINALS,
  computeDecan, computeDegreeFlag, computeSect, computeAspect, computeAxisAspect,
} from './engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CALL1_PROMPT_PATH = path.join(__dirname, '../prompts/synthesis_c1_prompt.txt');
const CALL2_PROMPT_PATH = path.join(__dirname, '../prompts/synthesis_c2_prompt.txt');

export const MODEL = 'claude-opus-4-8';
export const CALL1_MAX_TOKENS = 16384;
export const CALL2_MAX_TOKENS = 16384;

// ── Placement inventory (13, SPEC §4.1) ─────────────────────────────────────

export const BODIES = [
  { id: 'sun',       name: 'Sun',       subjectKey: 'sun',           dbCol: 'sun',         kind: 'planet' },
  { id: 'moon',      name: 'Moon',      subjectKey: 'moon',          dbCol: 'moon',        kind: 'planet' },
  { id: 'mercury',   name: 'Mercury',   subjectKey: 'mercury',       dbCol: 'mercury',     kind: 'planet' },
  { id: 'venus',     name: 'Venus',     subjectKey: 'venus',         dbCol: 'venus',       kind: 'planet' },
  { id: 'mars',      name: 'Mars',      subjectKey: 'mars',          dbCol: 'mars',        kind: 'planet' },
  { id: 'jupiter',   name: 'Jupiter',   subjectKey: 'jupiter',       dbCol: 'jupiter',     kind: 'planet' },
  { id: 'saturn',    name: 'Saturn',    subjectKey: 'saturn',        dbCol: 'saturn',      kind: 'planet' },
  { id: 'uranus',    name: 'Uranus',    subjectKey: 'uranus',        dbCol: 'uranus',      kind: 'planet' },
  { id: 'neptune',   name: 'Neptune',   subjectKey: 'neptune',       dbCol: 'neptune',     kind: 'planet' },
  { id: 'pluto',     name: 'Pluto',     subjectKey: 'pluto',         dbCol: 'pluto',       kind: 'planet' },
  { id: 'ascendant', name: 'Ascendant', subjectKey: 'ascendant',     dbCol: 'asc_reading', kind: 'angle'  },
  { id: 'midheaven', name: 'Midheaven', subjectKey: 'medium_coeli',  dbCol: 'mc',          kind: 'angle'  },
];

export const NODES_PLACEMENT = { id: 'nodes', name: 'Nodes', dbCol: 'nodes', kind: 'nodes' };

export const PLACEMENTS = [...BODIES, NODES_PLACEMENT]; // 13

function isLuminary(subjectKey) {
  return subjectKey === 'sun' || subjectKey === 'moon';
}

function fmtDegree(position) {
  return Math.round(position * 10) / 10;
}

// Call 1 §27's DEGREE_FLAG field is an enumerated literal, like
// RISING_SIGN_KNOWN's [true | false] -- the value itself is one of
// "anaretic 29°" / "ingress 0°" / "none", not just the flag name.
const DEGREE_FLAG_LABEL = { anaretic: 'anaretic 29°', ingress: 'ingress 0°', none: 'none' };
function fmtDegreeFlag(position) {
  return DEGREE_FLAG_LABEL[computeDegreeFlag(position)];
}

// ── Aspect computation across the whole chart, once per reading ────────────
//
// Returns { perBody: Map<id, string[]>, axisLines: string[] }. perBody
// includes both mutual planet-planet aspects AND, where applicable, one
// merged axis line (SPEC §24) appended to that body's own list. axisLines
// is the same set of axis lines, collected once for the Nodes placement's
// own ASPECTS list.

function buildAllAspects(subject) {
  const bodyData = BODIES.map(b => {
    const p = subject[b.subjectKey];
    return {
      id: b.id,
      name: b.name,
      longitude: p.abs_pos,
      sign: SIGN_ABBR_MAP[p.sign] ?? p.sign,
      luminary: isLuminary(b.subjectKey),
    };
  });

  const perBody = new Map(bodyData.map(b => [b.id, []]));

  for (let i = 0; i < bodyData.length; i++) {
    for (let j = i + 1; j < bodyData.length; j++) {
      const A = bodyData[i];
      const B = bodyData[j];
      const involvesLuminary = A.luminary || B.luminary;
      const result = computeAspect(A.longitude, A.sign, B.longitude, B.sign, involvesLuminary);
      if (!result) continue;
      perBody.get(A.id).push(`${A.name} ${result.type} ${B.name}, ${result.orb}°`);
      perBody.get(B.id).push(`${B.name} ${result.type} ${A.name}, ${result.orb}°`);
    }
  }

  const north = subject.mean_north_lunar_node;
  const south = subject.mean_south_lunar_node;
  const lonN = north.abs_pos, signN = SIGN_ABBR_MAP[north.sign] ?? north.sign;
  const lonS = south.abs_pos, signS = SIGN_ABBR_MAP[south.sign] ?? south.sign;

  const axisLines = [];
  for (const b of bodyData) {
    const axis = computeAxisAspect(b.longitude, b.sign, lonN, signN, lonS, signS, b.luminary);
    if (!axis) continue;
    const line = `${b.name} ${axis.display}, ${axis.orb}°`;
    perBody.get(b.id).push(line);
    axisLines.push(line);
  }

  return { perBody, axisLines };
}

// Co-present bodies (excluding self), "Name degree°" -- SPEC §4.6: every
// co-present body gets its own treatment regardless of aspect status.
function copresenceFor(selfId, sign, subject) {
  return BODIES
    .filter(b => b.id !== selfId)
    .map(b => ({ b, p: subject[b.subjectKey] }))
    .filter(({ p }) => (SIGN_ABBR_MAP[p.sign] ?? p.sign) === sign)
    .map(({ b, p }) => `${b.name} ${fmtDegree(p.position)}°`);
}

// ── Field-block assembly (Call 1 §27 USER MESSAGE FORMAT) ──────────────────

async function buildPlanetOrAngleMessage(placement, reading, aspects) {
  const { chart_data: chartData, birth_time_known: known } = reading;
  const subject = chartData.subject;
  const p = subject[placement.subjectKey];
  const sign = SIGN_ABBR_MAP[p.sign] ?? p.sign;
  const degree = fmtDegree(p.position);
  const isAngle = placement.kind === 'angle';

  const lines = [
    `PLANET: ${placement.name}`,
    `SIGN: ${sign}`,
    `DEGREE: ${degree}°`,
  ];

  if (!isAngle) {
    const decan = await computeDecan(sign, p.position);
    lines.push(`DECAN: ${decan.ordinal}, ruled by ${decan.ruler} (Chaldean)`);
  }

  lines.push(`DEGREE_FLAG: ${fmtDegreeFlag(p.position)}`);

  if (known) {
    lines.push(`SECT: ${computeSect(subject.sun.house)}`);
  }

  if (known) {
    // Angle house rule (Call 1 §27): the Ascendant's house is always the
    // 1st (it establishes the 1st house, per §25); the Midheaven's house
    // is whatever chart_data already computed (previously discarded by
    // route.ts's isAngle check -- this is the "MC house currently left
    // blank" fix).
    const house = placement.id === 'ascendant' ? 'First_House' : p.house;
    lines.push(`HOUSE: ${HOUSE_ORDINALS[house] ?? house}`);
  }

  lines.push(`RISING_SIGN_KNOWN: ${known}`);

  if (!isAngle) {
    lines.push(`RETROGRADE: ${p.retrograde ?? false}`);
  }

  const copresence = copresenceFor(placement.id, sign, subject);
  lines.push(`PLANETS_IN_SAME_SIGN: ${copresence.length > 0 ? copresence.join(', ') : 'none'}`);

  const myAspects = aspects.perBody.get(placement.id) ?? [];
  if (myAspects.length > 0) {
    lines.push('ASPECTS:');
    lines.push(...myAspects.map(l => `  ${l}`));
  } else {
    lines.push('ASPECTS: none');
  }

  return lines.join('\n');
}

async function buildNodesMessage(reading, aspects) {
  const { chart_data: chartData, birth_time_known: known } = reading;
  const subject = chartData.subject;
  const north = subject.mean_north_lunar_node;
  const south = subject.mean_south_lunar_node;
  const northSign = SIGN_ABBR_MAP[north.sign] ?? north.sign;
  const southSign = SIGN_ABBR_MAP[south.sign] ?? south.sign;
  const degree = fmtDegree(north.position); // same degree both ends, by construction

  const lines = [
    'PLANET: Nodes',
    `AXIS: ${northSign} — ${southSign}`,
    `DEGREE: ${degree}°`,
  ];

  if (known) {
    lines.push(`HOUSES: North Node ${HOUSE_ORDINALS[north.house] ?? north.house}, South Node ${HOUSE_ORDINALS[south.house] ?? south.house}`);
  }

  lines.push(`DEGREE_FLAG: ${fmtDegreeFlag(north.position)}`);
  lines.push(`RISING_SIGN_KNOWN: ${known}`);

  const northCopresence = copresenceFor('__north__', northSign, subject);
  const southCopresence = copresenceFor('__south__', southSign, subject);
  lines.push(
    `PLANETS_IN_SAME_SIGN: North Node end: ${northCopresence.length > 0 ? northCopresence.join(', ') : 'none'}; `
    + `South Node end: ${southCopresence.length > 0 ? southCopresence.join(', ') : 'none'}`,
  );

  if (aspects.axisLines.length > 0) {
    lines.push('ASPECTS:');
    lines.push(...aspects.axisLines.map(l => `  ${l}`));
  } else {
    lines.push('ASPECTS: none');
  }

  return lines.join('\n');
}

export async function buildUserMessage(placementId, reading) {
  const placement = PLACEMENTS.find(pl => pl.id === placementId);
  if (!placement) throw new Error(`Unknown placement id: ${placementId}`);
  const aspects = buildAllAspects(reading.chart_data.subject);
  if (placement.kind === 'nodes') return buildNodesMessage(reading, aspects);
  return buildPlanetOrAngleMessage(placement, reading, aspects);
}

// ── Dry-run inputs (no API call) ────────────────────────────────────────────

export async function assembleGenerationInputs(placementId, reading) {
  const userMessage = await buildUserMessage(placementId, reading);
  return { userMessage };
}

// ── Anthropic call (mirrors lib/transit-generation/generate-piece.mjs) ─────

async function callAnthropic(systemPrompt, userMessage, maxTokens, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
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
      const data = await response.json();
      return {
        text: data.content[0].text,
        stopReason: data.stop_reason,
        usage: {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
          cacheCreationInputTokens: data.usage?.cache_creation_input_tokens ?? 0,
          cacheReadInputTokens: data.usage?.cache_read_input_tokens ?? 0,
        },
      };
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

function parseOutput(raw) {
  const start = raw.indexOf('[START]');
  const end = raw.indexOf('[END]');
  if (start === -1 || end === -1) throw new Error('Missing [START]/[END] delimiters');
  return raw.slice(start + '[START]'.length, end).trim();
}

function computeCost(call1Usage, call2Usage, rates) {
  const totalUsage = {
    inputTokens: call1Usage.inputTokens + call2Usage.inputTokens,
    outputTokens: call1Usage.outputTokens + call2Usage.outputTokens,
    cacheCreationInputTokens: call1Usage.cacheCreationInputTokens + call2Usage.cacheCreationInputTokens,
    cacheReadInputTokens: call1Usage.cacheReadInputTokens + call2Usage.cacheReadInputTokens,
  };
  const cost = (
    totalUsage.inputTokens * rates.input +
    totalUsage.outputTokens * rates.output +
    totalUsage.cacheCreationInputTokens * rates.cacheWrite +
    totalUsage.cacheReadInputTokens * rates.cacheRead
  ) / 1_000_000;
  return { cost, totalUsage };
}

// ── Full generation for one placement ───────────────────────────────────────
//
// Reads the system prompts lazily (see module header) so this module stays
// importable for dry runs before Stage 2 copies the finalized prompts into
// lib/prompts/.

export async function generateNatalPlacement(placementId, reading, pricing) {
  const placement = PLACEMENTS.find(pl => pl.id === placementId);
  if (!placement) throw new Error(`Unknown placement id: ${placementId}`);

  const call1Prompt = fs.readFileSync(CALL1_PROMPT_PATH, 'utf-8');
  const call2Prompt = fs.readFileSync(CALL2_PROMPT_PATH, 'utf-8');
  const userMessage = await buildUserMessage(placementId, reading);

  const call1 = await callAnthropic(call1Prompt, userMessage, CALL1_MAX_TOKENS);
  if (call1.stopReason === 'max_tokens') {
    throw new Error(`${placement.name}: Call 1 output was truncated (stop_reason=max_tokens, max_tokens=${CALL1_MAX_TOKENS}).`);
  }

  const call2UserMessage = userMessage + '\nBRIEF:\n' + call1.text;
  const call2 = await callAnthropic(call2Prompt, call2UserMessage, CALL2_MAX_TOKENS);
  if (call2.stopReason === 'max_tokens') {
    throw new Error(`${placement.name}: Call 2 output was truncated (stop_reason=max_tokens, max_tokens=${CALL2_MAX_TOKENS}).`);
  }

  const prose = parseOutput(call2.text);
  const { cost, totalUsage } = computeCost(call1.usage, call2.usage, pricing);

  return {
    dbCol: placement.dbCol,
    prose,
    diagnostics: { call1Usage: call1.usage, call2Usage: call2.usage, totalUsage, cost },
  };
}
