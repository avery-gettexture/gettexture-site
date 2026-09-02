'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import TodaySkyWheel from './TodaySkyWheel';
import { formatToday } from '@/lib/date-utils';
import { UNSTYLED_BUTTON } from '@/lib/a11y';

// The CHART state of the desktop transits page (SPEC §16). A screen-state
// swap of the reading pane's content, not a scroll target — mirrors
// NatalChartPane.tsx's geometry and measurement approach exactly (same
// wheel sizing math, same Chart 101 link placement) per the founder's
// build brief: transits is a near-exact copy of natal's CHART state, with
// only the backdrop image, the bottom band (date + Today/Transiting toggle
// instead of name/birth data), and the wheel content itself differing.
//
// WHEEL FIX (Sep 2, 2026): this used to render the natal <NatalChartWheelWeb>
// fed the reading's own birth chart data, as a temporary stand-in — there
// was no real "today's sky" wheel yet. TodaySkyWheel now exists (built for
// the Home page's Today's Sky panel) and is used here instead, fed the same
// live current-sky positions/aspects the rail already fetches. The
// `chartData`/`birthTimeKnown` props are kept, unused, for the still-unbuilt
// "Transiting" bi-wheel (natal-vs-transit overlay) — the Today/Transiting
// toggle below stays hidden until that exists.

export type ChartMode = 'today' | 'transiting';

// HIDE (SPEC §16, hide-transits pass): the Today/Transiting toggle is
// suppressed until the real transit/bi-wheel exists — flip back to true to
// restore it. Nothing else in this file changes.
const SHOW_TODAY_TRANSITING_TOGGLE = false;

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

interface TransitChartPaneProps {
  chartData: any;
  birthTimeKnown: boolean;
  positions: SkyPosition[];
  aspects: SkyAspect[];
  slug: string;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
}

export default function TransitChartPane({
  chartData,
  birthTimeKnown,
  positions,
  aspects,
  slug,
  chartMode,
  onChartModeChange,
}: TransitChartPaneProps) {
  // Same wheel center/size constants as NatalChartPane.tsx — per the brief,
  // the transit wheel uses the SAME proportions/placement as the natal
  // chart wheel.
  const CENTER_LEFT = '50%';
  const CENTER_TOP = '46.5%';

  const rootRef = useRef<HTMLDivElement>(null);
  const [wheelSize, setWheelSize] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setWheelSize(Math.round(0.85 * Math.min(width, height)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const todayLabel = formatToday();

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0 }}>

      {/* Radial backdrop — /sky-background.png per the founder's delta
          (natal's CHART state uses /chart-radial-new.png; transits swaps
          in this image instead), same "fills the full square, no visible
          circular edge, centered behind wheel" oversized/cropped treatment
          as NatalChartPane.tsx. */}
      <div style={{
        position: 'absolute',
        left: CENTER_LEFT,
        top: CENTER_TOP,
        width: '220%',
        height: '220%',
        transform: 'translate(-50%, -50%)',
        backgroundImage: 'url(/sky-background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Chart 101 — same link/position/label as natal's CHART state. */}
      <Link href={`/reading/${slug}/reference`} style={{
        position: 'absolute',
        top: '8%',
        right: '8%',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 'clamp(11px, 1vw, 13px)',
        letterSpacing: '0.5px',
        color: 'rgba(253,245,237,0.55)',
        textDecoration: 'none',
      }}>
        Chart 101
      </Link>

      {/* Today's Sky wheel — see file-level comment. */}
      {wheelSize !== undefined && (
        <div style={{
          position: 'absolute',
          left: CENTER_LEFT,
          top: CENTER_TOP,
          width: wheelSize,
          height: wheelSize,
          transform: 'translate(-50%, -50%)',
        }}>
          <TodaySkyWheel positions={positions} aspects={aspects} size={wheelSize} />
        </div>
      )}

      {/* Date — bottom-left, per docs/mocks/transit-wheel-layout.png.
          Replaces natal's name/birth-data band, which this pane doesn't
          have. */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        left: '8%',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 'clamp(13px, 1.4vw, 18px)',
        letterSpacing: '0.5px',
        color: 'rgba(253,245,237,0.70)',
      }}>
        {todayLabel}
      </div>

      {/* Today | Transiting toggle — bottom-right, per the same mock.
          Same active/inactive treatment as the rail's own READ/CHART/
          CALENDAR toggle (.rail-control / .rail-control.active in
          globals.css), reproduced inline since this pane is otherwise
          entirely inline-styled, matching NatalChartPane.tsx's own
          convention.

          HIDDEN (SPEC §16, hide-transits pass, SHOW_TODAY_TRANSITING_TOGGLE
          above) — restorable by flipping the flag back to true. */}
      {SHOW_TODAY_TRANSITING_TOGGLE && (
        <div style={{
          position: 'absolute',
          bottom: '8%',
          right: '8%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'var(--font-geist-mono), monospace',
          letterSpacing: '0.5px',
        }}>
          <button
            type="button"
            onClick={() => onChartModeChange('today')}
            aria-pressed={chartMode === 'today'}
            style={{
              ...UNSTYLED_BUTTON,
              fontFamily: 'inherit',
              letterSpacing: 'inherit',
              cursor: 'pointer',
              color: chartMode === 'today' ? 'rgba(253,245,237,1)' : 'rgba(253,245,237,0.45)',
              fontWeight: chartMode === 'today' ? 700 : 400,
              fontSize: chartMode === 'today' ? 'clamp(12px, 1vw, 14px)' : 'clamp(11px, 0.9vw, 13px)',
            }}
          >
            Today
          </button>
          <span style={{ color: 'rgba(253,245,237,0.30)' }}>|</span>
          <button
            type="button"
            onClick={() => onChartModeChange('transiting')}
            aria-pressed={chartMode === 'transiting'}
            style={{
              ...UNSTYLED_BUTTON,
              fontFamily: 'inherit',
              letterSpacing: 'inherit',
              cursor: 'pointer',
              color: chartMode === 'transiting' ? 'rgba(253,245,237,1)' : 'rgba(253,245,237,0.45)',
              fontWeight: chartMode === 'transiting' ? 700 : 400,
              fontSize: chartMode === 'transiting' ? 'clamp(12px, 1vw, 14px)' : 'clamp(11px, 0.9vw, 13px)',
            }}
          >
            Transiting
          </button>
        </div>
      )}

    </div>
  );
}
