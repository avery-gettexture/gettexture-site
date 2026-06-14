'use client';

import { useEffect, useRef, useState, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllPlanetReferences, type PlacementReferenceResult } from '@/lib/reference-utils';
import ReferencePage from '@/app/components/ReferencePage';
import CoverSection from '@/app/components/CoverSection';
import BirthDataSection from '@/app/components/BirthDataSection';
import ChartSection from '@/app/components/ChartSection';

// ── Types ──────────────────────────────────────────────────────────────────

type SectionKey = 'synthesis' | 'reference';

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

// ── Section indices ────────────────────────────────────────────────────────
// 0: Cover
// 1: Birth Data
// 2: Intro
// 3: Chart
// 4-17: Planets (14 total)
// 18: Reference

const CHART_INDEX = 3;
const PLANET_START = 4;

const PLANET_TO_INDEX: Record<string, number> = {
  sun: 4, moon: 5, mercury: 6, venus: 7, mars: 8,
  jupiter: 9, saturn: 10, uranus: 11, neptune: 12, pluto: 13,
  ascendant: 14, medium_coeli: 15, mean_north_lunar_node: 16, mean_south_lunar_node: 17,
};

// ── Helper: get planet meta from chart_data ────────────────────────────────

const PLANET_KEY_MAP: Record<string, string> = {
  sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus',
  mars: 'mars', jupiter: 'jupiter', saturn: 'saturn', uranus: 'uranus',
  neptune: 'neptune', pluto: 'pluto', asc: 'ascendant', mc: 'medium_coeli',
  'north-node': 'mean_north_lunar_node', 'south-node': 'mean_south_lunar_node',
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

// ── Planet Card Component ──────────────────────────────────────────────────

function PlanetCard({
  planet,
  reading,
  customerName,
  referenceData,
}: {
  planet: PlanetConfig;
  reading: Reading | null;
  customerName: string;
  referenceData?: PlacementReferenceResult;
}) {
  const [openSection, setOpenSection] = useState<SectionKey>('synthesis');
  const contentRef = useRef<HTMLDivElement>(null);

  const meta = reading ? getPlanetMeta(reading.chart_data, planet.id) : { sign: '', house: '', degree: '', retrograde: false };
  const synthesisText = reading ? (reading[planet.contentKey] as string | null) : null;
  const metaParts = [meta.sign, meta.house, meta.degree, meta.retrograde ? 'Retrograde' : null].filter(Boolean);
  const metaString = metaParts.join(' · ');

  return (
    <>
      <div className="card-outer" />
      <div className="card-inner">
        <div className="card-header">
          <h1 className="planet-name">{planet.name}</h1>
          {metaString ? <p className="planet-meta">{metaString}</p> : null}
          <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '4px' }} />
        </div>

        <div className="card-content" ref={contentRef}>
          <div className="section-row" onClick={() => setOpenSection('synthesis')}>
            <span className="section-row-label">Your {planet.name}</span>
            <span className="section-row-chevron">{openSection === 'synthesis' ? '−' : '+'}</span>
          </div>

          {openSection === 'synthesis' && (
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
              {!referenceData ? (
                <p className="placeholder-text">Loading...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    referenceData.planet,
                    referenceData.sign,
                    referenceData.house,
                    referenceData.motion,
                    referenceData.degree,
                  ].filter(Boolean).map((entry, i) => entry && (
                    <div key={i}>
                      <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 11px)', color: 'rgba(22,22,18,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                        {entry.category === 'motion' ? `${entry.name} MOTION` : entry.category === 'degree' ? `${entry.name} DEGREE` : entry.name}
                      </div>
                      <p className="body-text" style={{ color: 'rgba(22,22,18,0.70)', fontSize: 'clamp(13px, 3.6vw, 15px)' }}>{entry.description}</p>
                    </div>
                  ))}
                  {(() => {
                    const grouped: Array<{ instances: string[]; entry: typeof referenceData.aspects[0]['entry'] }> = [];
                    referenceData.aspects.forEach(a => {
                      if (a.showDescription) {
                        grouped.push({ instances: [a.instance], entry: a.entry });
                      } else {
                        grouped[grouped.length - 1]?.instances.push(a.instance);
                      }
                    });
                    return grouped.map((group, i) => (
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
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card-footer">
          <span className="card-name">{customerName}</span>
        </div>
      </div>
    </>
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

  useEffect(() => {
    if (!reading?.chart_data) return;
    const planetIds = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','asc','mc','north-node','south-node'];
    fetchAllPlanetReferences(planetIds, reading.chart_data, reading.birth_time_known ?? true)
      .then(setReferenceData);
  }, [reading]);

  const scrollToSection = useCallback((index: number) => {
    const section = sectionRefs.current[index];
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToNext = useCallback((currentIndex: number) => {
    scrollToSection(currentIndex + 1);
  }, [scrollToSection]);

  if (loading) {
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

  return (
    <div className="reading-container">

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
        />
        <button className="next-arrow" onClick={() => scrollToNext(CHART_INDEX)}>↓</button>
      </div>

      {/* ── 4–17. PLANET SECTIONS ── */}
      {PLANETS.map((planet, index) => (
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
          <button className="next-arrow" style={{ bottom: 'auto', top: '0.25%' }} onClick={() => scrollToSection(PLANET_START + index - 1)}>↑</button>
          <div
            className="section-bg"
            style={{
              backgroundImage: `url(${planet.background})`,
              backgroundPosition: (() => {
                if (planet.id === 'north-node') return 'center top';
                if (planet.id === 'south-node') return 'center bottom';
                if (planet.id === 'asc') return 'center center';
                if (planet.id === 'mc') return 'center top';
                return 'center center';
              })(),
            }}
          />
          <PlanetCard planet={planet} reading={reading} customerName={customerName} referenceData={referenceData[planet.id]} />
          <button className="next-arrow" onClick={() => scrollToNext(PLANET_START + index)}>↓</button>
        </div>
      ))}

      {/* ── 18. REFERENCE ── */}
      <div
        className="reading-section"
        style={{ background: 'var(--cream)' }}
        ref={el => { sectionRefs.current[PLANET_START + PLANETS.length] = el; }}
      >
        <div className="wordmark" style={{ color: 'var(--red-strong)' }}>TEXTURE</div>
        <button className="next-arrow" style={{ bottom: 'auto', top: '0.25%' }} onClick={() => scrollToSection(PLANET_START + PLANETS.length - 1)}>↑</button>
        <div className="card-inner">
          <ReferencePage />
        </div>
      </div>

    </div>
  );
}
