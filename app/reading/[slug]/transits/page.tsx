'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DOGFOOD_READING_SLUG } from '@/lib/config';
import NavBar from '@/app/components/NavBar';
import MobileNavShell from '@/app/components/MobileNavShell';
import Rail, { type RailRow } from '@/app/components/Rail';
import TransitChartPane, { type ChartMode } from '@/app/components/TransitChartPane';
import TransitCalendarPane, { type CalendarEntryType } from '@/app/components/TransitCalendarPane';
import { RAIL_SIGN_GLYPHS } from '@/app/reading/[slug]/natal/page';

// ── Types ──────────────────────────────────────────────────────────────────

interface TransitBodyConfig {
  id: string;
  name: string;
  background: string;
}

// Widened per SPEC §16 ("Transit Calendar, Part 1"): generate-piece.mjs now
// stores the engine's already-computed per-entry facts alongside the prose,
// so the Calendar pane can derive its rows without a fetch of its own. A
// stale prior-phase row (generated before this change) may still carry only
// {id, prose} -- fields below are optional to cover that, and
// TransitCalendarPane skips any entry missing `type`.
interface TimelineEntry {
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

interface TransitPieceRow {
  body: string;
  synthesis_prose: string;
  timeline_entries: TimelineEntry[];
  phase_opened_date: string;
}

// Reading fields the desktop CHART pane's wheel stand-in needs (SPEC §16:
// this reuses the natal chart_data plumbing rather than throwing it away —
// the real transit/bi-wheel will need the same fields).
interface Reading {
  name: string;
  chart_data: any;
  birth_time_known: boolean;
}

// ── Body config (mobile — unchanged) ────────────────────────────────────────
// Order per the build spec: Sun, Mercury, Venus, Mars, Jupiter, Saturn,
// Uranus, Neptune, Pluto, Nodes. No ASC/MC windows; Nodes is one window.
// Moon is intentionally absent here (SPEC §3.6: ambient-only, no per-user
// standing piece) — this list is untouched by the desktop build below.

const TRANSIT_BODIES: TransitBodyConfig[] = [
  { id: 'sun',     name: 'Sun',     background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sun-background.png' },
  { id: 'mercury', name: 'Mercury', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mercury-background.png' },
  { id: 'venus',   name: 'Venus',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/venus-background.png' },
  { id: 'mars',    name: 'Mars',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mars-background.png' },
  { id: 'jupiter', name: 'Jupiter', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/jupiter-background.png' },
  { id: 'saturn',  name: 'Saturn',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/saturn-background.png' },
  { id: 'uranus',  name: 'Uranus',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/uranus-background.png' },
  { id: 'neptune', name: 'Neptune', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/neptune-background.png' },
  { id: 'pluto',   name: 'Pluto',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/pluto-background.png' },
  { id: 'nodes',   name: 'Nodes',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/nodes-background.png' },
];

// ── Body config (desktop rail/reading pane — 11 rows) ───────────────────────
// Per the founder's brief: "the current sky" — Sun through Pluto plus Nodes
// as one row, WITH Moon (unlike the mobile list above). Moon is included
// here because the rail represents what's currently in the sky, not which
// bodies have a generated standing piece; its Overview will always show the
// "being prepared" placeholder until Moon's separate ambient-content system
// exists (SPEC §3.6) — flagged, not silently special-cased.
const SKY_BODIES: TransitBodyConfig[] = [
  { id: 'sun',     name: 'Sun',     background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sun-background.png' },
  { id: 'moon',    name: 'Moon',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/moon-background.png' },
  { id: 'mercury', name: 'Mercury', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mercury-background.png' },
  { id: 'venus',   name: 'Venus',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/venus-background.png' },
  { id: 'mars',    name: 'Mars',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mars-background.png' },
  { id: 'jupiter', name: 'Jupiter', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/jupiter-background.png' },
  { id: 'saturn',  name: 'Saturn',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/saturn-background.png' },
  { id: 'uranus',  name: 'Uranus',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/uranus-background.png' },
  { id: 'neptune', name: 'Neptune', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/neptune-background.png' },
  { id: 'pluto',   name: 'Pluto',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/pluto-background.png' },
  { id: 'nodes',   name: 'Nodes',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/nodes-background.png' },
];

const SKY_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  nodes: '☊', 'nodes-south': '☋',
};

// get_current_sky_positions() (scripts/create_today_sky_rpcs.sql) returns
// full body names ("Sun", "North Node", ...) — SKY_BODIES above uses short
// rail ids, so this maps id -> RPC name (same map shape as
// HomeTodaySkyPanel.tsx's BODY_GLYPH keys).
const SKY_BODY_NAME: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
  nodes: 'North Node',
};

interface SkyPosition {
  body: string;
  sign: string;
  sign_degree: number;
  retrograde: boolean;
}

// HIDE (SPEC §16, hide-transits pass): planet card content and the rail's
// Calendar control are suppressed until transits content is ready to ship.
// Flip either flag back to true to restore. The shell (rail with live
// sign/degree/dates, nav, chart view) is unaffected by both.
const SHOW_TRANSIT_CARD_CONTENT = false;
const SHOW_CALENDAR_RAIL_CONTROL = false;

const PLACEHOLDER_SYNTHESIS = 'This transit reading is being prepared. Check back shortly.';
const PLACEHOLDER_TIMELINE = 'Timeline entries will appear here once this piece is generated.';
// Reference is placeholder for now, not a mirror of natal's live Reference
// tab (see the founder brief's flagged gap): natal's reference content is
// generated from the NATAL chart's own degree/sign/house, and there is no
// live "current sky" position data reaching the browser to generate a
// correct transiting-body equivalent yet.
const PLACEHOLDER_REFERENCE = 'Reference definitions for this body will appear here.';

// ── Mobile Body Card Component (unchanged) ──────────────────────────────────

function TransitBodyCard({ body, customerName, piece }: { body: TransitBodyConfig; customerName: string; piece?: TransitPieceRow }) {
  return (
    <>
      <div className="card-outer" />
      <div className="card-inner">
        <div className="card-header">
          <h1 className="planet-name">{body.name}</h1>
          <p className="placeholder-text" style={{ fontSize: 'clamp(11px, 3.4vw, 14px)' }}>current phase — pending</p>
          <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '0' }} />
        </div>

        <div className="card-content">
          <div className="section-row" style={{ cursor: 'default' }}>
            <span className="section-row-label">Synthesis</span>
          </div>
          <div className="section-body">
            {piece ? (
              <p>{piece.synthesis_prose}</p>
            ) : (
              <p className="placeholder-text">{PLACEHOLDER_SYNTHESIS}</p>
            )}
          </div>

          <div className="section-divider" />

          <div className="section-row" style={{ cursor: 'default' }}>
            <span className="section-row-label">Timeline</span>
          </div>
          <div className="section-body">
            {piece ? (
              piece.timeline_entries.length > 0 ? (
                piece.timeline_entries.map(entry => <p key={entry.id}>{entry.prose}</p>)
              ) : (
                <p className="placeholder-text">No dated entries this phase.</p>
              )
            ) : (
              <p className="placeholder-text">{PLACEHOLDER_TIMELINE}</p>
            )}
          </div>
        </div>

        <div className="card-footer">
          <span className="card-name">{customerName}</span>
        </div>
      </div>
    </>
  );
}

// ── Desktop body card content (3-section accordion) ─────────────────────────
// Mirrors natal's PlacementCardContent (app/reading/[slug]/natal/page.tsx)
// exactly — single-open accordion, Overview open by default — with a third
// "Timeline" section added between Overview and Reference, per the founder's
// brief. Bottom label reads "Transits" (a literal string), not the
// customer's name, per the same brief.

type SectionKey = 'overview' | 'timeline' | 'reference';

function TransitBodyCardContent({ body, piece }: { body: TransitBodyConfig; piece?: TransitPieceRow }) {
  const [openSection, setOpenSection] = useState<SectionKey>('overview');

  // HIDDEN (SPEC §16, hide-transits pass, SHOW_TRANSIT_CARD_CONTENT above):
  // every planet card's reading pane shows only "Coming soon." — no name,
  // no accordions, no body text. The real content below is kept intact and
  // restorable by flipping the flag back to true.
  if (!SHOW_TRANSIT_CARD_CONTENT) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(36px, 6vw, 64px)',
          color: 'var(--dark)',
          letterSpacing: '1px',
        }}>
          Coming soon.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="card-header">
        <h1 className="planet-name">{body.name}</h1>
        <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '0' }} />
      </div>

      <div className="card-content">
        <div className="section-row" onClick={() => setOpenSection('overview')}>
          <span className="section-row-label">Overview</span>
          <span className="section-row-chevron">{openSection === 'overview' ? '−' : '+'}</span>
        </div>
        {openSection === 'overview' && (
          <div className="section-body">
            <p className="body-text">{piece ? piece.synthesis_prose : PLACEHOLDER_SYNTHESIS}</p>
          </div>
        )}

        <div className="section-divider" />

        <div className="section-row" onClick={() => setOpenSection('timeline')}>
          <span className="section-row-label">Timeline</span>
          <span className="section-row-chevron">{openSection === 'timeline' ? '−' : '+'}</span>
        </div>
        {openSection === 'timeline' && (
          <div className="section-body">
            {piece ? (
              piece.timeline_entries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {piece.timeline_entries.map(entry => (
                    <p className="body-text" key={entry.id}>{entry.prose}</p>
                  ))}
                </div>
              ) : (
                <p className="placeholder-text">No dated entries this phase.</p>
              )
            ) : (
              <p className="placeholder-text">{PLACEHOLDER_TIMELINE}</p>
            )}
          </div>
        )}

        <div className="section-divider" />

        <div className="section-row" onClick={() => setOpenSection('reference')}>
          <span className="section-row-label">Reference</span>
          <span className="section-row-chevron">{openSection === 'reference' ? '−' : '+'}</span>
        </div>
        {openSection === 'reference' && (
          <div className="section-body">
            <p className="placeholder-text">{PLACEHOLDER_REFERENCE}</p>
          </div>
        )}
      </div>

      <div className="card-footer">
        <span className="card-name">Transits</span>
      </div>
    </>
  );
}

// ── Desktop shell (>=1024px) ────────────────────────────────────────────────
// Copies natal's DesktopNatal (app/reading/[slug]/natal/page.tsx) almost
// line-for-line: the same one-native-scroll mechanic (.natal-scroll /
// .natal-section / .natal-zone, all shared, unmodified CSS classes), same
// rail-driven snap-to-section behavior, same IntersectionObserver
// active-row tracking, same wheel-forwarding-from-rail trick. Deltas per
// the founder's brief: 11 rows titled "Sky", a third CALENDAR pane state,
// a 3-section accordion, and swapped background images.
function DesktopTransits({
  slug,
  reading,
  pieces,
}: {
  slug: string;
  reading: Reading;
  pieces: Record<string, TransitPieceRow>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Transits opens on the CHART view by default (founder request, SPEC
  // §16) — unlike My Chart's DesktopNatal, which still defaults to 'read'.
  const [paneMode, setPaneMode] = useState<'read' | 'chart' | 'calendar'>('chart');
  const [chartMode, setChartMode] = useState<ChartMode>('today');
  const [positions, setPositions] = useState<SkyPosition[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIndexRef = useRef(0);

  // Rail sign/degree data (SPEC §16 rail-tweaks follow-up) — same RPC and
  // fetch pattern as HomeTodaySkyPanel.tsx. No slug argument: this is
  // today's sky, not tied to any one reading.
  useEffect(() => {
    supabase.rpc('get_current_sky_positions').then(({ data }) => setPositions((data as SkyPosition[]) ?? []));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
              activeIndexRef.current = idx;
            }
          }
        });
      },
      { root: container, threshold: 0.5 }
    );
    sectionRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const pendingScrollIndexRef = useRef<number | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    activeIndexRef.current = index;
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (paneMode !== 'read' || pendingScrollIndexRef.current === null) return;
    const index = pendingScrollIndexRef.current;
    pendingScrollIndexRef.current = null;
    requestAnimationFrame(() => scrollToIndex(index));
  }, [paneMode, scrollToIndex]);

  useEffect(() => {
    const THRESHOLD = 60;
    const POST_JUMP_QUIET_MS = 320;
    let accumulated = 0;
    let blockedUntil = 0;

    const handleWheel = (e: WheelEvent) => {
      if (paneMode !== 'read') return;
      const target = e.target as HTMLElement;
      if (target.closest('.natal-scroll')) return;
      e.preventDefault();
      if (e.deltaY === 0) return;

      const now = performance.now();
      if (now < blockedUntil) {
        blockedUntil = Math.max(blockedUntil, now + POST_JUMP_QUIET_MS);
        accumulated = 0;
        return;
      }

      accumulated += e.deltaY;
      if (Math.abs(accumulated) < THRESHOLD) return;
      const direction = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      const next = activeIndexRef.current + direction;
      if (next < 0 || next >= SKY_BODIES.length) return;
      scrollToIndex(next);
      blockedUntil = now + POST_JUMP_QUIET_MS;
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [scrollToIndex, paneMode]);

  // Rail rows — sign/degree/retrograde now come from get_current_sky_positions
  // (SPEC §16 rail-tweaks follow-up; closes the earlier flagged gap where
  // no live position data reached the browser). No house: transiting
  // bodies have no house.
  const positionsByBody = new Map(positions.map(p => [p.body, p]));
  const rows: RailRow[] = SKY_BODIES.map((body, index) => {
    if (body.id === 'nodes') {
      const north = positionsByBody.get('North Node');
      const south = positionsByBody.get('South Node');
      return {
        id: body.id,
        glyph: SKY_GLYPHS.nodes,
        name: 'North Node',
        degree: north ? `${Math.floor(north.sign_degree)}°` : '',
        signGlyph: north ? RAIL_SIGN_GLYPHS[north.sign] ?? '' : '',
        sign: north?.sign ?? '',
        secondary: {
          glyph: SKY_GLYPHS['nodes-south'],
          name: 'South Node',
          signGlyph: south ? RAIL_SIGN_GLYPHS[south.sign] ?? '' : '',
          sign: south?.sign ?? '',
        },
        active: index === activeIndex,
      };
    }
    const pos = positionsByBody.get(SKY_BODY_NAME[body.id]);
    return {
      id: body.id,
      glyph: SKY_GLYPHS[body.id] ?? '○',
      name: body.name,
      degree: pos ? `${Math.floor(pos.sign_degree)}°` : '',
      retrograde: pos?.retrograde ?? false,
      signGlyph: pos ? RAIL_SIGN_GLYPHS[pos.sign] ?? '' : '',
      sign: pos?.sign ?? '',
      active: index === activeIndex,
    };
  });

  return (
    <div className="app-shell">
      <NavBar slug={slug} active="transits" />
      <div className="app-stage">
        <div className="reading-stage-bg" style={{ backgroundImage: 'url(/transits-background.png)' }} />
        <div
          className="natal-scroll"
          ref={containerRef}
          style={{ display: paneMode === 'read' ? undefined : 'none' }}
        >
          {SKY_BODIES.map((body, index) => (
            <div
              key={body.id}
              className="natal-section"
              data-index={index}
              ref={el => { sectionRefs.current[index] = el; }}
            >
              <div className="natal-zone">
                <div
                  className="section-bg"
                  style={{ backgroundImage: `url(${body.background})`, backgroundPosition: 'center center' }}
                />
                <div className="reading-zone-card">
                  <TransitBodyCardContent body={body} piece={pieces[body.id]} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CHART pane — a screen-state swap, not a scroll target, same
            mechanism as natal's CHART state. Two variants (Today /
            Transiting) both render the stand-in wheel — see
            TransitChartPane.tsx. */}
        {paneMode === 'chart' && (
          <div className="natal-zone">
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <TransitChartPane
                chartData={reading.chart_data}
                birthTimeKnown={reading.birth_time_known}
                slug={slug}
                chartMode={chartMode}
                onChartModeChange={setChartMode}
              />
            </div>
          </div>
        )}

        {/* CALENDAR pane — a screen-state swap, same mechanism as CHART.
            Unlike CHART, it keeps the cream reading-zone-card framing (per
            docs/TEXTURE_LAYOUT_PROPORTIONS.md's "Aspects & Events /
            Calendar panel" section). Real, derived rows as of SPEC §16
            ("Transit Calendar, Part 2") — reads the same `pieces` map READ
            already fetches, no fetch of its own (see TransitCalendarPane.tsx).
            Row click reuses the same pendingScrollIndexRef + setPaneMode('read')
            jump the rail's own row-clicks use below; scrolling to the exact
            entry inside that body's Timeline accordion section isn't wired
            (no per-entry anchor exists yet) — flagged as later work. */}
        {paneMode === 'calendar' && (
          <div className="natal-zone">
            <div className="reading-zone-card">
              <TransitCalendarPane
                pieces={pieces}
                onEntryClick={(bodyId) => {
                  const idx = SKY_BODIES.findIndex(b => b.id === bodyId);
                  if (idx === -1) return;
                  pendingScrollIndexRef.current = idx;
                  setPaneMode('read');
                }}
              />
            </div>
          </div>
        )}

        <div className="reading-rail-slot">
          <Rail
            title="Sky"
            controls={[
              { label: 'READ', active: paneMode === 'read', onClick: () => setPaneMode('read') },
              { label: 'CHART', active: paneMode === 'chart', onClick: () => setPaneMode('chart') },
              ...(SHOW_CALENDAR_RAIL_CONTROL
                ? [{ label: 'CALENDAR', active: paneMode === 'calendar', onClick: () => setPaneMode('calendar') }]
                : []),
            ]}
            rows={rows}
            fillHeight
            onRowClick={(id) => {
              const idx = SKY_BODIES.findIndex(b => b.id === id);
              if (idx === -1) return;
              if (paneMode !== 'read') {
                pendingScrollIndexRef.current = idx;
                setPaneMode('read');
              } else {
                scrollToIndex(idx);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Transits Page ───────────────────────────────────────────────────────

export default function TransitsPage() {
  const slug = DOGFOOD_READING_SLUG;
  const [reading, setReading] = useState<Reading | null>(null);
  const [pieces, setPieces] = useState<Record<string, TransitPieceRow>>({});
  // Desktop shell (>=1024px) vs. today's mobile single-column page — same
  // breakpoint and null-until-measured pattern natal uses to avoid a
  // server/client hydration mismatch.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    async function fetchReading() {
      const { data } = await supabase
        .rpc('get_reading_by_slug', { p_slug: slug })
        .single();
      if (data) setReading(data as Reading);
    }
    fetchReading();
  }, [slug]);

  useEffect(() => {
    async function fetchPieces() {
      const { data } = await supabase
        .rpc('get_transit_pieces_by_slug', { p_reading_slug: slug });
      if (!data) return;
      // Keep only the newest row per body -- prior phase editions are kept
      // in the table (not overwritten), so this can return more than one
      // row per body over time.
      const byBody: Record<string, TransitPieceRow> = {};
      for (const row of data as TransitPieceRow[]) {
        if (!byBody[row.body]) byBody[row.body] = row;
      }
      setPieces(byBody);
    }
    fetchPieces();
  }, [slug]);

  const scrollToSection = useCallback((index: number) => {
    const section = sectionRefs.current[index];
    const container = containerRef.current;
    if (!section || !container) return;
    const top = section.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTo({ top, behavior: 'smooth' });
  }, []);

  if (isDesktop === null || (isDesktop && !reading)) {
    return (
      <div style={{ height: '100dvh', background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-anton)', fontSize: '14px', color: 'var(--red-strong)', letterSpacing: '4px' }}>TEXTURE</span>
      </div>
    );
  }

  if (isDesktop && reading) {
    return (
      <DesktopTransits slug={slug} reading={reading} pieces={pieces} />
    );
  }

  const customerName = reading?.name ?? '';

  return (
    <div className="reading-container" ref={containerRef}>
      <MobileNavShell slug={slug} active="transits" />
      {TRANSIT_BODIES.map((body, index) => (
        <div
          key={body.id}
          className="reading-section"
          ref={el => { sectionRefs.current[index] = el; }}
        >
          <div className="wordmark">TEXTURE</div>
          {index > 0 && (
            <button
              className="next-arrow"
              style={{ bottom: 'auto', top: '0.25%', color: 'rgba(253,245,237,0.50)' }}
              onClick={() => scrollToSection(index - 1)}
            >
              ↑
            </button>
          )}
          <div
            className="section-bg"
            style={{ backgroundImage: `url(${body.background})`, backgroundPosition: 'center center' }}
          />
          <TransitBodyCard body={body} customerName={customerName} piece={pieces[body.id]} />
          {index < TRANSIT_BODIES.length - 1 && (
            <button
              className="next-arrow"
              style={{ color: 'rgba(253,245,237,0.50)' }}
              onClick={() => scrollToSection(index + 1)}
            >
              ↓
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
