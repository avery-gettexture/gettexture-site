// Shared "today" label for CONTEXTUAL date displays (present-day dates —
// never birth data; see docs/SPEC.md §16 for the browser-local-date audit
// this was extracted from). `new Date()` uses the runtime's own local
// getters, so this is the caller's local day whenever it runs in a browser
// (both call sites are client components with no server-rendering of this
// value) — not a fixed server/UTC day.
export function formatToday(): string {
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}
