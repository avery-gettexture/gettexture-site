// Fills transit_calendar from sky_positions: one row per content-regeneration
// trigger (sign ingress, retrograde re-ingress, station retrograde, station
// direct) for the 9 non-Moon planets, plus one row per Nodes axis change.
//
// Usage:
//   node --env-file=.env.local scripts/generate-transit-calendar.mjs
//   node --env-file=.env.local scripts/generate-transit-calendar.mjs --start=2026-01-01 --end=2026-12-31
//
// IMPORTANT: --start/--end only filter which rows get WRITTEN and PRINTED.
// Every body's *entire* sky_positions history (2023-01-01 to 2046-07-31) is
// always fetched and walked, because phase_end_date and sign_egress_date
// require looking at each body's next event, which may fall outside the
// requested slice. A NULL in either of those columns means the next event
// (or next sign egress) falls after 2046-07-31 -- the true end of the data --
// never because it fell outside a requested --start/--end slice.
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
  station_retrograde: 'station-retrograde',
  station_direct: 'station-direct',
};

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

// Adds phase_end_date (this body's next event of any kind) and
// sign_egress_date (this body's next ingress-type event) to each event in a
// single body's chronological event list. Both are null when no such future
// event exists within the data (the boundary case confirmed in Phase 0).
function withPhaseFields(events) {
  return events.map((ev, i) => {
    const nextAny = events[i + 1] ?? null;
    const nextIngress = events
      .slice(i + 1)
      .find((e) => e.event_type === 'ingress' || e.event_type === 'retro_ingress') ?? null;
    return {
      ...ev,
      phase_end_date: nextAny ? nextAny.date : null,
      sign_egress_date: nextIngress ? nextIngress.date : null,
    };
  });
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
    console.log(
      `${r.date}  ${r.body.padEnd(9)} ${r.event_type.padEnd(19)} ${signPart}${degreePart}` +
      `   phase_end=${r.phase_end_date ?? 'NULL'}  sign_egress=${r.sign_egress_date ?? 'NULL'}  id=${r.id}`,
    );
  }
}

async function main() {
  const { start, end } = parseArgs();
  console.log(`transit_calendar generation. Output slice: ${start} -> ${end}. (Computation always uses the full 2023-2046 sky_positions history.)`);

  const allRows = [];

  for (const body of BODIES) {
    const series = await fetchFullSeries(body);
    const events = withPhaseFields(detectBodyEvents(body, series));
    allRows.push(...events.map(toRow));
    console.log(`${body}: ${series.length} days -> ${events.length} events`);
  }

  const northSeries = await fetchFullSeries('North Node');
  const southSeries = await fetchFullSeries('South Node');
  const nodeEvents = withPhaseFields(detectNodeEvents(northSeries, southSeries));
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

  console.log('Rows written:\n');
  printTable(inSlice);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
