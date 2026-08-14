// Framework-agnostic transit generation core: given a focus body and a
// reading already in memory, runs Call 1 (brief) then Call 2 (prose)
// against the transit prompts and returns a transit_pieces row ready to
// upsert. No Supabase reads or writes happen in this module -- the caller
// supplies the reading and owns storage, so a future production route can
// import generateTransitPiece() unchanged.
//
// Anthropic call mirrors app/api/generate/route.ts: direct fetch, model
// claude-opus-4-8, anthropic-version 2023-06-01, prompt-caching beta
// header, cache_control ephemeral on the system prompt, 429 exponential
// backoff. No temperature parameter (the natal route's callAnthropic never
// actually included one either, despite accepting it as an argument).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assembleBrief } from '../../scripts/engine/assemble-brief.mjs';
import { TRANSIT_GENERATION_PRICING_USD_PER_MILLION_TOKENS } from '../config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CALL1_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/transit_c1_prompt.txt'), 'utf-8');
export const CALL2_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/transit_c2_prompt.txt'), 'utf-8');

export const MODEL = 'claude-opus-4-8';
export const CALL1_MAX_TOKENS = 16384;
export const CALL2_MAX_TOKENS = 16384;

// ── Anthropic call ─────────────────────────────────────────────────────────

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

// ── Parse Call 2's delimited output ─────────────────────────────────────────
//
// [START] ... first [ENTRY: {id}] tag = synthesis prose. Each [ENTRY: {id}]
// block up to the next tag (or [END]) = one timeline entry, id kept exactly
// as written. Guarded against: missing [START]/[END]; and the set of
// parsed entry ids not exactly matching the engine's own entryIds -- not a
// count comparison, because counts.totalEntries (for planet pieces) omits
// ECLIPSE_ACTIVATION entries by construction and would false-halt a phase
// that has one.

export function parseCall2Output(raw, expectedEntryIds) {
  const startIdx = raw.indexOf('[START]');
  const endIdx = raw.indexOf('[END]');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Call 2 output is missing the [START] or [END] delimiter.');
  }
  const body = raw.slice(startIdx + '[START]'.length, endIdx);

  const entryTagRe = /\[ENTRY:\s*([^\]]+?)\s*\]/g;
  const tags = [...body.matchAll(entryTagRe)];

  const synthesisEnd = tags.length > 0 ? tags[0].index : body.length;
  const synthesisProse = body.slice(0, synthesisEnd).trim();

  const timelineEntries = tags.map((tag, i) => {
    const id = tag[1];
    const contentStart = tag.index + tag[0].length;
    const contentEnd = i + 1 < tags.length ? tags[i + 1].index : body.length;
    return { id, prose: body.slice(contentStart, contentEnd).trim() };
  });

  const parsedIds = timelineEntries.map(e => e.id);
  const parsedIdSet = new Set(parsedIds);
  const expectedIdSet = new Set(expectedEntryIds);
  const missing = expectedEntryIds.filter(id => !parsedIdSet.has(id));
  const extra = parsedIds.filter(id => !expectedIdSet.has(id));
  const duplicated = parsedIdSet.size !== parsedIds.length;
  if (missing.length > 0 || extra.length > 0 || duplicated) {
    throw new Error(
      `Call 2 entry IDs do not match the engine's entryIds. ` +
      `Missing: [${missing.join(', ')}]. Extra or altered: [${extra.join(', ')}].` +
      (duplicated ? ' A duplicate ID was also produced.' : ''),
    );
  }

  return { synthesisProse, timelineEntries };
}

// ── Cost ─────────────────────────────────────────────────────────────────

function computeCost(call1Usage, call2Usage) {
  const rates = TRANSIT_GENERATION_PRICING_USD_PER_MILLION_TOKENS;
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

// ── Dry-run inputs (no API call) ────────────────────────────────────────────

export async function assembleGenerationInputs(focusBody, reading) {
  const { text: userMessage, counts, meta, entryIds } = await assembleBrief(focusBody, { reading });
  return { userMessage, call2FieldBlock: userMessage, counts, meta, entryIds };
}

// ── Full generation for one body ────────────────────────────────────────────

export async function generateTransitPiece(focusBody, reading, readingSlug) {
  const { text: engineText, counts, meta, entryIds, entryDetails } = await assembleBrief(focusBody, { reading });

  const call1 = await callAnthropic(CALL1_PROMPT, engineText, CALL1_MAX_TOKENS);
  if (call1.stopReason === 'max_tokens') {
    throw new Error(`${focusBody}: Call 1 output was truncated (stop_reason=max_tokens, max_tokens=${CALL1_MAX_TOKENS}).`);
  }

  const call2UserMessage = engineText + '\nBRIEF:\n' + call1.text;
  const call2 = await callAnthropic(CALL2_PROMPT, call2UserMessage, CALL2_MAX_TOKENS);
  if (call2.stopReason === 'max_tokens') {
    throw new Error(`${focusBody}: Call 2 output was truncated (stop_reason=max_tokens, max_tokens=${CALL2_MAX_TOKENS}).`);
  }

  const { synthesisProse, timelineEntries: parsedEntries } = parseCall2Output(call2.text, entryIds);
  const { cost, totalUsage } = computeCost(call1.usage, call2.usage);

  // Join Call 2's {id, prose} onto the engine's already-computed per-entry
  // facts (SPEC.md §16, "richer timeline entries" build) -- no new
  // computation, just carrying entryDetails through to storage instead of
  // discarding it. Every id in parsedEntries is already verified against
  // entryIds by parseCall2Output, and entryDetails covers that same set, so
  // a missing match here would mean the two arrays fell out of sync -- fail
  // loud rather than silently drop calendar data for one entry.
  const entryDetailsById = new Map(entryDetails.map(d => [d.id, d]));
  const timelineEntries = parsedEntries.map(({ id, prose }) => {
    const d = entryDetailsById.get(id);
    if (!d) throw new Error(`${focusBody}: no entryDetails found for entry id "${id}" -- entryDetails and entryIds fell out of sync.`);
    return {
      id, prose,
      type: d.type, aspect: d.aspect, body_1: d.body_1, body_2: d.body_2,
      orb_open: d.orb_open, orb_close: d.orb_close, exact: d.exact,
    };
  });

  const bodyLower = focusBody.toLowerCase();
  const row = {
    id: `${readingSlug}-${bodyLower}-${meta.trigger_id}`,
    reading_slug: readingSlug,
    body: bodyLower,
    trigger_id: meta.trigger_id,
    phase_opened_date: meta.phase_opened_date,
    phase_end_date: meta.phase_end_date,
    sign: meta.sign,
    north_sign: meta.north_sign,
    south_sign: meta.south_sign,
    motion: meta.motion,
    synthesis_prose: synthesisProse,
    timeline_entries: timelineEntries,
    engine_input: { text: engineText, counts },
    brief: call1.text,
    model: MODEL,
    generation_cost_usd: cost,
    generated_at: new Date().toISOString(),
  };

  return {
    row,
    diagnostics: { call1Usage: call1.usage, call2Usage: call2.usage, totalUsage, cost },
  };
}
