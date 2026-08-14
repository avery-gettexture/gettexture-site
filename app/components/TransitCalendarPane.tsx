'use client';

import { useMemo, useState } from 'react';
import { formatToday, formatContextualDate, getTodayLocalISODate } from '@/lib/date-utils';

// The CALENDAR state of the desktop transits page (SPEC §16, "Transit
// Calendar, Part 2"). A DERIVED view -- no fetch of its own, no storage
// table. It reads the richer timeline_entries the transits page already
// fetches (each entry now carries type/aspect/body_1/body_2/orb_open/
// orb_close/exact, minted at generation time -- see generate-piece.mjs and
// assemble-brief.mjs's entryDetails) and filters/sorts/labels them here.
//
// Layout per docs/mocks/transits-calendar.png and
// docs/TEXTURE_LAYOUT_PROPORTIONS.md's "Aspects & Events / Calendar panel"
// section. This pane renders INSIDE the same cream reading-zone-card the
// READ pane uses (unlike CHART) -- the caller supplies that framing.

export type CalendarEntryType = 'NATAL_CONTACT' | 'SKY_CONTACT' | 'ECLIPSE' | 'ECLIPSE_ACTIVATION';

// Fields beyond id/prose are optional here to structurally accept a stale
// prior-phase row generated before this build (bare {id, prose} only) --
// the component itself filters those out below (`if (!entry.type)
// continue`), but the type has to admit the possibility to type-check
// against what the transits page actually fetches.
export interface CalendarTimelineEntry {
  id: string;
  prose: string;
  type?: CalendarEntryType;
  aspect?: string;
  body_1?: string | null;
  body_2?: string | null;
  orb_open?: string | null;
  orb_close?: string | null;
  exact?: string | null;
}

// The internal, post-guard shape every row works with once a stale
// bare-{id,prose} entry has been filtered out (see the flatten step below)
// -- fields the data model actually guarantees are required here, so
// downstream label/sort logic doesn't have to keep re-checking for
// undefined. orb_open/orb_close/exact stay nullable because that nullability
// is a real product fact (eclipses have no orb window; a contact that never
// perfects in-phase has no exact date), not defensive typing.
interface FlatEntry {
  id: string;
  prose: string;
  type: CalendarEntryType;
  aspect: string;
  body_1: string | null;
  body_2: string | null;
  orb_open: string | null;
  orb_close: string | null;
  exact: string | null;
  bodyId: string;
}

type FilterBucket = 'natal' | 'sky' | 'eclipse';

// Three type-buckets per the build brief (NATAL_CONTACT / SKY_CONTACT /
// ECLIPSE+ECLIPSE_ACTIVATION) -- confirmed with the founder over the older
// mock/layout-doc's per-planet "Moon" filter, which predates this entry
// model and doesn't reflect it.
const FILTER_LABELS: Record<FilterBucket, string> = {
  natal: 'Aspects to My Chart',
  sky: 'Sky Aspects',
  eclipse: 'Eclipses & Events',
};
const ALL_BUCKETS: FilterBucket[] = ['natal', 'sky', 'eclipse'];

function bucketOf(type: CalendarEntryType): FilterBucket {
  if (type === 'NATAL_CONTACT') return 'natal';
  if (type === 'SKY_CONTACT') return 'sky';
  return 'eclipse';
}

// Stored dates are plain YYYY-MM-DD calendar dates (sky_positions/
// aspect_calendar convention) -- parsed via explicit y/m/d components, not
// `new Date(isoString)`, to avoid the UTC-parse-then-local-format off-by-one
// the site has already had to fix once for "today" labels (SPEC §16).
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.abs(parseLocalDate(a).getTime() - parseLocalDate(b).getTime()) / MS_PER_DAY;
}

function formatRowDate(iso: string): string {
  return formatContextualDate(parseLocalDate(iso), { month: 'short', year: undefined });
}

function aspectVerb(aspect: string): string {
  return aspect === 'conjunction' ? 'conjunct' : aspect;
}

// Name only, no text preview, per docs/TEXTURE_LAYOUT_PROPORTIONS.md's
// "Aspects & Events" content rule.
function rowLabel(entry: FlatEntry): string {
  switch (entry.type) {
    case 'NATAL_CONTACT':
      return `${entry.body_1} ${aspectVerb(entry.aspect)} natal ${entry.body_2}`;
    case 'SKY_CONTACT':
      return `${entry.body_1} ${aspectVerb(entry.aspect)} transiting ${entry.body_2}`;
    case 'ECLIPSE':
      return entry.aspect;
    case 'ECLIPSE_ACTIVATION':
      // Placeholder copy -- flagged for Avery's review, per AGENTS.md
      // (trivial-but-blocking copy proceeds with a sensible placeholder
      // rather than halting the build).
      return `${entry.aspect} — near ${entry.body_1}`;
  }
}

export default function TransitCalendarPane({
  pieces,
  onEntryClick,
}: {
  pieces: Record<string, { timeline_entries: CalendarTimelineEntry[] }>;
  onEntryClick: (bodyId: string) => void;
}) {
  const [tab, setTab] = useState<'current' | 'upcoming'>('current');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeBuckets, setActiveBuckets] = useState<Set<FilterBucket>>(
    () => new Set(ALL_BUCKETS),
  );

  const today = useMemo(() => getTodayLocalISODate(), []);

  const toggleBucket = (b: FilterBucket) => {
    setActiveBuckets(prev => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  };

  const rows = useMemo(() => {
    const flat: FlatEntry[] = [];
    for (const [bodyId, piece] of Object.entries(pieces)) {
      for (const entry of piece.timeline_entries ?? []) {
        // Defensive against a stale prior-phase row that predates this
        // build (bare {id, prose} only, no `type`) -- the page already
        // keeps only the newest row per body, which is always richly
        // shaped going forward, but a piece from before this change could
        // still be the newest one for a body that hasn't regenerated yet.
        if (!entry.type || !entry.aspect) continue;
        flat.push({
          id: entry.id,
          prose: entry.prose,
          type: entry.type,
          aspect: entry.aspect,
          body_1: entry.body_1 ?? null,
          body_2: entry.body_2 ?? null,
          orb_open: entry.orb_open ?? null,
          orb_close: entry.orb_close ?? null,
          exact: entry.exact ?? null,
          bodyId,
        });
      }
    }

    // CONTENTS: everything currently in orb, plus eclipses on/around their
    // exact date -- and per the founder's ruling, anything fully over
    // disappears immediately (no "recently happened" grace period).
    const isPointEvent = (e: FlatEntry) => e.type === 'ECLIPSE' || e.type === 'ECLIPSE_ACTIVATION';
    const isOver = (e: FlatEntry) => (isPointEvent(e) ? (e.exact as string) < today : (e.orb_close as string) < today);
    const hasStarted = (e: FlatEntry) => (isPointEvent(e) ? (e.exact as string) <= today : (e.orb_open as string) <= today);

    const alive = flat.filter(e => !isOver(e));
    const tabbed = alive.filter(e => (tab === 'current' ? hasStarted(e) : !hasStarted(e)));
    const filtered = tabbed.filter(e => activeBuckets.has(bucketOf(e.type)));

    // SORT: smallest absolute distance (in days) between today and the
    // entry's exact date, first -- past-or-future both count by absolute
    // distance. Entries with no exact date (a contact that never perfects
    // in-phase) sort after every dated entry, sub-sorted by proximity of
    // orb_open to today.
    return [...filtered].sort((a, b) => {
      const aExact = a.exact, bExact = b.exact;
      if (!!aExact !== !!bExact) return aExact ? -1 : 1;
      if (aExact && bExact) return daysBetween(aExact, today) - daysBetween(bExact, today);
      return daysBetween(a.orb_open as string, today) - daysBetween(b.orb_open as string, today);
    });
  }, [pieces, today, tab, activeBuckets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 8px 12px' }}>

      {/* Header: date + title, mirrors card-header's red rule convention. */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(11px, 1.2vw, 14px)',
          color: 'rgba(22,22,18,0.45)',
          letterSpacing: '0.5px',
        }}>
          {formatToday()}
        </div>
        <h1 className="planet-name" style={{ marginTop: '6px' }}>Aspects and Events</h1>
        <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', marginTop: '10px' }} />
      </div>

      {/* Controls row: Current/Upcoming (left) + Filter/links (right). */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: '18px',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 'clamp(12px, 1.1vw, 14px)',
        letterSpacing: '0.5px',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span
            onClick={() => setTab('current')}
            style={{
              cursor: 'pointer',
              color: tab === 'current' ? 'var(--dark)' : 'rgba(22,22,18,0.40)',
              fontWeight: tab === 'current' ? 700 : 400,
            }}
          >
            Current
          </span>
          <span
            onClick={() => setTab('upcoming')}
            style={{
              cursor: 'pointer',
              color: tab === 'upcoming' ? 'var(--dark)' : 'rgba(22,22,18,0.40)',
              fontWeight: tab === 'upcoming' ? 700 : 400,
            }}
          >
            Upcoming
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', color: 'rgba(22,22,18,0.55)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => setFilterOpen(o => !o)}>
            Filter {filterOpen ? '︿' : '⌄'}
          </span>
          {filterOpen && ALL_BUCKETS.map(bucket => (
            <span
              key={bucket}
              onClick={() => toggleBucket(bucket)}
              style={{
                cursor: 'pointer',
                color: activeBuckets.has(bucket) ? 'rgba(22,22,18,0.75)' : 'rgba(22,22,18,0.35)',
                fontWeight: activeBuckets.has(bucket) ? 600 : 400,
              }}
            >
              {activeBuckets.has(bucket) ? '✓ ' : ''}{FILTER_LABELS[bucket]}
            </span>
          ))}
        </div>
      </div>

      {/* Vertical timeline axis -- real, derived rows. Top = closest to
          exact (Newest for Current, Soonest for Upcoming); bottom =
          farthest (Oldest / Latest), per
          docs/TEXTURE_LAYOUT_PROPORTIONS.md's ordering rule. */}
      <div style={{ flex: 1, minHeight: 0, marginTop: '24px', position: 'relative', paddingLeft: '24px', overflowY: 'auto' }}>
        <div style={{
          position: 'absolute',
          left: '4px',
          top: '4px',
          bottom: rows.length > 0 ? undefined : '4px',
          height: rows.length > 0 ? `${Math.max(rows.length * 32 - 20, 0)}px` : undefined,
          width: '1px',
          background: 'rgba(22,22,18,0.20)',
        }} />
        {rows.length === 0 ? (
          <p className="placeholder-text" style={{ fontFamily: 'var(--font-questrial), sans-serif' }}>
            Nothing {tab === 'current' ? 'currently active' : 'upcoming'} right now.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rows.map(entry => (
              <div
                key={entry.id}
                onClick={() => onEntryClick(entry.bodyId)}
                style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: '10px', cursor: 'pointer', minHeight: '20px' }}
              >
                <span style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '5px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'rgba(22,22,18,0.30)',
                }} />
                <span style={{
                  fontFamily: 'var(--font-questrial), sans-serif',
                  fontSize: 'clamp(12px, 1.1vw, 14px)',
                  color: 'rgba(22,22,18,0.80)',
                }}>
                  {rowLabel(entry)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 'clamp(11px, 1vw, 13px)',
                  color: 'rgba(22,22,18,0.40)',
                  whiteSpace: 'nowrap',
                }}>
                  {formatRowDate(entry.exact ?? (entry.orb_open as string))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
