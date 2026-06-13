'use client';

import { useEffect, useRef, useState, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

type SectionKey = 'synthesis' | 'reference';

interface Reading {
  slug: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_location: string;
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
  chart_data: any;
}

interface PlanetConfig {
  id: string;
  name: string;
  background: string;
  contentKey: keyof Reading;
}

// ── Planet config ──────────────────────────────────────────────────────────

const PLANETS: PlanetConfig[] = [
  { id: 'sun',        name: 'Sun',        background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sun-background.png',        contentKey: 'sun'        },
  { id: 'moon',       name: 'Moon',       background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/moon-background.png',       contentKey: 'moon'       },
  { id: 'mercury',    name: 'Mercury',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mercury-background.png',    contentKey: 'mercury'    },
  { id: 'venus',      name: 'Venus',      background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/venus-background.png',      contentKey: 'venus'      },
  { id: 'mars',       name: 'Mars',       background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mars-background.png',       contentKey: 'mars'       },
  { id: 'jupiter',    name: 'Jupiter',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/jupiter-background.png',    contentKey: 'jupiter'    },
  { id: 'saturn',     name: 'Saturn',     background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/saturn-background.png',     contentKey: 'saturn'     },
  { id: 'uranus',     name: 'Uranus',     background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/uranus-background.png',     contentKey: 'uranus'     },
  { id: 'neptune',    name: 'Neptune',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/neptune-background.png',    contentKey: 'neptune'    },
  { id: 'pluto',      name: 'Pluto',      background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/pluto-background.png',      contentKey: 'pluto'      },
  { id: 'asc',        name: 'Ascendant',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/asc-background.png',        contentKey: 'asc_reading'},
  { id: 'mc',         name: 'Midheaven',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mc-background.png',         contentKey: 'mc'         },
  { id: 'north-node', name: 'North Node', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/north-node-background.png', contentKey: 'north_node' },
  { id: 'south-node', name: 'South Node', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/south-node-background.png', contentKey: 'south_node' },
];

const PLACEHOLDER_SYNTHESIS = 'Interpretation loading...';
const PLACEHOLDER_REFERENCE = 'Reference content loading...';

// ── Helper: get planet meta from chart_data ────────────────────────────────

function getPlanetMeta(chartData: any, planetId: string): { sign: string; house: string; degree: string; retrograde: boolean } {
  if (!chartData?.planets) return { sign: '', house: '', degree: '', retrograde: false };
  const planet = chartData.planets.find((p: any) => p.id === planetId);
  if (!planet) return { sign: '', house: '', degree: '', retrograde: false };
  return {
    sign: planet.sign ?? '',
    house: planet.house ? `${planet.house}th House` : '',
    degree: planet.degree ? `${Math.floor(planet.degree)}°` : '',
    retrograde: planet.retrograde ?? false,
  };
}

// ── Planet Card Component ──────────────────────────────────────────────────

function PlanetCard({
  planet,
  reading,
  customerName,
}: {
  planet: PlanetConfig;
  reading: Reading | null;
  customerName: string;
}) {
  const [openSection, setOpenSection] = useState<SectionKey>('synthesis');
  const contentRef = useRef<HTMLDivElement>(null);

  const meta = reading ? getPlanetMeta(reading.chart_data, planet.id) : { sign: '', house: '', degree: '', retrograde: false };
  const synthesisText = reading ? (reading[planet.contentKey] as string | null) : null;

  const metaParts = [meta.sign, meta.house, meta.degree, meta.retrograde ? 'Retrograde' : null].filter(Boolean);
  const metaString = metaParts.join(' · ');

  const toggleSection = (key: SectionKey) => {
    setOpenSection(key);
  };

  return (
    <>
      <div className="card-outer" />
      <div className="card-inner">

        {/* Header */}
        <div className="card-header">
          <h1 className="planet-name">{planet.name}</h1>
          {metaString ? <p className="planet-meta">{metaString}</p> : null}
          <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '4px' }} />
        </div>

        {/* Scrollable content */}
        <div className="card-content" ref={contentRef}>

          {/* Synthesis row */}
          <div className="section-row" onClick={() => toggleSection('synthesis')}>
            <span className="section-row-label">Your {planet.name}</span>
            <span className="section-row-chevron">{openSection === 'synthesis' ? '−' : '+'}</span>
          </div>

          {openSection === 'synthesis' && (
            <div className="section-body">
              <p className="body-text">
                {synthesisText ?? PLACEHOLDER_SYNTHESIS}
              </p>
            </div>
          )}

          <div className="section-divider" />

          {/* Reference row */}
          <div className="section-row" onClick={() => toggleSection('reference')}>
            <span className="section-row-label">Reference</span>
            <span className="section-row-chevron">{openSection === 'reference' ? '−' : '+'}</span>
          </div>

          {openSection === 'reference' && (
            <div className="section-body">
              <p className="placeholder-text">{PLACEHOLDER_REFERENCE}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="card-footer">
          <span className="card-name">{customerName}</span>
        </div>

      </div>
    </>
  );
}

// ── Main Reading Page ──────────────────────────────────────────────────────

export default function ReadingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    async function fetchReading() {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setReading(data);
      }
      setLoading(false);
    }
    fetchReading();
  }, [slug]);

  const scrollToSection = useCallback((index: number) => {
    const section = sectionRefs.current[index];
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToNext = useCallback((currentIndex: number) => {
    scrollToSection(currentIndex + 1);
  }, [scrollToSection]);

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        background: 'var(--indigo)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-anton)',
          fontSize: '14px',
          color: 'var(--red-strong)',
          letterSpacing: '4px',
        }}>
          TEXTURE
        </span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{
        height: '100dvh',
        background: 'var(--indigo)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <span style={{ fontFamily: 'var(--font-anton)', fontSize: '14px', color: 'var(--red-strong)', letterSpacing: '4px' }}>TEXTURE</span>
        <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '12px', color: 'rgba(253,245,237,0.30)', letterSpacing: '2px' }}>READING NOT FOUND</span>
      </div>
    );
  }

  const customerName = reading?.name ?? '';
  const birthDate = reading?.birth_date ?? '';
  const birthTime = reading?.birth_time ?? '';
  const birthLocation = reading?.birth_location ?? '';

  return (
    <div className="reading-container">

      {/* ── 0. COVER ── */}
      <div
        className="reading-section cover-section"
        ref={el => { sectionRefs.current[0] = el; }}
      >
        <div className="wordmark">TEXTURE</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div className="cover-wordmark">TEXTURE</div>
          <div className="cover-name">{customerName}</div>
          <div className="cover-meta">{birthDate} · {birthTime}{'\n'}{birthLocation}</div>
          <div style={{ height: '1px', background: 'rgba(253,245,237,0.15)', width: '60px' }} />
          <div className="cover-tagline">Your chart is a map of one specific moment in the sky.</div>
        </div>
        <button className="next-arrow" onClick={() => scrollToNext(0)}>↓</button>
      </div>

      {/* ── 1. INTRO ── */}
      <div
        className="reading-section"
        style={{ background: 'var(--cream)' }}
        ref={el => { sectionRefs.current[1] = el; }}
      >
        <div className="wordmark" style={{ color: 'var(--red-strong)' }}>TEXTURE</div>
        <div className="intro-card">
          <div className="card-header">
            <h2 className="planet-name" style={{ fontSize: 'clamp(24px, 6vw, 36px)' }}>Your Reading</h2>
            <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '4px' }} />
          </div>
          <div className="intro-content">
            <p className="body-text">
              Placeholder intro text. This section orients the reader — grounds the tradition, explains the system logic, gives a brief map of what&apos;s ahead.
            </p>
            <p className="body-text">
              A chart is a woven system. Each placement is in context of every other. What follows was built from all of it — sign, house, degree, motion, and aspects read together, not in isolation.
            </p>
            <p className="body-text" style={{ color: 'var(--dark-muted)' }}>
              Use the arrow below or tap any planet name in the chart view to navigate directly to that section.
            </p>
          </div>
        </div>
        <button className="next-arrow" style={{ color: 'rgba(22,22,18,0.35)' }} onClick={() => scrollToNext(1)}>↓</button>
      </div>

      {/* ── 2. CHART (placeholder) ── */}
      <div
        className="reading-section chart-placeholder"
        ref={el => { sectionRefs.current[2] = el; }}
      >
        <div className="wordmark">TEXTURE</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '200px', height: '200px', borderRadius: '50%',
            border: '1px solid rgba(253,245,237,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '11px', color: 'rgba(253,245,237,0.20)', letterSpacing: '2px' }}>CHART</span>
          </div>
          <div className="chart-placeholder-label">CHART · FOCUS · LIST</div>
        </div>
        <button className="next-arrow" onClick={() => scrollToNext(2)}>↓</button>
      </div>

      {/* ── 3–16. PLANET SECTIONS ── */}
      {PLANETS.map((planet, index) => (
        <div
          key={planet.id}
          className="reading-section"
          ref={el => { sectionRefs.current[3 + index] = el; }}
        >
          <div className="wordmark">TEXTURE</div>
          <div className="section-bg" style={{ backgroundImage: `url(${planet.background})` }} />
          <PlanetCard planet={planet} reading={reading} customerName={customerName} />
          <button className="next-arrow" onClick={() => scrollToNext(3 + index)}>↓</button>
        </div>
      ))}

      {/* ── 17. REFERENCE ── */}
      <div
        className="reading-section"
        style={{ background: 'var(--cream)' }}
        ref={el => { sectionRefs.current[3 + PLANETS.length] = el; }}
      >
        <div className="wordmark" style={{ color: 'var(--red-strong)' }}>TEXTURE</div>
        <div className="reference-card">
          <div className="reference-header">
            <h2 className="reference-title">Reference</h2>
            <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', marginTop: '8px' }} />
          </div>
          <div className="reference-content">
            <p className="placeholder-text" style={{ padding: '16px 4px' }}>
              The reference dictionary will appear here.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
