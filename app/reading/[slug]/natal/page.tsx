'use client';

import { useEffect, useRef, useState, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllPlanetReferences, type PlacementReferenceResult } from '@/lib/reference-utils';
import ChartSection from '@/app/components/ChartSection';
import NatalChartPane from '@/app/components/NatalChartPane';
import NavBar from '@/app/components/NavBar';
import MobileNavShell from '@/app/components/MobileNavShell';
import Rail, { type RailRow } from '@/app/components/Rail';

// ── Types ──────────────────────────────────────────────────────────────────

type SectionKey = 'overview' | 'reference';

export interface Reading {
  slug: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_location: string;
  birth_lat?: number | null;
  birth_lng?: number | null;
  birth_time_known: boolean;
  sun: string | null;
  moon: string | null;
  mercury: string | null;
  venus: string | null;
  mars: string | null;
  jupiter: string | null;
  saturn: string | null;
  uranus: string | null;
  neptune: string | null;
  pluto: string | null;
  asc_reading: string | null;
  mc: string | null;
  north_node: string | null;
  south_node: string | null;
  // Combined Nodes content (SPEC §4.1). Empty until generated.
  nodes: string | null;
  chart_data: any;
}

export interface PlacementConfig {
  id: string;
  name: string;
  background: string;
  contentKey: keyof Reading;
}

// ── Placement config ──────────────────────────────────────────────────────
// 13 placements (SPEC §4.1: North Node + South Node consolidated into one
// "Nodes" axis piece — was 14). This list is the single shared source of
// truth for BOTH mobile (unchanged single-column layout) and desktop (new
// rail + reading-pane shell) — the nodes merge and the accordion fix below
// are content-structure changes approved for both platforms; only the
// desktop shell itself is a layout change.

export const PLACEMENTS: PlacementConfig[] = [
  { id: 'sun',     name: 'Sun',        background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sun-background.png',     contentKey: 'sun'     },
  { id: 'moon',    name: 'Moon',       background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/moon-background.png',    contentKey: 'moon'    },
  { id: 'mercury', name: 'Mercury',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mercury-background.png', contentKey: 'mercury' },
  { id: 'venus',   name: 'Venus',      background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/venus-background.png',   contentKey: 'venus'   },
  { id: 'mars',    name: 'Mars',       background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mars-background.png',    contentKey: 'mars'    },
  { id: 'jupiter', name: 'Jupiter',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/jupiter-background.png', contentKey: 'jupiter' },
  { id: 'saturn',  name: 'Saturn',     background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/saturn-background.png',  contentKey: 'saturn'  },
  { id: 'uranus',  name: 'Uranus',     background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/uranus-background.png',  contentKey: 'uranus'  },
  { id: 'neptune', name: 'Neptune',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/neptune-background.png', contentKey: 'neptune' },
  { id: 'pluto',   name: 'Pluto',      background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/pluto-background.png',   contentKey: 'pluto'   },
  { id: 'asc',     name: 'Ascendant',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/asc-background.png',     contentKey: 'asc_reading' },
  { id: 'mc',      name: 'Midheaven',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mc-background.png',      contentKey: 'mc'      },
  // Nodes merged per SPEC §4.1 (14 -> 13 placements). Sourced from the
  // `nodes` column (scripts/add_nodes_column.sql, run against Supabase
  // August 2026) — empty until the combined Nodes content is generated.
  { id: 'nodes',   name: 'Nodes',      background: '/nodes-background.png', contentKey: 'nodes' },
];

const PLACEHOLDER_SYNTHESIS = 'This interpretation is being prepared. Check back shortly.';

// ── Section indices (mobile scroll document) ───────────────────────────────
// Natal mobile cleanup (SPEC §16): the scroll used to open on a Cover /
// Birth Data / "Your Texture" intro sequence before the chart, and ended
// on a Reference screen (Reference now has its own route,
// /reading/[slug]/reference). Both are gone — the mobile scroll now starts
// directly on the chart and ends on the last placement card.
// 0: Chart
// 1-13: Placements (13 total)

const CHART_INDEX = 0;
const PLANET_START = 1;

const PLANET_TO_INDEX: Record<string, number> = {
  sun: 1, moon: 2, mercury: 3, venus: 4, mars: 5,
  jupiter: 6, saturn: 7, uranus: 8, neptune: 9, pluto: 10,
  ascendant: 11, medium_coeli: 12, mean_north_lunar_node: 13,
};

// ── Helper: get placement meta from chart_data ─────────────────────────────

const PLANET_KEY_MAP: Record<string, string> = {
  sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus',
  mars: 'mars', jupiter: 'jupiter', saturn: 'saturn', uranus: 'uranus',
  neptune: 'neptune', pluto: 'pluto', asc: 'ascendant', mc: 'medium_coeli',
  // The merged Nodes section's own meta line (card header) still shows the
  // North Node's own sign/house/degree only, not a combined-axis line —
  // that simplification is unchanged and still flagged for founder review.
  // The desktop RAIL row is no longer part of that simplification: it now
  // shows both ends (see the 'nodes-south' entry below and the `secondary`
  // row built in DesktopNatal's `rows`, SPEC §16).
  nodes: 'mean_north_lunar_node',
  'nodes-south': 'mean_south_lunar_node',
};

export const SIGN_ABBR_MAP: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

export const HOUSE_ORDINALS: Record<string, string> = {
  First_House: '1st House', Second_House: '2nd House', Third_House: '3rd House',
  Fourth_House: '4th House', Fifth_House: '5th House', Sixth_House: '6th House',
  Seventh_House: '7th House', Eighth_House: '8th House', Ninth_House: '9th House',
  Tenth_House: '10th House', Eleventh_House: '11th House', Twelfth_House: '12th House',
};

export function getPlanetMeta(chartData: any, planetId: string): { sign: string; house: string; degree: string; retrograde: boolean } {
  if (!chartData?.subject) return { sign: '', house: '', degree: '', retrograde: false };
  const key = PLANET_KEY_MAP[planetId];
  if (!key) return { sign: '', house: '', degree: '', retrograde: false };
  const planet = chartData.subject[key];
  if (!planet) return { sign: '', house: '', degree: '', retrograde: false };
  const sign = SIGN_ABBR_MAP[planet.sign] ?? planet.sign ?? '';
  const house = ['ascendant', 'medium_coeli'].includes(key) ? '' : (HOUSE_ORDINALS[planet.house] ?? '');
  const degree = planet.position != null ? `${Math.floor(planet.position)}°` : '';
  return { sign, house, degree, retrograde: planet.retrograde ?? false };
}

// Reference data is still fetched per individual point (SPEC §4.1: "the
// reference dictionary keeps both nodes individually defined — the reading
// merges, the vocabulary does not"), so the merged Nodes placement needs
// both 'north-node' and 'south-node' results; every other placement maps
// straight through.
function getReferenceProps(placement: PlacementConfig, referenceData: Record<string, PlacementReferenceResult>) {
  if (placement.id === 'nodes') {
    return { referenceData: referenceData['north-node'], referenceDataSecondary: referenceData['south-node'] };
  }
  return { referenceData: referenceData[placement.id], referenceDataSecondary: undefined as PlacementReferenceResult | undefined };
}

// Desktop rail glyphs (mirrors ChartSection.tsx's mobile glyph maps, keyed
// to PLACEMENTS' short ids rather than chart_data field names).
export const RAIL_PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  asc: '↑', mc: '↑', nodes: '☊', 'nodes-south': '☋',
};

export const RAIL_SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈︎', Taurus: '♉︎', Gemini: '♊︎', Cancer: '♋︎',
  Leo: '♌︎', Virgo: '♍︎', Libra: '♎︎', Scorpio: '♏︎',
  Sagittarius: '♐︎', Capricorn: '♑︎', Aquarius: '♒︎', Pisces: '♓︎',
};

// ── Reference accordion body (shared by Overview/Reference toggle) ─────────

function ReferenceBlock({ data, label }: { data: PlacementReferenceResult; label?: string }) {
  const grouped: Array<{ instances: string[]; entry: PlacementReferenceResult['aspects'][0]['entry'] }> = [];
  data.aspects.forEach(a => {
    if (a.showDescription) {
      grouped.push({ instances: [a.instance], entry: a.entry });
    } else {
      grouped[grouped.length - 1]?.instances.push(a.instance);
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {label && (
        <div style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(15px, 4vw, 18px)',
          color: 'var(--dark)',
          letterSpacing: '0.5px',
        }}>
          {label}
        </div>
      )}
      {[data.planet, data.sign, data.house, data.motion, data.degree].filter(Boolean).map((entry, i) => entry && (
        <div key={i}>
          <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 11px)', color: 'rgba(22,22,18,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
            {entry.category === 'motion' ? `${entry.name} MOTION` : entry.category === 'degree' ? `${entry.name} DEGREE` : entry.name}
          </div>
          <p className="body-text" style={{ color: 'rgba(22,22,18,0.70)', fontSize: 'clamp(13px, 3.6vw, 15px)' }}>{entry.description}</p>
        </div>
      ))}
      {grouped.map((group, i) => (
        <div key={`aspect-group-${i}`}>
          {group.instances.map((inst, j) => (
            <div key={j} style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 11px)', color: 'rgba(22,22,18,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
              {inst}
            </div>
          ))}
          <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 11px)', color: 'rgba(22,22,18,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px', marginTop: '2px' }}>
            {group.entry.name}
          </div>
          <p className="body-text" style={{ color: 'rgba(22,22,18,0.70)', fontSize: 'clamp(13px, 3.6vw, 15px)' }}>{group.entry.description}</p>
        </div>
      ))}
    </div>
  );
}

// ── Placement card content (header + accordion + footer) ───────────────────
// Shared by mobile (.card-inner wrapper) and desktop (.reading-pane-section
// wrapper) — both wrappers already supply the same flex-column box, so this
// renders just the three inner pieces. Accordion behavior (corrected per
// founder instruction): Overview and Reference are both always
// present/anchored, mutually exclusive, Overview expanded by default, and
// whichever is expanded gets its OWN contained scroll (.section-body in
// globals.css), not a scroll of the whole card.

function PlacementCardContent({
  planet,
  reading,
  customerName,
  referenceData,
  referenceDataSecondary,
}: {
  planet: PlacementConfig;
  reading: Reading | null;
  customerName: string;
  referenceData?: PlacementReferenceResult;
  referenceDataSecondary?: PlacementReferenceResult;
}) {
  const [openSection, setOpenSection] = useState<SectionKey>('overview');

  const meta = reading ? getPlanetMeta(reading.chart_data, planet.id) : { sign: '', house: '', degree: '', retrograde: false };
  const synthesisText = reading ? (reading[planet.contentKey] as string | null) : null;
  const metaParts = [meta.sign, meta.house, meta.degree, meta.retrograde ? 'Retrograde' : null].filter(Boolean);
  const metaString = metaParts.join(' · ');

  return (
    <>
      <div className="card-header">
        <h1 className="planet-name">{planet.name}</h1>
        {metaString ? <p className="planet-meta">{metaString}</p> : null}
        <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '0' }} />
      </div>

      <div className="card-content">
        <div className="section-row" onClick={() => setOpenSection('overview')}>
          <span className="section-row-label">Overview</span>
          <span className="section-row-chevron">{openSection === 'overview' ? '−' : '+'}</span>
        </div>

        {openSection === 'overview' && (
          <div className="section-body">
            <p className="body-text">{synthesisText ?? PLACEHOLDER_SYNTHESIS}</p>
          </div>
        )}

        <div className="section-divider" />

        <div className="section-row" onClick={() => setOpenSection('reference')}>
          <span className="section-row-label">Reference</span>
          <span className="section-row-chevron">{openSection === 'reference' ? '−' : '+'}</span>
        </div>

        {openSection === 'reference' && (
          <div className="section-body">
            {planet.id === 'nodes' ? (
              (!referenceData || !referenceDataSecondary) ? (
                <p className="placeholder-text">Loading...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <ReferenceBlock data={referenceData} label="North Node" />
                  <ReferenceBlock data={referenceDataSecondary} label="South Node" />
                </div>
              )
            ) : (
              !referenceData ? <p className="placeholder-text">Loading...</p> : <ReferenceBlock data={referenceData} />
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        <span className="card-name">{customerName}</span>
      </div>
    </>
  );
}

function PlacementCard(props: Parameters<typeof PlacementCardContent>[0]) {
  return (
    <>
      <div className="card-outer" />
      <div className="card-inner">
        <PlacementCardContent {...props} />
      </div>
    </>
  );
}

// ── Desktop shell (>=1024px) ────────────────────────────────────────────────
// Re-houses the reading pane + rail per docs/TEXTURE_LAYOUT_PROPORTIONS.md
// ("DESKTOP — READING PAGE" / "THE LIST RAIL") and docs/mocks/natal-page.png.
// Per founder ruling, the Cover/Birth Data/Intro splash screens do not
// appear on desktop — the pane opens directly on the rail + first
// placement, matching the mock. The Chart toggle control (READ | CHART) is
// wired to a real screen-state swap — see `paneMode` below and
// NatalChartPane — as of SPEC §16, Phase 3A follow-up (Aug 5 2026).

// Round 7 rewrite (Aug 5 2026), per founder direction: treat this like a
// static frame (nav + rail) with a "hole" the reading pane shows through,
// and ONE real full-page native scroll underneath — the same model
// mobile's natal page already uses successfully — rather than a small
// scroll region plus custom JS trying to detect and redirect "outside
// card" wheel input. Rounds 2-6 kept narrowing failure windows because
// that approach was fundamentally fighting the browser's own scroll
// handling; this removes the fight instead of refereeing it. See the
// long comment on `.natal-scroll` in globals.css for the full mechanics.
function DesktopNatal({
  slug,
  reading,
  customerName,
  referenceData,
  initialOpenId,
}: {
  slug: string;
  reading: Reading;
  customerName: string;
  referenceData: Record<string, PlacementReferenceResult>;
  // Deep link (SPEC §16, post-purchase home build): the My Chart panel's
  // "Read" button and row carets land here with `?open=<placementId>` —
  // scroll straight to that placement's section once, on arrival, reusing
  // the same scrollToIndex() rail-row clicks already use.
  initialOpenId?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  // READ | CHART pane state (SPEC §16, Phase 3A follow-up): a screen-state
  // swap of the reading pane's content, not a scroll target. `.natal-scroll`
  // stays mounted at all times (see the `display` toggle below) so its
  // scroll position survives switching back to READ with no extra logic.
  const [paneMode, setPaneMode] = useState<'read' | 'chart'>('read');
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Mirrors activeIndex but updated synchronously (not on React's render
  // schedule) — read by the rail-forwarding handler below so a fast
  // rail-hover gesture always computes "next" from the true current
  // index, never a stale one.
  const activeIndexRef = useRef(0);

  // Drives the rail's active-row highlight, and is the source of truth
  // for the rail-forwarding handler below.
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

  // Holds a placement index a rail-row click wants to jump to once
  // .natal-scroll is visible again. Needed because switching paneMode back
  // to 'read' (which removes `display: none`) doesn't take effect in the
  // DOM until after this render commits — calling scrollIntoView on an
  // element that's still inside a display:none ancestor is a silent no-op,
  // so the scroll can't happen in the same synchronous click handler that
  // requests the mode switch.
  const pendingScrollIndexRef = useRef<number | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    activeIndexRef.current = index;
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Flushes a scroll requested while the CHART pane was showing, once
  // .natal-scroll's `display: none` has actually been lifted (see
  // pendingScrollIndexRef above).
  useEffect(() => {
    if (paneMode !== 'read' || pendingScrollIndexRef.current === null) return;
    const index = pendingScrollIndexRef.current;
    pendingScrollIndexRef.current = null;
    requestAnimationFrame(() => scrollToIndex(index));
  }, [paneMode, scrollToIndex]);

  // `?open=<placementId>` deep link (see initialOpenId above) — applied once
  // on arrival, guarded so it never re-fires (e.g. after a later rail click
  // changes activeIndex, this must not snap the user back).
  const appliedInitialOpenRef = useRef(false);
  useEffect(() => {
    if (appliedInitialOpenRef.current || !initialOpenId) return;
    const idx = PLACEMENTS.findIndex(p => p.id === initialOpenId);
    if (idx === -1) return;
    appliedInitialOpenRef.current = true;
    requestAnimationFrame(() => scrollToIndex(idx));
  }, [initialOpenId, scrollToIndex]);

  // The ONLY custom scroll JS left: the rail (and nav bar) are a
  // separate, non-scrolling overlay — genuinely nothing native to scroll
  // there on their own. Scrolling over the card OR the background margin
  // needs NO handling here — both are inside .natal-scroll, so the
  // browser does 100% of that natively, with no JS in the way to race
  // against (this is the whole point of the round 7 redesign).
  //
  // First attempt at the rail forwarding just piped raw e.deltaY into
  // container.scrollBy() per event — wrong: over a real multi-event
  // gesture the forwarded total can run well past one section's height
  // with nothing to stop it (confirmed: one test gesture forwarded
  // straight through to the last section). Fixed by NOT forwarding raw
  // pixels at all — instead accumulate + require a threshold (a little
  // resistance) then move exactly one section via scrollToIndex
  // (native scroll-snap handles the actual motion), the same "quiet
  // period that re-arms on every event" lock from round 5 (proven
  // correct against real momentum tails) so a gesture can't trigger more
  // than one jump.
  useEffect(() => {
    const THRESHOLD = 60;
    const POST_JUMP_QUIET_MS = 320;
    let accumulated = 0;
    let blockedUntil = 0;

    const handleWheel = (e: WheelEvent) => {
      // The CHART pane is a static frame with nothing to scroll to — don't
      // let wheel input over it silently drive the hidden READ scroll.
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
      if (next < 0 || next >= PLACEMENTS.length) return;
      scrollToIndex(next);
      blockedUntil = now + POST_JUMP_QUIET_MS;
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [scrollToIndex, paneMode]);

  const rows: RailRow[] = PLACEMENTS.map((placement, index) => {
    const meta = getPlanetMeta(reading.chart_data, placement.id);
    // Nodes row (SPEC §4.1, §16): NO retrograde flag, and both axis ends
    // shown side by side via `secondary` rather than the North Node's own
    // placement standing in for the whole axis. House is shortened to just
    // the ordinal ("9th", not "9th House") — the full word was pushing the
    // two-ended line onto a third line (founder feedback).
    if (placement.id === 'nodes') {
      const southMeta = getPlanetMeta(reading.chart_data, 'nodes-south');
      const shortHouse = (h: string) => h.replace(/ House$/, '') || undefined;
      return {
        id: placement.id,
        glyph: RAIL_PLANET_GLYPHS.nodes,
        name: 'North Node',
        degree: meta.degree,
        signGlyph: RAIL_SIGN_GLYPHS[meta.sign] ?? '',
        sign: meta.sign,
        house: shortHouse(meta.house),
        secondary: {
          glyph: RAIL_PLANET_GLYPHS['nodes-south'],
          name: 'South Node',
          signGlyph: RAIL_SIGN_GLYPHS[southMeta.sign] ?? '',
          sign: southMeta.sign,
          house: shortHouse(southMeta.house),
        },
        active: index === activeIndex,
      };
    }
    // Midheaven's rail row shows its house (founder feedback) even though
    // getPlanetMeta blanks house for both angles (ascendant/medium_coeli) —
    // that exclusion still applies to Ascendant and to MC's own card-header
    // meta line, unchanged; this looks the house up directly for the rail
    // row only.
    if (placement.id === 'mc') {
      const rawHouse = reading.chart_data?.subject?.medium_coeli?.house;
      return {
        id: placement.id,
        glyph: RAIL_PLANET_GLYPHS.mc,
        name: placement.name,
        degree: meta.degree,
        retrograde: meta.retrograde,
        signGlyph: RAIL_SIGN_GLYPHS[meta.sign] ?? '',
        sign: meta.sign,
        house: HOUSE_ORDINALS[rawHouse] ?? undefined,
        active: index === activeIndex,
      };
    }
    return {
      id: placement.id,
      glyph: RAIL_PLANET_GLYPHS[placement.id] ?? '○',
      name: placement.name,
      degree: meta.degree,
      retrograde: meta.retrograde,
      signGlyph: RAIL_SIGN_GLYPHS[meta.sign] ?? '',
      sign: meta.sign,
      house: meta.house || undefined,
      active: index === activeIndex,
    };
  });

  return (
    <div className="app-shell">
      <NavBar slug={slug} active="natal" />
      <div className="app-stage">
        <div className="reading-stage-bg" style={{ backgroundImage: 'url(/sky-background.png)' }} />
        <div
          className="natal-scroll"
          ref={containerRef}
          style={{ display: paneMode === 'read' ? undefined : 'none' }}
        >
          {PLACEMENTS.map((placement, index) => {
            const refProps = getReferenceProps(placement, referenceData);
            return (
              <div
                key={placement.id}
                className="natal-section"
                data-index={index}
                ref={el => { sectionRefs.current[index] = el; }}
              >
                <div className="natal-zone">
                  {/* Each section carries its own background, mirroring
                      mobile's .reading-section — it scrolls together
                      with its card as one unit instead of being swapped
                      by React state, per founder feedback (round 2). */}
                  <div
                    className="section-bg"
                    style={{
                      backgroundImage: `url(${placement.background})`,
                      backgroundPosition: placement.id === 'mc' ? 'center top' : 'center center',
                    }}
                  />
                  <div className="reading-zone-card">
                    <PlacementCardContent
                      planet={placement}
                      reading={reading}
                      customerName={customerName}
                      referenceData={refProps.referenceData}
                      referenceDataSecondary={refProps.referenceDataSecondary}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* CHART pane — a screen-state swap of the reading pane's content,
            not a scroll target (SPEC §16, Phase 3A follow-up). Occupies the
            same .natal-zone geometry every placement section already uses,
            so the frame never moves; only rendered in 'chart' mode (unlike
            .natal-scroll above, which stays mounted always and is hidden
            via `display` instead — this pane has no scroll position to
            preserve, so it's fine to mount only when active).

            Fills the FULL .natal-zone block — the same size as any
            placement's .section-bg image — not the smaller inset
            .reading-zone-card cream rectangle every other state uses
            (founder correction: the wheel needed the whole block's room,
            not just the cream card's, to read at a reasonable size). */}
        {paneMode === 'chart' && (
          <div className="natal-zone">
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <NatalChartPane
                chartData={reading.chart_data}
                birthTimeKnown={reading.birth_time_known}
                name={customerName}
                birthDate={reading.birth_date}
                birthTime={reading.birth_time}
                birthLocation={reading.birth_location}
                slug={slug}
              />
            </div>
          </div>
        )}
        {/* Rendered AFTER .natal-scroll in DOM order so it naturally
            stacks on top (no z-index needed) — the true "static frame"
            with the reading pane as the hole the scroll shows through. */}
        <div className="reading-rail-slot">
          <Rail
            title="Planets"
            controls={[
              { label: 'READ', active: paneMode === 'read', onClick: () => setPaneMode('read') },
              { label: 'CHART', active: paneMode === 'chart', onClick: () => setPaneMode('chart') },
            ]}
            rows={rows}
            fillHeight
            onRowClick={(id) => {
              // Rail always means "go to this placement" — clicking a row
              // while CHART is showing switches back to READ first (per
              // founder confirmation), then scrolls as usual. The scroll
              // itself is deferred (pendingScrollIndexRef) until READ's
              // `display: none` is actually lifted — see the effect above.
              const idx = PLACEMENTS.findIndex(p => p.id === id);
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

// ── Main Reading Page ──────────────────────────────────────────────────────

export default function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  // `?open=<placementId>` deep link (SPEC §16, post-purchase home build) —
  // this repo's established pattern for search params (see app/success/page.tsx)
  // is a Promise prop unwrapped with use(), not the useSearchParams() hook.
  searchParams: Promise<{ open?: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const openId = use(searchParams).open;
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [referenceData, setReferenceData] = useState<Record<string, PlacementReferenceResult>>({});
  const [jumpToList, setJumpToList] = useState(false);
  // Desktop shell (>=1024px) vs. today's mobile single-column page — the
  // layout doc's breakpoint. null = not yet measured (avoids a
  // server/client hydration mismatch); resolved synchronously on mount,
  // before the async reading fetch below typically finishes.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    async function fetchReading() {
      const { data, error } = await supabase
        .rpc('get_reading_by_slug', { p_slug: slug })
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setReading(data as Reading);
      }
      setLoading(false);
    }
    fetchReading();
  }, [slug]);

  useEffect(() => {
    if (!reading?.chart_data) return;
    const planetIds = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','asc','mc','north-node','south-node'];
    fetchAllPlanetReferences(planetIds, reading.chart_data, reading.birth_time_known ?? true)
      .then(setReferenceData);
  }, [reading]);

  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((index: number) => {
    const section = sectionRefs.current[index];
    const container = containerRef.current;
    if (!section || !container) return;
    const top = section.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const scrollToNext = useCallback((currentIndex: number) => {
    scrollToSection(currentIndex + 1);
  }, [scrollToSection]);

  // `?open=<placementId>` deep link, mobile path — applied once, mirroring
  // DesktopNatal's own appliedInitialOpenRef guard above.
  const appliedMobileOpenRef = useRef(false);
  useEffect(() => {
    if (appliedMobileOpenRef.current || isDesktop !== false || !reading || !openId) return;
    const idx = PLACEMENTS.findIndex(p => p.id === openId);
    if (idx === -1) return;
    appliedMobileOpenRef.current = true;
    requestAnimationFrame(() => scrollToSection(PLANET_START + idx));
  }, [isDesktop, reading, openId, scrollToSection]);

  if (loading || isDesktop === null) {
    return (
      <div style={{ height: '100dvh', background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-anton)', fontSize: '14px', color: 'var(--red-strong)', letterSpacing: '4px' }}>TEXTURE</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ height: '100dvh', background: 'var(--indigo)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <span style={{ fontFamily: 'var(--font-anton)', fontSize: '14px', color: 'var(--red-strong)', letterSpacing: '4px' }}>TEXTURE</span>
        <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '12px', color: 'rgba(253,245,237,0.30)', letterSpacing: '2px' }}>READING NOT FOUND</span>
      </div>
    );
  }

  const customerName = reading?.name ?? '';
  const birthDate    = reading?.birth_date ?? '';
  const birthTime    = reading?.birth_time ?? '';
  const birthLocation = reading?.birth_location ?? '';

  if (isDesktop && reading) {
    return (
      <DesktopNatal
        slug={slug}
        reading={reading}
        customerName={customerName}
        referenceData={referenceData}
        initialOpenId={openId}
      />
    );
  }

  return (
    <div className="reading-container" ref={containerRef}>
      <MobileNavShell slug={slug} active="natal" />

      {/* ── 0. CHART ── */}
      <div
        className="reading-section"
        style={{ background: '#0e0c1a' }}
        ref={el => { sectionRefs.current[CHART_INDEX] = el; }}
      >
        <ChartSection
          chartData={reading?.chart_data}
          customerName={customerName}
          birthDate={birthDate}
          birthTime={birthTime}
          birthLocation={birthLocation}
          activeViewOverride={jumpToList ? 'list' : undefined}
          onScrollToPlanet={(planetId) => {
            const index = PLANET_TO_INDEX[planetId];
            if (index !== undefined) scrollToSection(index);
          }}
          onScrollNext={() => scrollToNext(CHART_INDEX)}
        />
      </div>

      {/* ── 1–13. PLACEMENT SECTIONS ── */}
      {PLACEMENTS.map((planet, index) => {
        const refProps = getReferenceProps(planet, referenceData);
        return (
          <div
            key={planet.id}
            className="reading-section"
            ref={el => { sectionRefs.current[PLANET_START + index] = el; }}
          >
            <button className="next-arrow" style={{ bottom: 'auto', top: '0.25%', color: 'rgba(253,245,237,0.50)' }} onClick={() => scrollToSection(PLANET_START + index - 1)}>↑</button>
            <div
              className="section-bg"
              style={{
                backgroundImage: `url(${planet.background})`,
                backgroundPosition: (() => {
                  if (planet.id === 'asc') return 'center center';
                  if (planet.id === 'mc') return 'center top';
                  return 'center center';
                })(),
              }}
            />
            <PlacementCard
              planet={planet}
              reading={reading}
              customerName={customerName}
              referenceData={refProps.referenceData}
              referenceDataSecondary={refProps.referenceDataSecondary}
            />
            {/* No down-arrow on the last placement (Nodes) — the scroll
                document now ends here (Reference moved to its own route,
                SPEC §16), so there's nothing below to scroll to. */}
            {index < PLACEMENTS.length - 1 && (
              <button className="next-arrow" style={{ color: planet.id === 'mc' ? 'rgba(22,22,18,0.35)' : 'rgba(253,245,237,0.50)' }} onClick={() => scrollToNext(PLANET_START + index)}>↓</button>
            )}
          </div>
        );
      })}

    </div>
  );
}
