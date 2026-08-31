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

// Same header-zone height as ChartSection.tsx — reserves space for this
// page's own Chart|List row below the fixed MobileNavShell bar (56px +
// safe-area-inset-top). See ChartSection.tsx's own comment on this constant
// (SPEC §16, Aug 31 2026 three-zone rebuild) for why this replaced the old
// pair of absolute-position offset constants.
const HEADER_ZONE_HEIGHT = 'calc(56px + env(safe-area-inset-top) + 24px)';

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
      {/* "Current Sky" title now lives merged into the shared header zone
          above (see TodaySkySection's own render), sharing one row with the
          Chart|List toggle instead of a separate row here — same
          header-merge treatment ChartSection.tsx's List got, SPEC §16, Sep
          2026 — so this view no longer renders its own title or divider;
          the divider is now that shared row's bottom border. */}
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
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Wheel zone — zone 2 of 3 (SPEC §16, three-zone rebuild). Mirrors
          ChartSection.tsx's own ChartView wheel zone — see that file's
          comment for the full rationale. Takes whatever room is left
          between the header zone above (reserved in TodaySkySection's own
          render, below) and the date zone below; `overflow: hidden` +
          `containerType: 'size'` clip the wheel and its glow to this box
          and size them in container-query units (cqw/cqh) relative to this
          box's own actual size, so the wheel scales down to fit rather than
          overflowing into the zones above or below it. */}
      <div style={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        containerType: 'size',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          position: 'relative',
          // 24px of total breathing room within this zone — mirrors the old
          // formula's own `100vw - 24px` margin, just measured against this
          // zone's real box instead of the whole viewport.
          width: 'min(calc(100cqw - 24px), calc(100cqh - 24px))',
          aspectRatio: '1',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            // Glow is deliberately larger than the wheel it's centered on
            // (~140%, matching the prior formula's own ratio) — safe to
            // bleed past the wheel's own box now, since this zone's own
            // clip catches it before it can reach the header or date zones.
            width: '140%',
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
      </div>

      {/* Date zone — zone 3 of 3. Content-sized, same position/styling as
          ChartSection.tsx's collapsed name band (centered, geist mono), not
          tappable/expandable since there is no birth data to reveal
          underneath it. No red rule here: the red-line-above-name treatment
          is List-only, not the chart-wheel views (SPEC §16, fix pass).
          Padding is symmetric top/bottom (SPEC §16, Sep 2026 fix) — the
          previous 18px-top/10px-bottom split skewed the centered date
          toward the bottom of this slot; even padding lets `justifyContent:
          center` actually center it. */}
      <div style={{
        flexShrink: 0,
        minHeight: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px 24px',
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
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isLight ? '#FDF5ED' : '#0e0c1a',
      backgroundImage: isLight ? '' : `url(${SKY_BG})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>

      {/* Header zone — zone 1 of 3 (SPEC §16, three-zone rebuild).
          Header-merge fix (SPEC §16, Sep 2026), mirroring ChartSection.tsx's
          own List header merge: List's "Current Sky" title now shares this
          row with the Chart|List toggle (title left, toggle right) instead
          of SkyListView rendering it on its own row below — freeing a full
          row of height that flows into List's placement rows automatically
          (that area is `flex: 1, justifyContent: 'space-evenly'`). Chart has
          no title to merge, so its row stays just the toggle, right-aligned
          for visual consistency with List's right-aligned toggle — same
          left-anchored, pipe-divided toggle group as before either way. The
          red divider that used to sit under List's standalone title block
          now sits under this shared row instead, only when List is active. */}
      <div style={{
        flexShrink: 0,
        height: HEADER_ZONE_HEIGHT,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: isLight ? 'space-between' : 'flex-end',
        paddingLeft: '20px', paddingRight: '20px', paddingBottom: '4px',
        borderBottom: isLight ? '1.5px solid rgba(185,18,18,0.50)' : 'none',
        zIndex: 20,
      }}>
        {isLight && (
          <div style={{
            fontFamily: 'var(--font-anton), sans-serif',
            fontSize: 'clamp(22px, 6vw, 30px)',
            color: '#161612',
            letterSpacing: '1px',
            lineHeight: 1,
          }}>
            Current Sky
          </div>
        )}
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

      {/* Content — fills the rest of the page below the header zone. Chart
          tab subdivides this into its own wheel/date zones (see
          SkyChartView); List tab fills it with its existing self-contained
          layout (unchanged). */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {activeView === 'chart' && <SkyChartView positions={positions} aspects={aspects} />}
        {activeView === 'list' && <SkyListView positions={positions} />}
      </div>

    </div>
  );
}
