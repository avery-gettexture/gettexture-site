'use client';

import { useState } from 'react';
import TodaySkyWheel from './TodaySkyWheel';
import { formatToday } from '@/lib/date-utils';
import { RAIL_SIGN_GLYPHS } from '@/app/reading/[slug]/natal/page';

// Mobile Today's Sky screen (SPEC §16, mobile Today's Sky rebuild) — Chart +
// List only, mirroring app/components/ChartSection.tsx (mobile My Chart's own
// Chart/List screen) but for live sky data instead of birth-chart data. No
// reading content, no scroll-through, no birth-data band (there is no birth
// data for "today's sky") — this is the whole page, not the first of several
// sections, so unlike ChartSection there is no down-arrow to anything below.

type SkyView = 'chart' | 'list';

interface SkyPosition {
  body: string;
  sign: string;
  sign_degree: number;
  retrograde: boolean;
}

interface SkyAspect {
  body_1: string;
  body_2: string;
  event: string;
}

interface TodaySkySectionProps {
  positions: SkyPosition[];
  aspects: SkyAspect[];
}

// Glyphs + ordering ported from app/components/HomeTodaySkyPanel.tsx (the
// desktop Today's Sky list) — same RPC body-name strings as keys.
const BODY_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
};

// Nodes shown as one row with BOTH ends (founder correction, Aug 17 2026):
// follows the desktop rail's own Nodes row pattern (Rail.tsx's `secondary`
// branch — app/reading/[slug]/natal/page.tsx's DesktopNatal `rows` builder)
// rather than mobile My Chart List's single-end row — north glyph - south
// glyph, north sign - south sign, one shared degree (axis math guarantees
// the same degree-within-sign on both ends), no retrograde badge (Nodes are
// never meaningfully retrograde). 'South Node' is looked up alongside
// 'North Node' below rather than iterated as its own row.
const BODY_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node'];

// Same offsets as ChartSection.tsx — pushes this page's own Chart|List row and
// content below the fixed MobileNavShell bar (56px + safe-area-inset-top).
const NAV_ROW_TOP = 'calc(56px + env(safe-area-inset-top) + 14px)';
const CONTENT_TOP = 'calc(56px + env(safe-area-inset-top) + 50px)';

const SKY_BG = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sky-background.png';
const RADIAL_BG = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/chart-radial.png';

// ── List View ─────────────────────────────────────────────────────────────

interface SkyListRow {
  body: string;
  isNodes: boolean;
  glyph: string;
  label: string;
  sign: string;
  signGlyph: string;
  degree: number;
  retrograde: boolean;
  // Nodes-only (isNodes: true) — south end, rendered alongside the fields
  // above (which carry the north end).
  southGlyph?: string;
  southSign?: string;
  southSignGlyph?: string;
}

function SkyListView({ positions }: { positions: SkyPosition[] }) {
  const positionsByBody = new Map(positions.map(p => [p.body, p]));
  const rows = BODY_ORDER
    .map((body): SkyListRow | null => {
      const pos = positionsByBody.get(body);
      if (!pos) return null;
      if (body === 'North Node') {
        const south = positionsByBody.get('South Node');
        return {
          body,
          isNodes: true,
          glyph: BODY_GLYPH['North Node'],
          label: 'Nodes',
          sign: pos.sign,
          signGlyph: RAIL_SIGN_GLYPHS[pos.sign] ?? '',
          degree: Math.floor(pos.sign_degree),
          retrograde: false,
          southGlyph: BODY_GLYPH['South Node'],
          southSign: south?.sign ?? '',
          southSignGlyph: south ? RAIL_SIGN_GLYPHS[south.sign] ?? '' : '',
        };
      }
      return {
        body,
        isNodes: false,
        label: body,
        glyph: BODY_GLYPH[body] ?? '○',
        sign: pos.sign,
        signGlyph: RAIL_SIGN_GLYPHS[pos.sign] ?? '',
        degree: Math.floor(pos.sign_degree),
        retrograde: pos.retrograde,
      };
    })
    .filter((r): r is SkyListRow => r !== null);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: '#FDF5ED',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderBottom: '1.5px solid rgba(185,18,18,0.50)',
    }}>
      <div style={{
        flexShrink: 0,
        padding: '8px 20px 6px',
        borderBottom: '1.5px solid rgba(185,18,18,0.50)',
      }}>
        <div style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(22px, 6vw, 30px)',
          color: '#161612',
          letterSpacing: '1px',
        }}>
          Current Sky
        </div>
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        padding: '0',
      }}>
        {rows.map((row, index) => {
          const borderBottom = index < rows.length - 1 ? '0.5px solid rgba(22,22,18,0.10)' : 'none';
          if (row.isNodes) {
            // Both ends of the axis (founder correction, Aug 17 2026) —
            // north glyph - south glyph, north sign - south sign, one
            // shared degree. Same information as the desktop rail's own
            // Nodes row (Rail.tsx's `secondary` branch), two lines instead
            // of one to fit both ends at mobile widths.
            return (
              <div key={row.body} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', padding: '8px 20px', borderBottom, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3vw, 14px)', color: 'rgba(22,22,18,0.45)', width: '20px', flexShrink: 0 }}>
                    {row.glyph}<span style={{ opacity: 0.5 }}>-</span>{row.southGlyph}
                  </span>
                  <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3.2vw, 14px)', color: '#161612', letterSpacing: '-0.2px', flex: 1 }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 12px)', color: 'rgba(22,22,18,0.55)' }}>{row.degree}°</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '20px' }}>
                  <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3.2vw, 14px)', color: '#161612', letterSpacing: '-0.2px' }}>{row.sign}</span>
                  <span style={{ fontSize: 'clamp(10px, 2.8vw, 12px)', color: 'rgba(22,22,18,0.45)' }}>{row.signGlyph}</span>
                  <span style={{ color: 'rgba(22,22,18,0.35)' }}>-</span>
                  <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3.2vw, 14px)', color: '#161612', letterSpacing: '-0.2px' }}>{row.southSign}</span>
                  <span style={{ fontSize: 'clamp(10px, 2.8vw, 12px)', color: 'rgba(22,22,18,0.45)' }}>{row.southSignGlyph}</span>
                </div>
              </div>
            );
          }
          return (
            <div
              key={row.body}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                borderBottom,
                flex: 1,
              }}
            >
              <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3vw, 14px)', color: 'rgba(22,22,18,0.45)', width: '20px', flexShrink: 0 }}>{row.glyph}</span>
              <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3.2vw, 14px)', color: '#161612', letterSpacing: '-0.2px', flex: 1 }}>{row.label}</span>
              <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3.2vw, 14px)', color: '#161612', letterSpacing: '-0.2px', marginRight: '4px' }}>{row.sign}</span>
              <span style={{ fontSize: 'clamp(10px, 2.8vw, 12px)', color: 'rgba(22,22,18,0.45)', marginRight: '6px' }}>{row.signGlyph}</span>
              <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 12px)', color: 'rgba(22,22,18,0.55)', marginRight: '4px' }}>{row.degree}°</span>
              {row.retrograde && <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(9px, 2.4vw, 11px)', color: 'rgba(185,18,18,0.75)', letterSpacing: '1px' }}>R</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Chart View ────────────────────────────────────────────────────────────

function SkyChartView({ positions, aspects }: { positions: SkyPosition[]; aspects: SkyAspect[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Wheel — takes the remaining space above the date band below, same
          "wheel above, fixed band below" split as ChartSection.tsx's own
          ChartView (there it's birth data; here there is none, so the band
          holds just today's date — SPEC §16, founder correction). */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          width: 'min(130vw, 85dvh)',
          aspectRatio: '1',
          borderRadius: '50%',
          backgroundImage: `url(${RADIAL_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        <div style={{
          width: 'min(calc(100dvh - 260px), calc(100vw - 24px), 62dvh)',
          aspectRatio: '1',
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <TodaySkyWheel positions={positions} aspects={aspects} />
        </div>
      </div>

      {/* Date — same position/styling as ChartSection.tsx's collapsed name
          band (centered, geist mono), not tappable/expandable since there is
          no birth data to reveal underneath it. */}
      <div style={{
        flexShrink: 0,
        minHeight: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '18px 24px 10px',
      }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(14px, 3.8vw, 16px)',
          color: 'rgba(253,245,237,0.85)',
          letterSpacing: '1px',
        }}>
          {formatToday()}
        </span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function TodaySkySection({ positions, aspects }: TodaySkySectionProps) {
  const [activeView, setActiveView] = useState<SkyView>('chart');
  const isLight = activeView === 'list';

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: isLight ? '#FDF5ED' : '#0e0c1a',
      backgroundImage: isLight ? '' : `url(${SKY_BG})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>

      {/* Nav — Chart | List only, same offset/positioning as ChartSection.tsx
          so it sits consistently below the fixed mobile nav bar. */}
      <div style={{
        position: 'absolute', top: NAV_ROW_TOP, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        paddingLeft: '20px', paddingRight: '20px', zIndex: 20,
      }}>
        {(['chart', 'list'] as SkyView[]).map(view => (
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
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 0', textTransform: 'capitalize',
              fontWeight: activeView === view ? 'bold' : 'normal',
            }}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ position: 'absolute', top: CONTENT_TOP, bottom: 0, left: 0, right: 0 }}>
        {activeView === 'chart' && <SkyChartView positions={positions} aspects={aspects} />}
        {activeView === 'list' && <SkyListView positions={positions} />}
      </div>

    </div>
  );
}
