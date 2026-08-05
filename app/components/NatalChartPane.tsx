'use client';

import { useState } from 'react';
import Link from 'next/link';
import NatalChartWheelWeb from './NatalChartWheelWeb';
import { formatDate } from './BirthDataSection';

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
}

export default function NatalChartPane({
  chartData,
  birthTimeKnown,
  name,
  birthDate,
  birthTime,
  birthLocation,
}: NatalChartPaneProps) {
  const [expanded, setExpanded] = useState(false);
  const formattedDate = formatDate(birthDate);

  // Wheel center — proportions per docs/TEXTURE_LAYOUT_PROPORTIONS.md's
  // CHART VIEW section (wheel ~62% of the pane width, center ~44% down),
  // cross-checked against docs/mocks/natal-wheel-collapsed.png /
  // -expanded.png. Both the background and the wheel anchor to this same
  // point so the radial gradient blooms centered behind the wheel.
  const CENTER_LEFT = '50%';
  const CENTER_TOP = '44%';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>

      {/* Radial background — public/chart-radial-new.png is a circle
          inscribed in a transparent square, so it's deliberately oversized
          (220% on each axis, independent of the pane's own aspect ratio)
          and centered on the wheel so its circular edge never falls inside
          the visible rectangle; the parent .reading-zone-card's
          `overflow: hidden` does the actual cropping. */}
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
      <Link href="/reference" style={{
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

      {/* Wheel */}
      <div style={{
        position: 'absolute',
        left: CENTER_LEFT,
        top: CENTER_TOP,
        width: '62%',
        aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
      }}>
        <NatalChartWheelWeb chartData={chartData} birthTimeKnown={birthTimeKnown} />
      </div>

      {/* Name / birth data — collapse/expand on click, per
          docs/TEXTURE_LAYOUT_PROPORTIONS.md's name/birth-data band (Geist
          Mono, not Anton — a technical page). Top-anchored (not
          bottom-anchored) so the name's vertical position stays fixed
          between states; only the birth-data line adds height below it. */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          position: 'absolute',
          top: '82%',
          left: expanded ? '8%' : 0,
          right: expanded ? '8%' : 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: expanded ? 'flex-start' : 'center',
          gap: '10px',
          cursor: 'pointer',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(20px, 2vw, 30px)',
          color: 'rgba(253,245,237,0.95)',
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
            color: 'rgba(253,245,237,0.55)',
            letterSpacing: '0.5px',
          }}>
            <span>{formattedDate}{birthTime ? `  ${birthTime}` : ''}</span>
            {birthLocation && <span>{birthLocation}</span>}
          </div>
        )}
      </div>

    </div>
  );
}
