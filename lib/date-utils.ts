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
