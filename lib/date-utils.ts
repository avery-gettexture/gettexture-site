// Formatter for CONTEXTUAL date displays — present-day dates, calendar
// entries, timeline dates, "as of" timestamps. Renders via Intl.DateTimeFormat
// with locale left undefined so the browser's own device locale decides
// month/day ordering and any other regional convention automatically — no
// manual format logic to maintain. Reuse this for every future contextual
// date on the site (the transits calendar entries and the phase-opened date
// are the known upcoming cases per docs/SPEC.md §16); do not hand-roll
// another date formatter alongside it.
//
// NEVER use this for BIRTH DATA (natal birth date/time/location). Birth
// data is shown in its own stored, birth-location convention and must not
// be reformatted to the viewer's device locale — see the shared formatDate()
// in app/components/BirthDataSection.tsx for that separate, intentionally
// non-localized path.
export function formatContextualDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(date);
}

// Today's date, in the visitor's own device locale. `new Date()` uses the
// runtime's own local getters, so this is the caller's local day whenever
// it runs in a browser (both current call sites are client components with
// no server-rendering of this value) — not a fixed server/UTC day.
export function formatToday(): string {
  return formatContextualDate(new Date());
}

// Today's date as a plain YYYY-MM-DD string, in the visitor's own device
// locale (same local-getters approach as formatToday() above — no manual
// timezone math). Built for direct string comparison against stored
// calendar-date fields (orb_open/orb_close/exact on transit_pieces'
// timeline_entries, themselves plain YYYY-MM-DD strings), not for display —
// use formatToday()/formatContextualDate() for anything shown to a reader.
export function getTodayLocalISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parses a plain YYYY-MM-DD calendar-date string (orb_open/orb_close/exact,
// window_start/window_end/exact_date, etc.) as a LOCAL date, not UTC —
// `new Date(isoString)` parses bare date strings as UTC midnight, which then
// renders as the PREVIOUS day in any timezone behind UTC (the off-by-one bug
// already fixed once for the Transit Calendar, SPEC §16 Aug 14 entry). Use
// this wherever a stored calendar-date string needs to become a Date for
// display or comparison — do not re-parse with `new Date(iso)` alongside it.
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
