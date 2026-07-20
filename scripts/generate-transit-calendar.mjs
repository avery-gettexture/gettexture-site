// Fills transit_calendar from sky_positions: one row per content-regeneration
// trigger (sign ingress, retrograde re-ingress, direct re-ingress, station
// retrograde, station direct) for the 9 non-Moon planets, plus one row per
// Nodes axis change.
//
// Usage:
//   node --env-file=.env.local scripts/generate-transit-calendar.mjs
//   node --env-file=.env.local scripts/generate-transit-calendar.mjs --start=2026-01-01 --end=2026-12-31
//
// IMPORTANT: --start/--end only filter which rows get WRITTEN and PRINTED.
// Every body's *entire* sky_positions history (2023-01-01 to 2046-07-31) is
// always fetched and walked, because phase_end_date and the passage fields
// require looking at each body's next event (and each passage's next
// entry), which may fall outside the requested slice. A NULL in any of
// those columns means the relevant event falls after 2046-07-31 -- the true
// end of the data -- never because it fell outside a requested slice.
//
// DATING CONVENTION: a sky_positions row for date D records the sky at
// D's 00:00 UTC -- the very start of that calendar day. When a change is
// first visible on day D+1's row, the true change happened sometime during
// day D (D's own snapshot, taken before the change, still shows the old
// state; D+1's snapshot, taken after, already shows the new one) -- so the
// entire calendar day D is what's "swept" between the two snapshots,
// regardless of what clock time within day D the true change occurred.
// Every event here is therefore dated D (the EARLIER of the two bracketing
// snapshot days), never D+1. What actually changed (the new sign, the new
// motion direction) is necessarily read off D+1's row, since D's row hasn't
// recorded it yet -- that's unavoidable, not an inconsistency. Any other
// point-in-time value on the row (a station's degree) is read from D, the
// same day the row is dated to.
//
// ── THE PASSAGE MODEL (ratified July 2026) ──────────────────────────────
//
// A passage is a body's entire association with one sign: first ingress to
// TRUE FINAL egress, any retrograde dips included. Passage MEMBERSHIP is
// sign-consonant: every row belongs to the passage of the sign it is
// actually IN -- a retrograde dip's own rows (its retro_ingress landing in
// the previous sign, any stations while dipped, and its return leg) belong
// to the DIPPED-INTO sign's passage, not the sign that was dipped out of.
// Because a passage stays open through any dip and only closes at its true
// final egress, ADJACENT PASSAGES INTERLEAVE IN TIME -- a body oscillating
// between two signs keeps both signs' passages open simultaneously, and
// their date ranges legitimately overlap. This is correct, not a defect
// (confirmed against real cases: Saturn's Pisces passage, 2023-03-07 to
// 2026-02-14, overlaps its own Aries passage, 2025-05-25 to 2028-04-13, by
// the ~9 months Saturn spends wobbling across that one boundary).
//
// EVENT TYPES: three symmetric ingress-type events. ingress = a sign's
// first-ever arrival within its passage. retro_ingress = backing retrograde
// into the previous sign (always a dip's departure leg -- structurally,
// this can never be a passage's first arrival, since retrograde motion can
// only re-enter a sign the body has already forward-crossed into at some
// earlier point). re_ingress = a direct (forward) crossing back into a sign
// already entered earlier in the same passage (a dip's return leg) -- a
// plain 'ingress' event detected by detectBodyEvents is retyped to
// re_ingress here whenever it is not that passage's first entry.
//
// ENTRY COUNTING: every ingress-type row (ingress, retro_ingress,
// re_ingress) carries entry_number (1 for the passage's first ingress, 2
// for its first return by either re_ingress or retro_ingress, ...) and the
// passage's entry_count. A retro_ingress row counts as an entry into the
// sign it backs into -- e.g. Pluto's Capricorn passage is entered once by
// its (pre-data) first ingress and re-entered by each of its two 2023/2024
// retrograde dips, for 3 entries total. Station rows never carry these
// fields (NULL).
//
// LEADING-EDGE (PRE-RANGE) PASSAGES: every body's data-start sign (2023-01-
// 01) is itself a passage whose true first ingress predates the tracked
// range. It is handled like any other passage EXCEPT: passage_id uses the
// anchor-less convention {body}-{sign}-pre-range (no date to anchor on),
// passage_first_ingress_date is NULL, and -- because the true total number
// of entries into that passage is itself unknowable when its beginning is
// outside the data -- entry_number and entry_count are NULL on every row
// belonging to it, not just the unrecorded first entry. (Most bodies'
// pre-range passage never gains a real row at all, if the body never dips
// back into its data-start sign -- that's fine, it simply never gets
// stamped onto anything.)
//
// FINAL EGRESS (sign_egress_date, corrected): a passage's true final egress
// is the date of the entry-type event (any sign) that immediately follows
// that passage's own last (merged) entry, in the body's full chronological
// event history. Identical on every row sharing a passage_id. This is the
// SAME "next sign change" rule the column always used -- corrected here to
// read the passage's true last entry (which sign-consonant merging may
// place many events later than a naive per-leg reading would) rather than
// each leg's own immediate next change.
//
// Deterministic and idempotent: identical sky_positions data always produces
// identical rows and identical IDs. Re-running (with the same or a wider
// slice) upserts on id -- a no-op for rows that already match.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PAGE_SIZE = 1000;

const BODIES = [
  'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// Maps event_type (stored in the DB) to the ID slug (used in text IDs).
// One uniform naming system, no abbreviations -- amended per founder ruling.
const EVENT_SLUG = {
  ingress: 'ingress',
  retro_ingress: 'retro-ingress',
  re_ingress: 're-ingress',
  station_retrograde: 'station-retrograde',
  station_direct: 'station-direct',
};

// The original ingress-type events detectBodyEvents/detectNodeEvents can
// produce -- BEFORE any re_ingress retyping (re_ingress does not exist yet
// at detection time; it is derived downstream by withPassageFields).
const RAW_INGRESS_TYPES = new Set(['ingress', 'retro_ingress']);

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v];
    }),
  );
  return {
    start: args.start ?? '2023-01-01',
    end: args.end ?? '2046-07-31',
  };
}

async function fetchFullSeries(body) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('sky_positions')
      .select('date, sign, sign_degree, retrograde')
      .eq('body', body)
      .order('date', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase read failed for ${body}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

function detectBodyEvents(body, rows) {
  const events = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    const signChanged = cur.sign !== prev.sign;
    const flagFlipped = cur.retrograde !== prev.retrograde;

    if (signChanged && flagFlipped) {
      // Phase 0 found zero same-day collisions across the full dataset for
      // every station-capable body. If this ever fires, the data changed in
      // a way the design didn't anticipate -- stop rather than guess.
      throw new Error(
        `${body}: sign change AND retrograde flip both land on ${cur.date}. ` +
        `This case was not observed during Phase 0 validation -- needs manual review before proceeding.`,
      );
    }

    if (signChanged) {
      events.push({
        body,
        event_type: cur.retrograde ? 'retro_ingress' : 'ingress',
        sign: cur.sign, // the new sign -- only cur's row has recorded it
        date: prev.date, // the true crossing happened during prev's day
        degree: null,
      });
    } else if (flagFlipped) {
      events.push({
        body,
        event_type: cur.retrograde ? 'station_retrograde' : 'station_direct',
        sign: prev.sign, // unchanged across a pure station; same either way
        date: prev.date, // the true station happened during prev's day
        degree: prev.sign_degree,
      });
    }
  }
  return events;
}

function detectNodeEvents(northRows, southRows) {
  if (northRows.length !== southRows.length) {
    throw new Error(`North Node and South Node have different row counts (${northRows.length} vs ${southRows.length}).`);
  }

  for (let i = 0; i < northRows.length; i++) {
    const n = northRows[i];
    const s = southRows[i];
    if (n.date !== s.date) {
      throw new Error(`North/South Node date mismatch at index ${i}: ${n.date} vs ${s.date}`);
    }
    const expectedSouthSign = SIGNS[(SIGNS.indexOf(n.sign) + 6) % 12];
    if (expectedSouthSign !== s.sign) {
      throw new Error(`North Node (${n.sign}) and South Node (${s.sign}) are not opposite signs on ${n.date}.`);
    }
  }

  const events = [];
  for (let i = 1; i < northRows.length; i++) {
    if (northRows[i].sign !== northRows[i - 1].sign) {
      events.push({
        body: 'Nodes',
        event_type: 'ingress',
        north_sign: northRows[i].sign, // the new sign -- only row i has recorded it
        south_sign: southRows[i].sign,
        date: northRows[i - 1].date, // the true crossing happened during row i-1's day
        degree: null,
      });
    }
  }
  return events;
}

// Computes phase_end_date (unchanged: this body's next event of any kind)
// and the full passage model (see the header comment) for one body's (or
// Nodes') full chronological event list. Retypes qualifying 'ingress'
// events to 're_ingress' in the returned copies.
//
// startKey: the sign-identity of whatever this body occupies at the data
// range's start (2023-01-01) -- a plain sign string for the nine bodies, or
// "NorthSign|SouthSign" for Nodes.
// keyFn(event): the sign-identity of a real event, in the same shape as
// startKey.
// idStemFn(event, dateStr): the passage_id for a real first-ingress event
// dated dateStr.
// preRangeIdFn(key): the passage_id for an anchor-less (pre-range) passage
// whose sign-identity is key.
function withPassageFields(events, startKey, keyFn, idStemFn, preRangeIdFn) {
  const withPhaseEnd = events.map((ev, i) => ({
    ...ev,
    phase_end_date: events[i + 1] ? events[i + 1].date : null,
  }));

  // arr[0] = virtual pre-range entry (no row, unknown date). arr[k], k>=1,
  // corresponds 1:1, in order, to withPhaseEnd's entry-type events.
  const entryEvents = withPhaseEnd.filter((e) => RAW_INGRESS_TYPES.has(e.event_type));
  const arr = [{ virtual: true, key: startKey, date: null, ev: null }];
  for (const e of entryEvents) arr.push({ virtual: false, key: keyFn(e), date: e.date, ev: e });

  // MERGE: entry i joins the same passage as entry (i-2) iff they share a
  // sign-identity -- a body only ever dips into the immediately-adjacent
  // sign, so a genuine return can only ever be exactly 2 entries back in
  // the sequence, never further and never requiring any other special
  // casing (verified against Pluto's Aquarius/Capricorn double interleave
  // and Saturn's Aries/Pisces interleave during Step 1 planning).
  const passageOfIdx = new Array(arr.length).fill(null);
  const passages = [];
  for (let i = 0; i < arr.length; i++) {
    if (i >= 2 && arr[i].key === arr[i - 2].key) {
      const p = passageOfIdx[i - 2];
      p.memberIdx.push(i);
      passageOfIdx[i] = p;
    } else {
      const p = { key: arr[i].key, memberIdx: [i] };
      passages.push(p);
      passageOfIdx[i] = p;
    }
  }

  for (const p of passages) {
    const lastIdx = p.memberIdx[p.memberIdx.length - 1];
    // TRUE final egress: the date of the entry-event immediately following
    // this passage's own last (merged) entry, across the FULL sequence.
    p.finalEgress = (lastIdx + 1 < arr.length) ? arr[lastIdx + 1].date : null;
    const firstMember = arr[p.memberIdx[0]];
    p.firstIngress = firstMember.virtual ? null : firstMember.date;
    p.passageId = p.firstIngress ? idStemFn(firstMember.ev, p.firstIngress) : preRangeIdFn(p.key);
    // unknowable-total rule: NULL entry_count throughout a pre-range passage.
    p.entryCount = p.firstIngress ? p.memberIdx.length : null;
  }

  // Per-entry retype decision + entry_number, keyed by arr index. Retyping
  // depends on POSITION within the passage regardless of whether that
  // position is displayed (pre-range passages still retype a later
  // forward-return even though their own entry_number displays as NULL).
  const entryNumberByArrIdx = new Map();
  const retypeByArrIdx = new Map();
  for (const p of passages) {
    p.memberIdx.forEach((idx, pos) => {
      const position = pos + 1;
      entryNumberByArrIdx.set(idx, p.firstIngress ? position : null);
      const ev = arr[idx].ev;
      if (ev && ev.event_type === 'ingress' && position > 1) retypeByArrIdx.set(idx, true);
    });
  }

  // Row membership: every event (entry-type or station) belongs to the
  // passage of the most recent entry-event at or before it -- arr indices
  // 1.. correspond 1:1, in order, to withPhaseEnd's entry-type events, so a
  // single pointer through arr tracks "current passage" correctly.
  let curPassage = passageOfIdx[0];
  let arrPtr = 1;
  const out = [];
  for (const ev of withPhaseEnd) {
    if (RAW_INGRESS_TYPES.has(ev.event_type)) {
      const idx = arrPtr;
      curPassage = passageOfIdx[idx];
      const willRetype = retypeByArrIdx.get(idx) === true;
      out.push({
        ...ev,
        event_type: willRetype ? 're_ingress' : ev.event_type,
        entry_number: entryNumberByArrIdx.get(idx),
        entry_count: curPassage.entryCount,
        passage_id: curPassage.passageId,
        passage_first_ingress_date: curPassage.firstIngress,
        sign_egress_date: curPassage.finalEgress,
      });
      arrPtr++;
    } else {
      out.push({
        ...ev,
        entry_number: null,
        entry_count: null,
        passage_id: curPassage.passageId,
        passage_first_ingress_date: curPassage.firstIngress,
        sign_egress_date: curPassage.finalEgress,
      });
    }
  }
  return out;
}

function buildId(ev) {
  const slug = EVENT_SLUG[ev.event_type];
  if (ev.body === 'Nodes') {
    return `nodes-${slug}-${ev.north_sign.toLowerCase()}-${ev.south_sign.toLowerCase()}-${ev.date}`;
  }
  return `${ev.body.toLowerCase()}-${slug}-${ev.sign.toLowerCase()}-${ev.date}`;
}

function toRow(ev) {
  return {
    id: buildId(ev),
    body: ev.body,
    event_type: ev.event_type,
    sign: ev.body === 'Nodes' ? null : ev.sign,
    north_sign: ev.body === 'Nodes' ? ev.north_sign : null,
    south_sign: ev.body === 'Nodes' ? ev.south_sign : null,
    date: ev.date,
    degree: ev.degree,
    phase_end_date: ev.phase_end_date,
    sign_egress_date: ev.sign_egress_date,
    passage_id: ev.passage_id,
    passage_first_ingress_date: ev.passage_first_ingress_date,
    entry_number: ev.entry_number,
    entry_count: ev.entry_count,
  };
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log('(no rows in the requested slice)');
    return;
  }
  for (const r of rows) {
    const signPart = r.body === 'Nodes' ? `${r.north_sign}/${r.south_sign}` : r.sign;
    const degreePart = r.degree != null ? ` @ ${r.degree.toFixed(2)}°` : '';
    const entryPart = r.entry_number != null ? ` entry=${r.entry_number}/${r.entry_count}` : '';
    console.log(
      `${r.date}  ${r.body.padEnd(9)} ${r.event_type.padEnd(19)} ${signPart}${degreePart}` +
      `   phase_end=${r.phase_end_date ?? 'NULL'}  sign_egress=${r.sign_egress_date ?? 'NULL'}` +
      `${entryPart}  passage=${r.passage_id}  id=${r.id}`,
    );
  }
}

async function main() {
  const { start, end } = parseArgs();
  console.log(`transit_calendar generation. Output slice: ${start} -> ${end}. (Computation always uses the full 2023-2046 sky_positions history.)`);

  const allRows = [];

  for (const body of BODIES) {
    const series = await fetchFullSeries(body);
    const rawEvents = detectBodyEvents(body, series);
    const events = withPassageFields(
      rawEvents,
      series[0].sign,
      (e) => e.sign,
      (ev, dateStr) => `${body.toLowerCase()}-${ev.sign.toLowerCase()}-${dateStr}`,
      (key) => `${body.toLowerCase()}-${key.toLowerCase()}-pre-range`,
    );
    allRows.push(...events.map(toRow));
    console.log(`${body}: ${series.length} days -> ${events.length} events`);
  }

  const northSeries = await fetchFullSeries('North Node');
  const southSeries = await fetchFullSeries('South Node');
  const rawNodeEvents = detectNodeEvents(northSeries, southSeries);
  const nodeEvents = withPassageFields(
    rawNodeEvents,
    `${northSeries[0].sign}|${southSeries[0].sign}`,
    (e) => `${e.north_sign}|${e.south_sign}`,
    (ev, dateStr) => `nodes-${ev.north_sign.toLowerCase()}-${ev.south_sign.toLowerCase()}-${dateStr}`,
    (key) => `nodes-${key.toLowerCase().replace('|', '-')}-pre-range`,
  );
  allRows.push(...nodeEvents.map(toRow));
  console.log(`Nodes: ${northSeries.length} days -> ${nodeEvents.length} axis changes`);

  const inSlice = allRows.filter((r) => r.date >= start && r.date <= end);
  inSlice.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));

  console.log(`\nTotal rows across full range: ${allRows.length}. Rows in requested slice (${start} -> ${end}): ${inSlice.length}.\n`);

  if (inSlice.length > 0) {
    const { error } = await supabase
      .from('transit_calendar')
      .upsert(inSlice, { onConflict: 'id' });
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
  }

  // Reconcile stale ids: this generation's re_ingress retyping changes some
  // rows' ids (the event-type word is part of the id string), and upsert
  // never deletes -- so any row already in the table, within the requested
  // slice, whose id this run did NOT (re)compute is a pre-retype orphan
  // (e.g. an old plain-ingress id superseded by its re-ingress id) and must
  // be deleted, or the table ends up with both the old and new row.
  const newIds = new Set(inSlice.map((r) => r.id));
  const existingIds = [];
  {
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('transit_calendar')
        .select('id')
        .gte('date', start).lte('date', end)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(`Supabase read failed while checking for stale ids: ${error.message}`);
      existingIds.push(...data.map((r) => r.id));
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }
  const staleIds = existingIds.filter((id) => !newIds.has(id));
  if (staleIds.length > 0) {
    console.log(`\nDeleting ${staleIds.length} stale row(s) (ids superseded by retyping, e.g. a plain ingress id replaced by its re-ingress id):`);
    staleIds.forEach((id) => console.log(`  - ${id}`));
    const { error } = await supabase.from('transit_calendar').delete().in('id', staleIds);
    if (error) throw new Error(`Supabase delete failed for stale ids: ${error.message}`);
  }

  console.log('Rows written:\n');
  printTable(inSlice);
}

// Guard against running on import: this script writes to a live table.
// Only run when invoked directly, never on import (see the note in
// generate-aspect-calendar.mjs for why this matters).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
