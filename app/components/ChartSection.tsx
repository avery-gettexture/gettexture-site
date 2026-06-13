'use client';

import { useState } from 'react';
import NatalChartWheelWeb from './NatalChartWheelWeb';

// ── Types ──────────────────────────────────────────────────────────────────

type ChartView = 'chart' | 'focus' | 'list';

interface ChartSectionProps {
  chartData: any;
  customerName: string;
  onScrollToPlanet?: (planetId: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  'north-node': '☊', 'south-node': '☋', ascendant: '↑', medium_coeli: '↑',
  mean_north_lunar_node: '☊', mean_south_lunar_node: '☋',
};

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈\uFE0E', Taurus: '♉\uFE0E', Gemini: '♊\uFE0E', Cancer: '♋\uFE0E',
  Leo: '♌\uFE0E', Virgo: '♍\uFE0E', Libra: '♎\uFE0E', Scorpio: '♏\uFE0E',
  Sagittarius: '♐\uFE0E', Capricorn: '♑\uFE0E', Aquarius: '♒\uFE0E', Pisces: '♓\uFE0E',
};

const SIGN_ABBR_MAP: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

const PLANET_ORDER = [
  { key: 'sun',                   label: 'Sun',        glyphKey: 'sun' },
  { key: 'moon',                  label: 'Moon',       glyphKey: 'moon' },
  { key: 'mercury',               label: 'Mercury',    glyphKey: 'mercury' },
  { key: 'venus',                 label: 'Venus',      glyphKey: 'venus' },
  { key: 'mars',                  label: 'Mars',       glyphKey: 'mars' },
  { key: 'jupiter',               label: 'Jupiter',    glyphKey: 'jupiter' },
  { key: 'saturn',                label: 'Saturn',     glyphKey: 'saturn' },
  { key: 'uranus',                label: 'Uranus',     glyphKey: 'uranus' },
  { key: 'neptune',               label: 'Neptune',    glyphKey: 'neptune' },
  { key: 'pluto',                 label: 'Pluto',      glyphKey: 'pluto' },
  { key: 'ascendant',             label: 'Ascendant',  glyphKey: 'ascendant' },
  { key: 'medium_coeli',          label: 'Midheaven',  glyphKey: 'medium_coeli' },
  { key: 'mean_north_lunar_node', label: 'North Node', glyphKey: 'mean_north_lunar_node' },
  { key: 'mean_south_lunar_node', label: 'South Node', glyphKey: 'mean_south_lunar_node' },
];

const HOUSE_ORDINALS: Record<string, string> = {
  First_House: '1st', Second_House: '2nd', Third_House: '3rd',
  Fourth_House: '4th', Fifth_House: '5th', Sixth_House: '6th',
  Seventh_House: '7th', Eighth_House: '8th', Ninth_House: '9th',
  Tenth_House: '10th', Eleventh_House: '11th', Twelfth_House: '12th',
};

// ── List View ─────────────────────────────────────────────────────────────

function ListView({ chartData, onScrollToPlanet }: { chartData: any; onScrollToPlanet?: (planetId: string) => void }) {
  const subject = chartData?.subject;
  if (!subject) return null;

  const planets = PLANET_ORDER
    .map(p => {
      const data = subject[p.key];
      if (!data) return null;
      const sign = SIGN_ABBR_MAP[data.sign] ?? data.sign ?? '';
      const degree = data.position != null ? Math.floor(data.position) : 0;
      const house = ['ascendant', 'medium_coeli'].includes(p.key)
        ? null
        : HOUSE_ORDINALS[data.house] ?? null;
      return {
        key: p.key,
        label: p.label,
        glyph: PLANET_GLYPHS[p.glyphKey] ?? '○',
        sign,
        signGlyph: SIGN_GLYPHS[sign] ?? '',
        degree,
        house,
        retrograde: data.retrograde ?? false,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div style={{
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        padding: '16px 20px 10px',
        borderBottom: '1.5px solid rgba(185,18,18,0.50)',
      }}>
        <div style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(28px, 8vw, 36px)',
          color: '#161612',
          letterSpacing: '1px',
        }}>
          Placements
        </div>
      </div>

      {/* Planet rows */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 0',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>
        {planets.map((planet, index) => (
          <div
            key={planet.key}
            onClick={() => onScrollToPlanet?.(planet.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              borderBottom: index < planets.length - 1
                ? '0.5px solid rgba(22,22,18,0.10)'
                : 'none',
              cursor: onScrollToPlanet ? 'pointer' : 'default',
            }}
          >
            {/* Glyph */}
            <span style={{
              fontFamily: 'var(--font-questrial), sans-serif',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              color: 'rgba(22,22,18,0.45)',
              width: '24px',
              flexShrink: 0,
            }}>
              {planet.glyph}
            </span>

            {/* Planet name */}
            <span style={{
              fontFamily: 'var(--font-questrial), sans-serif',
              fontSize: 'clamp(13px, 3.8vw, 15px)',
              color: '#161612',
              letterSpacing: '-0.2px',
              flex: 1,
            }}>
              {planet.label}
            </span>

            {/* Sign + glyph */}
            <span style={{
              fontFamily: 'var(--font-questrial), sans-serif',
              fontSize: 'clamp(13px, 3.8vw, 15px)',
              color: '#161612',
              letterSpacing: '-0.2px',
              marginRight: '6px',
            }}>
              {planet.sign}
            </span>
            <span style={{
              fontSize: 'clamp(12px, 3.2vw, 13px)',
              color: 'rgba(22,22,18,0.45)',
              marginRight: '8px',
            }}>
              {planet.signGlyph}
            </span>

            {/* Degree */}
            <span style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 'clamp(11px, 3vw, 13px)',
              color: 'rgba(22,22,18,0.55)',
              marginRight: '6px',
            }}>
              {planet.degree}°
            </span>

            {/* House */}
            {planet.house && (
              <span style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 'clamp(10px, 2.8vw, 12px)',
                color: 'rgba(22,22,18,0.35)',
                marginRight: '6px',
              }}>
                {planet.house}
              </span>
            )}

            {/* Retrograde */}
            {planet.retrograde && (
              <span style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 'clamp(10px, 2.8vw, 12px)',
                color: 'rgba(185,18,18,0.75)',
                letterSpacing: '1px',
              }}>
                R
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart Placeholder ─────────────────────────────────────────────────────

function ChartView({ chartData, birthTimeKnown }: { chartData: any; birthTimeKnown: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Radial gradient circle behind wheel */}
      <div style={{
        position: 'absolute',
        width: 'min(calc(100dvh - 80px), calc(100vw - 8px))',
        maxWidth: '640px',
        aspectRatio: '1',
        borderRadius: '50%',
        backgroundImage: 'url(https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/chart-radial.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />
      {/* Wheel */}
      <div style={{
        width: 'min(calc(100dvh - 120px), calc(100vw - 24px))',
        maxWidth: '600px',
        aspectRatio: '1',
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <NatalChartWheelWeb chartData={chartData} birthTimeKnown={birthTimeKnown} />
      </div>
    </div>
  );
}

// ── Focus Placeholder ─────────────────────────────────────────────────────

function FocusView() {
  return (
    <div style={{
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <span style={{
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: '11px',
        color: 'rgba(253,245,237,0.20)',
        letterSpacing: '2px',
      }}>
        FOCUS
      </span>
    </div>
  );
}

// ── Main Chart Section ────────────────────────────────────────────────────

export default function ChartSection({
  chartData,
  customerName,
  onScrollToPlanet,
}: ChartSectionProps) {
  const [activeView, setActiveView] = useState<ChartView>('chart');

  const isLight = activeView === 'list';

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: isLight ? '#FDF5ED' : '#0e0c1a',
      backgroundImage: isLight ? 'none' : 'url(https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sky-background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transition: 'background 0.3s ease',
    }}>

      {/* TEXTURE wordmark */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        fontFamily: 'var(--font-anton), sans-serif',
        fontSize: '14px',
        color: 'rgba(185,18,18,0.75)',
        letterSpacing: '2px',
        zIndex: 20,
      }}>
        TEXTURE
      </div>

      {/* Nav tabs */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
        zIndex: 20,
      }}>
        {(['chart', 'focus', 'list'] as ChartView[]).map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 'clamp(13px, 3.5vw, 16px)',
              letterSpacing: '1px',
              color: activeView === view
                ? (isLight ? '#161612' : 'rgba(253,245,237,1)')
                : (isLight ? 'rgba(22,22,18,0.35)' : 'rgba(253,245,237,0.35)'),
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              textTransform: 'capitalize',
              fontWeight: activeView === view ? 'bold' : 'normal',
            }}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{
        position: 'absolute',
        top: '52px',
        bottom: '48px',
        left: 0,
        right: 0,
      }}>
        {activeView === 'chart' && <ChartView chartData={chartData} birthTimeKnown={!!chartData} />}
        {activeView === 'focus' && <FocusView />}
        {activeView === 'list' && <ListView chartData={chartData} onScrollToPlanet={onScrollToPlanet} />}
      </div>

      {/* Customer name */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 'clamp(13px, 3.5vw, 16px)',
        color: isLight ? 'rgba(22,22,18,0.45)' : 'rgba(253,245,237,0.45)',
        letterSpacing: '1px',
      }}>
        {customerName}
      </div>

    </div>
  );
}
