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

// Nodes shown as two full rows, North Node then South Node (SPEC §16,
// Aug 22 2026) — this reverses the Aug 17 2026 founder correction that
// had collapsed them to one combined line; today's instruction is two
// rows on every surface that lists Nodes, flagged in the SPEC changelog.
// Both are otherwise ordinary rows (own glyph, sign, degree), no
// retrograde badge (Nodes are never meaningfully retrograde).
const BODY_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node'];

// Same offsets as ChartSection.tsx — pushes this page's own Chart|List row and
// content below the fixed MobileNavShell bar (56px + safe-area-inset-top).
const NAV_ROW_TOP = 'calc(56px + env(safe-area-inset-top) - 4px)';
const CONTENT_TOP = 'calc(56px + env(safe-area-inset-top) + 24px)';

const SKY_BG = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sky-background.png';
const RADIAL_BG = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/chart-radial.png';

// ── List View ─────────────────────────────────────────────────────────────

interface SkyListRow {
  body: string;
  glyph: string;
  label: string;
  sign: string;
  signGlyph: string;
  degree: number;
  retrograde: boolean;
}

function SkyListView({ positions }: { positions: SkyPosition[] }) {
  const positionsByBody = new Map(positions.map(p => [p.body, p]));
  const rows = BODY_ORDER
    .map((body): SkyListRow | null => {
      const pos = positionsByBody.get(body);
      if (!pos) return null;
      return {
        body,
        label: body,
        glyph: BODY_GLYPH[body] ?? '○',
        sign: pos.sign,
        signGlyph: RAIL_SIGN_GLYPHS[pos.sign] ?? '',
        degree: Math.floor(pos.sign_degree),
        // Nodes always move backward by nature — "retrograde" is
        // meaningless for them, so no R flag here (matches every other
        // Nodes row in the app; SPEC §16).
        retrograde: (body === 'North Node' || body === 'South Node') ? false : pos.retrograde,
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

      {/* Date — same bottom-band structure as ChartSection.tsx's birth-data
          band (red rule above, content below), but display-only: no
          tap/expand, since there is no birth data for the sky (SPEC §16,
          Aug 30 2026 founder correction). */}
      <div style={{ flexShrink: 0, borderTop: '1.5px solid rgba(185,18,18,0.50)' }}>
        <div style={{
          width: '100%',
          minHeight: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 24px',
        }}>
          <span style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 'clamp(14px, 3.8vw, 16px)',
            color: '#161612',
            letterSpacing: '1px',
          }}>
            {formatToday()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Chart View ────────────────────────────────────────────────────────────

function SkyChartView({ positions, aspects }: { positions: SkyPosition[]; aspects: SkyAspect[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Wheel + gap + date band are one visual group, centered as a unit
          in the content area — matches ChartSection.tsx's own ChartView fix
          (SPEC §16, second fix pass). Anchoring the wheel to one edge of a
          flexible region always dumped 100% of the leftover vertical space
          on one side; centering the whole group instead splits it, and the
          fixed 16px gap below never grows into a void. The wheel-plus-glow
          unit is wrapped in its own relative box sized exactly to the
          wheel's diameter (unchanged formula, not enlarged) so the radial
          glow stays centered on the wheel itself. */}
      <div style={{
        position: 'relative',
        width: 'min(calc(100dvh - 260px), calc(100vw - 24px), 62dvh)',
        aspectRatio: '1',
        alignSelf: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(130vw, 85dvh)',
          aspectRatio: '1',
          borderRadius: '50%',
          backgroundImage: `url(${RADIAL_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
        }}>
          <TodaySkyWheel positions={positions} aspects={aspects} />
        </div>
      </div>

      {/* Fixed, short gap so the date sits comfortably close under the
          wheel rather than floating in empty space (SPEC §16). */}
      <div style={{ height: '16px', flexShrink: 0 }} />

      {/* Date — same position/styling as ChartSection.tsx's collapsed name
          band (centered, geist mono), not tappable/expandable since there is
          no birth data to reveal underneath it. No red rule here: the
          red-line-above-name treatment is List-only, not the chart-wheel
          views (SPEC §16, fix pass — corrects the prior pass, which had
          applied it here too). `position: relative` is load-bearing here,
          matching ChartSection.tsx's identical note: the wheel's radial
          glow above is `position: absolute` and, with the gap now closed,
          reaches down into this band — CSS paints positioned elements above
          static ones regardless of DOM order, so without this the glow
          would wash out the date text. */}
      <div style={{
        flexShrink: 0,
        position: 'relative',
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
          so it sits consistently below the fixed mobile nav bar.
          Left-anchored, pipe-divided group (spacing-cleanup task) — matches
          the desktop toggle convention and ChartSection.tsx's own mobile
          toggle, instead of the old full-width Chart-far-left/List-far-right
          spread. */}
      <div style={{
        position: 'absolute', top: NAV_ROW_TOP, left: 0, right: 0,
        display: 'flex', paddingLeft: '20px', paddingRight: '20px', zIndex: 20,
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['chart', 'list'] as SkyView[]).map((view, i) => (
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
                borderLeft: i > 0 ? `1px solid ${isLight ? 'rgba(22,22,18,0.20)' : 'rgba(253,245,237,0.30)'}` : 'none',
                paddingLeft: i > 0 ? '10px' : '0',
              }}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', top: CONTENT_TOP, bottom: 0, left: 0, right: 0 }}>
        {activeView === 'chart' && <SkyChartView positions={positions} aspects={aspects} />}
        {activeView === 'list' && <SkyListView positions={positions} />}
      </div>

    </div>
  );
}
