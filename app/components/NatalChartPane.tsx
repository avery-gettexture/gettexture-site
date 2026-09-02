'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import NatalChartWheelWeb from './NatalChartWheelWeb';
import { formatDate } from './BirthDataSection';
import { UNSTYLED_BUTTON } from '@/lib/a11y';

// The CHART state of the desktop natal reading page (SPEC §16, Phase 3A
// follow-up). A screen-state swap of the reading pane's content, not a
// scroll target — DesktopNatal renders this in place of `.natal-scroll`
// when paneMode === 'chart'. Mirrors mobile ChartSection.tsx's inline-style
// convention (same already-BUILT pattern) rather than inventing a new one.

interface NatalChartPaneProps {
  chartData: any;
  birthTimeKnown: boolean;
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  slug: string;
}

export default function NatalChartPane({
  chartData,
  birthTimeKnown,
  name,
  birthDate,
  birthTime,
  birthLocation,
  slug,
}: NatalChartPaneProps) {
  const [expanded, setExpanded] = useState(false);
  const formattedDate = formatDate(birthDate);

  // Wheel center/size — re-derived from docs/mocks/chart-dif.png (founder
  // overlay showing the target circle traced on a to-scale screenshot of
  // this pane), measured by pixel analysis rather than eyeballed: circle
  // diameter ~85% of the pane's limiting (smaller) dimension, vertical
  // center ~46.5% down. This replaced an earlier pass's 62%/44%, which was
  // read off docs/TEXTURE_LAYOUT_PROPORTIONS.md before this overlay existed.
  const CENTER_LEFT = '50%';
  const CENTER_TOP = '46.5%';

  // The pane is NOT square (it's noticeably wider than tall on real
  // viewports), so "X% of width" and "X% of height" are two different
  // pixel sizes — sizing off width alone made an earlier pass's wheel run
  // into the top edge (caught in review: measured via
  // getBoundingClientRect, not assumed). Fixed the same way mobile's
  // ChartSection.tsx already defends against this (its `min(...)` wheel
  // sizing): measure the pane's actual pixel box and size the wheel off
  // whichever dimension is smaller, so the percentage always means that
  // fraction of the limiting axis and the wheel can never overflow
  // vertically.
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

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0 }}>

      {/* Radial background — public/chart-radial-new.png is a circle
          inscribed in a transparent square, so it's deliberately oversized
          (220% on each axis, independent of the pane's own aspect ratio)
          and centered on the wheel so its circular edge never falls inside
          the visible rectangle; the parent's `overflow: hidden` (set by
          DesktopNatal on the wrapper this renders into) does the actual
          cropping. */}
      <div style={{
        position: 'absolute',
        left: CENTER_LEFT,
        top: CENTER_TOP,
        width: '220%',
        height: '220%',
        transform: 'translate(-50%, -50%)',
        backgroundImage: 'url(/chart-radial-new.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Chart 101 */}
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

      {/* Wheel — not rendered until wheelSize is measured, avoiding a
          flash at the wrong (CSS-percentage) size. */}
      {wheelSize !== undefined && (
        <div style={{
          position: 'absolute',
          left: CENTER_LEFT,
          top: CENTER_TOP,
          width: wheelSize,
          height: wheelSize,
          transform: 'translate(-50%, -50%)',
        }}>
          <NatalChartWheelWeb chartData={chartData} birthTimeKnown={birthTimeKnown} size={wheelSize} />
        </div>
      )}

      {/* Name / birth data — collapse/expand on click, per
          docs/TEXTURE_LAYOUT_PROPORTIONS.md's name/birth-data band (Geist
          Mono, not Anton — a technical page). Bottom-anchored (per
          chart-dif.png: the birth-data line's bottom edge sits at a fixed
          position near the pane's true bottom; expanding pushes the name
          UP to make room for the birth-data line below it, rather than the
          name holding still and birth data appending downward). Dark text
          (var(--dark), the same color used for all body text on cream
          throughout the rest of the app — not the cream used elsewhere on
          dark backgrounds), per founder correction: at this larger circle
          size the text lands on the radial image's lighter outer band, not
          its dark center, so dark text is what actually reads there. */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-label={`${name}, ${expanded ? 'collapse' : 'show'} birth details`}
        style={{
          ...UNSTYLED_BUTTON,
          position: 'absolute',
          bottom: '3%',
          left: expanded ? '8%' : 0,
          right: expanded ? '8%' : 0,
          width: expanded ? undefined : '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: expanded ? 'flex-start' : 'center',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(20px, 2vw, 30px)',
          color: 'var(--dark)',
          letterSpacing: '0.5px',
        }}>
          {name}
        </div>

        {expanded && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            flexWrap: 'wrap',
            gap: '8px 32px',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 'clamp(13px, 1.4vw, 20px)',
            color: 'var(--dark-muted)',
            letterSpacing: '0.5px',
          }}>
            <span>{formattedDate}{birthTime ? `  ${birthTime}` : ''}</span>
            {birthLocation && <span>{birthLocation}</span>}
          </div>
        )}
      </button>

    </div>
  );
}
