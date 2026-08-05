'use client';

import { useEffect, useRef, useState, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllPlanetReferences, type PlacementReferenceResult } from '@/lib/reference-utils';
import ReferencePage from '@/app/components/ReferencePage';
import CoverSection from '@/app/components/CoverSection';
import BirthDataSection from '@/app/components/BirthDataSection';
import ChartSection from '@/app/components/ChartSection';
import ReadingLayout from '@/app/components/ReadingLayout';
import Rail, { type RailRow } from '@/app/components/Rail';

// ── Types ──────────────────────────────────────────────────────────────────

type SectionKey = 'overview' | 'reference';

interface Reading {
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

interface PlacementConfig {
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

const PLACEMENTS: PlacementConfig[] = [
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
// 0: Cover
// 1: Birth Data
// 2: Intro
// 3: Chart
// 4-16: Placements (13 total)
// 17: Reference

const CHART_INDEX = 3;
const PLANET_START = 4;

const PLANET_TO_INDEX: Record<string, number> = {
  sun: 4, moon: 5, mercury: 6, venus: 7, mars: 8,
  jupiter: 9, saturn: 10, uranus: 11, neptune: 12, pluto: 13,
  ascendant: 14, medium_coeli: 15, mean_north_lunar_node: 16,
};

// ── Helper: get placement meta from chart_data ─────────────────────────────

const PLANET_KEY_MAP: Record<string, string> = {
  sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus',
  mars: 'mars', jupiter: 'jupiter', saturn: 'saturn', uranus: 'uranus',
  neptune: 'neptune', pluto: 'pluto', asc: 'ascendant', mc: 'medium_coeli',
  // Standing simplification (flagged for founder review, independent of
  // the content-column wiring above): the merged Nodes section's meta
  // line and rail row show the North Node's own sign/house/degree only,
  // not a combined-axis line. SPEC §4.1 treats the axis as one subject;
  // this UI still owes a real combined-meta treatment.
  nodes: 'mean_north_lunar_node',
};

const SIGN_ABBR_MAP: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

const HOUSE_ORDINALS: Record<string, string> = {
  First_House: '1st House', Second_House: '2nd House', Third_House: '3rd House',
  Fourth_House: '4th House', Fifth_House: '5th House', Sixth_House: '6th House',
  Seventh_House: '7th House', Eighth_House: '8th House', Ninth_House: '9th House',
  Tenth_House: '10th House', Eleventh_House: '11th House', Twelfth_House: '12th House',
};

function getPlanetMeta(chartData: any, planetId: string): { sign: string; house: string; degree: string; retrograde: boolean } {
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
const RAIL_PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  asc: '↑', mc: '↑', nodes: '☊',
};

const RAIL_SIGN_GLYPHS: Record<string, string> = {
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
// placement, matching the mock. The Chart toggle control is shown (the doc
// requires the full List/Chart set to always display) but is not wired to
// a working chart view this pass — the chart wheel itself is a separate,
// not-yet-built piece (SPEC §16, "chart wheel is Phase 3, not built").

function DesktopNatal({
  slug,
  reading,
  customerName,
  referenceData,
}: {
  slug: string;
  reading: Reading;
  customerName: string;
  referenceData: Record<string, PlacementReferenceResult>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.5 }
    );
    sectionRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const rows: RailRow[] = PLACEMENTS.map((placement, index) => {
    const meta = getPlanetMeta(reading.chart_data, placement.id);
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
    <ReadingLayout
      slug={slug}
      active="natal"
      background="/sky-background.png"
      zoneBackground={PLACEMENTS[activeIndex]?.background}
      rail={
        <Rail
          title="Planets"
          controls={[{ label: 'READ >', active: true }, { label: 'CHART >', active: false }]}
          rows={rows}
          onRowClick={(id) => {
            const idx = PLACEMENTS.findIndex(p => p.id === id);
            if (idx !== -1) scrollToIndex(idx);
          }}
        />
      }
    >
      <div className="reading-pane-scroll" ref={containerRef}>
        {PLACEMENTS.map((placement, index) => {
          const refProps = getReferenceProps(placement, referenceData);
          return (
            <div
              key={placement.id}
              className="reading-pane-section"
              data-index={index}
              ref={el => { sectionRefs.current[index] = el; }}
            >
              <PlacementCardContent
                planet={placement}
                reading={reading}
                customerName={customerName}
                referenceData={refProps.referenceData}
                referenceDataSecondary={refProps.referenceDataSecondary}
              />
            </div>
          );
        })}
      </div>
    </ReadingLayout>
  );
}

// ── Main Reading Page ──────────────────────────────────────────────────────

export default function ReadingPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
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
      />
    );
  }

  return (
    <div className="reading-container" ref={containerRef}>

      {/* ── 0. COVER ── */}
      <div className="reading-section" ref={el => { sectionRefs.current[0] = el; }}>
        <CoverSection customerName={customerName} onScrollNext={() => scrollToNext(0)} />
      </div>

      {/* ── 1. BIRTH DATA ── */}
      <div className="reading-section" ref={el => { sectionRefs.current[1] = el; }}>
        <BirthDataSection
          name={customerName}
          birthDate={birthDate}
          birthTime={birthTime}
          birthLocation={birthLocation}
          birthLat={reading?.birth_lat}
          birthLng={reading?.birth_lng}
          onScrollNext={() => scrollToNext(1)}
        />
      </div>

      {/* ── 2. INTRO ── */}
      <div
        className="reading-section"
        style={{ background: 'var(--cream)' }}
        ref={el => { sectionRefs.current[2] = el; }}
      >
        <div className="wordmark" style={{ color: 'var(--red-strong)' }}>TEXTURE</div>
        <div className="intro-card">
          <div className="card-header">
            <h2 className="planet-name" style={{ fontSize: 'clamp(24px, 6vw, 36px)' }}>Your Texture</h2>
            <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '4px' }} />
          </div>
          <div className="intro-content">
            <p className="body-text">
              A chart is a woven system. Your placements are the threads, but how they interact creates the texture. This reading reflects that nuance — sign, house, degree, aspects, and motion are all considered, so your placements are read in context, not isolation.
            </p>
            <p className="body-text">
              Astrology describes patterns. It does not dictate them. Nothing here is a verdict about who you are or what will happen — it&apos;s a description of tendencies, qualities, and the ways energy characteristically moves in your chart. What you recognize, what you set aside, and what you do with any of it is entirely yours. The most useful way to read this is as a mirror, not a map of a fixed destination.
            </p>
            <p className="body-text">
              What follows is your whole chart. First the wheel and a list of your placements — tap any one to go straight to it. Tap TEXTURE in the top left corner at any point to jump back to the planet list. Then a section for each of your thirteen placements, where the full detail of that part of your chart is interpreted in context. At the end, a reference section defines every term used along the way, so nothing here requires prior knowledge to follow.
            </p>
            <div style={{
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: '0.5px solid rgba(22,22,18,0.10)',
            }}>
              <p style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 'clamp(10px, 2.6vw, 12px)',
                color: 'rgba(22,22,18,0.35)',
                lineHeight: '1.7',
                letterSpacing: '0.2px',
              }}>
                A note on method: astrology is a tradition thousands of years in the making. The interpretations here were generated by a language model trained on that body of knowledge and directed at the specific configuration of your chart, calculated using the Whole Sign house system.
              </p>
            </div>
          </div>
        </div>
        <button className="next-arrow" style={{ color: 'rgba(22,22,18,0.35)' }} onClick={() => scrollToNext(2)}>↓</button>
      </div>

      {/* ── 3. CHART ── */}
      <div
        className="reading-section"
        style={{ background: '#0e0c1a' }}
        ref={el => { sectionRefs.current[CHART_INDEX] = el; }}
      >
        <ChartSection
          chartData={reading?.chart_data}
          customerName={customerName}
          activeViewOverride={jumpToList ? 'list' : undefined}
          onScrollToPlanet={(planetId) => {
            const index = PLANET_TO_INDEX[planetId];
            if (index !== undefined) scrollToSection(index);
          }}
          onScrollNext={() => scrollToNext(CHART_INDEX)}
        />
      </div>

      {/* ── 4–16. PLACEMENT SECTIONS ── */}
      {PLACEMENTS.map((planet, index) => {
        const refProps = getReferenceProps(planet, referenceData);
        return (
          <div
            key={planet.id}
            className="reading-section"
            ref={el => { sectionRefs.current[PLANET_START + index] = el; }}
          >
            <div
              className="wordmark"
              style={{ cursor: 'pointer' }}
              onClick={() => { setJumpToList(true); scrollToSection(CHART_INDEX); setTimeout(() => setJumpToList(false), 500); }}
            >
              TEXTURE
            </div>
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
            <button className="next-arrow" style={{ color: planet.id === 'mc' ? 'rgba(22,22,18,0.35)' : 'rgba(253,245,237,0.50)' }} onClick={() => scrollToNext(PLANET_START + index)}>↓</button>
          </div>
        );
      })}

      {/* ── 17. REFERENCE ── */}
      <div
        className="reading-section"
        style={{ background: 'var(--cream)' }}
        ref={el => { sectionRefs.current[PLANET_START + PLACEMENTS.length] = el; }}
      >
        <div className="wordmark" style={{ color: 'var(--red-strong)', cursor: 'pointer' }} onClick={() => { setJumpToList(true); scrollToSection(CHART_INDEX); setTimeout(() => setJumpToList(false), 500); }}>TEXTURE</div>
        <button className="next-arrow" style={{ bottom: 'auto', top: '0.25%', color: 'rgba(22,22,18,0.35)' }} onClick={() => scrollToSection(PLANET_START + PLACEMENTS.length - 1)}>↑</button>
        <div className="card-inner" style={{ borderBottom: '1.5px solid rgba(185,18,18,0.50)' }}>
          <ReferencePage />
        </div>
      </div>

    </div>
  );
}
