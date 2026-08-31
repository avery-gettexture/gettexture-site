'use client';

import { useState, useRef, useEffect } from 'react';
import NatalChartWheelWeb from './NatalChartWheelWeb';
import { formatDate } from './BirthDataSection';

type ChartView = 'chart' | 'list';

interface ChartSectionProps {
  chartData: any;
  customerName: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  onScrollToPlanet?: (planetId: string) => void;
  activeViewOverride?: ChartView;
  onScrollNext?: () => void;
}

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  'north-node': '☊', 'south-node': '☋', ascendant: '↑', medium_coeli: '↑',
  mean_north_lunar_node: '☊', mean_south_lunar_node: '☋',
};

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈︎', Taurus: '♉︎', Gemini: '♊︎', Cancer: '♋︎',
  Leo: '♌︎', Virgo: '♍︎', Libra: '♎︎', Scorpio: '♏︎',
  Sagittarius: '♐︎', Capricorn: '♑︎', Aquarius: '♒︎', Pisces: '♓︎',
};

const SIGN_ABBR_MAP: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

// Nodes merged per SPEC §4.1 (14 -> 13 placements) into one combined
// reading, but shown here as its own North Node row PLUS a South Node row
// built alongside it below (SPEC §16, Aug 22 2026) — the single row this
// list used to show only ever displayed the North Node's own placement,
// dropping the South Node from the mobile list entirely. Both rows tap
// through to the same combined Nodes section.
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
];

const HOUSE_ORDINALS: Record<string, string> = {
  First_House: '1st', Second_House: '2nd', Third_House: '3rd',
  Fourth_House: '4th', Fifth_House: '5th', Sixth_House: '6th',
  Seventh_House: '7th', Eighth_House: '8th', Ninth_House: '9th',
  Tenth_House: '10th', Eleventh_House: '11th', Twelfth_House: '12th',
};

const SKY_BG = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sky-background.png';
const RADIAL_BG = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/chart-radial.png';

// Mobile nav shell (MobileNavShell.tsx) is a fixed 56px + safe-area-inset-top
// overlay bar. This page's own Chart|List toggle and content need to sit
// below it — same "overlay, not reserved space, each page pushes its own
// content down" fix already shipped for the standalone mobile Reference
// screen (SPEC §16, Aug 17 2026).
const NAV_ROW_TOP = 'calc(56px + env(safe-area-inset-top) - 4px)';
const CONTENT_TOP = 'calc(56px + env(safe-area-inset-top) + 24px)';

// Converts a stored "YYYY-MM-DD" birth date into a compact numeric form
// (e.g. "10/18/1997") — the narrower fallback used when the spelled date
// (formatDate, from BirthDataSection.tsx) doesn't fit the measured width.
// Mirrors docs/mocks/app-chart-screen.tsx's spelled/numeric degradation.
function formatDateNumeric(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
  }
  return dateStr;
}

// ── Birth data collapse/expand ───────────────────────────────────────────
// Ports the exact mechanic from docs/mocks/app-chart-screen.tsx (the proven
// native-app chart screen): collapsed shows just the name, centered; tap
// expands to name (left) + a date/time + location line below; tap again
// collapses. Also ports that file's three-tier graceful degradation —
// spelled date, falling back to numeric, falling back to a stacked
// location line — so long dates/locations don't overflow on narrow phones.
// The app measured this with a hardcoded character-width constant (no easy
// text measurement in React Native); the web version measures its actual
// container via ResizeObserver instead, the same pattern already used to
// size the wheel in NatalChartPane.tsx (desktop's own version of this same
// control). Shared by both ChartView and ListView below so birth data is
// reachable from either tab, themed dark (on the sky background) or light
// (on the cream list).
function BirthDataToggle({
  name,
  birthDate,
  birthTime,
  birthLocation,
  theme,
  extraTopPadding = 0,
  overlayExpand = false,
}: {
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  theme: 'dark' | 'light';
  // Extra breathing room above the collapsed name only (Chart tab's
  // wheel sits right above this control and the default padding hugs it
  // too tightly — List has no wheel above it, so it doesn't opt in).
  extraTopPadding?: number;
  // Chart tab only (SPEC §16, fix pass): keeps this control's own box a
  // fixed size and renders the expanded date/time/location as an
  // absolutely-positioned overlay below it instead of growing in place.
  // Without this, expanding pushed the wheel above it upward (the wheel's
  // region is a flex sibling that shrinks whenever this band grows). List
  // has nothing above it to shift, so it keeps the plain in-flow behavior.
  overlayExpand?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dateSpelled = birthDate ? formatDate(birthDate) : '';
  const dateNumeric = birthDate ? formatDateNumeric(birthDate) : '';
  const timePart = birthTime ? `  ${birthTime}` : '';

  const CHAR_W = 7.4; // approx px/char for the 12px Geist Mono birth-data line
  const maxChars = width > 0 ? Math.floor(width / CHAR_W) : Infinity;
  const singleLineSpelled = `${dateSpelled}${timePart}    ${birthLocation}`;
  const singleLineNumeric = `${dateNumeric}${timePart}    ${birthLocation}`;
  const useNumericDate = singleLineSpelled.length > maxChars;
  const stackLocation = useNumericDate && singleLineNumeric.length > maxChars;
  const birthDateStr = useNumericDate ? dateNumeric : dateSpelled;

  const nameColor = theme === 'dark' ? 'rgba(253,245,237,0.85)' : '#161612';
  const dataColor = theme === 'dark' ? 'rgba(253,245,237,0.45)' : 'rgba(22,22,18,0.45)';

  const dataLineStyle = { fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 12px)', color: dataColor, letterSpacing: '0.5px' } as const;
  const stacked = !overlayExpand && expanded;

  return (
    <div
      ref={containerRef}
      onClick={() => setExpanded(e => !e)}
      style={{
        width: '100%',
        minHeight: '52px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: stacked ? 'stretch' : 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: stacked ? '10px 24px' : `${10 + extraTopPadding}px 24px 10px`,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 'clamp(14px, 3.8vw, 16px)',
        color: nameColor,
        letterSpacing: '1px',
        textAlign: stacked ? 'left' : 'center',
      }}>
        {name}
      </div>

      {stacked && (stackLocation ? (
        <>
          <div style={dataLineStyle}>{birthDateStr}{timePart}</div>
          {!!birthLocation && <div style={dataLineStyle}>{birthLocation}</div>}
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span style={dataLineStyle}>{birthDateStr}{timePart}</span>
          {!!birthLocation && <span style={dataLineStyle}>{birthLocation}</span>}
        </div>
      ))}

      {/* Chart tab (overlayExpand): expanded detail renders as an overlay
          below the fixed-size name row, instead of growing it, so the
          wheel above never shifts (see prop comment above). */}
      {overlayExpand && expanded && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          padding: '6px 24px 10px',
          display: 'flex',
          flexDirection: stackLocation ? 'column' : 'row',
          alignItems: stackLocation ? 'center' : 'flex-start',
          justifyContent: stackLocation ? 'flex-start' : 'center',
          gap: stackLocation ? '2px' : '16px',
        }}>
          <span style={dataLineStyle}>{birthDateStr}{timePart}</span>
          {!!birthLocation && <span style={dataLineStyle}>{birthLocation}</span>}
        </div>
      )}
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────

function ListView({
  chartData,
  onScrollToPlanet,
  customerName,
  birthDate,
  birthTime,
  birthLocation,
}: {
  chartData: any;
  onScrollToPlanet?: (planetId: string) => void;
  customerName: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
}) {
  const subject = chartData?.subject;
  if (!subject) return null;

  const planets = PLANET_ORDER
    .flatMap(p => {
      const data = subject[p.key];
      if (!data) return [];
      const sign = SIGN_ABBR_MAP[data.sign] ?? data.sign ?? '';
      const degree = data.position != null ? Math.floor(data.position) : 0;
      const house = ['ascendant', 'medium_coeli'].includes(p.key) ? null : HOUSE_ORDINALS[data.house] ?? null;
      const row = {
        key: p.key, label: p.label,
        glyph: PLANET_GLYPHS[p.glyphKey] ?? '○',
        sign, signGlyph: SIGN_GLYPHS[sign] ?? '',
        degree, house,
        // Nodes always move backward by nature — "retrograde" is
        // meaningless for them, so no R flag here (matches the desktop
        // rail and the homepage My Chart panel, which special-case this
        // the same way; SPEC §16).
        retrograde: p.key === 'mean_north_lunar_node' ? false : (data.retrograde ?? false),
      };
      // South Node row (SPEC §16, Aug 22 2026): built right after North
      // Node's, reading the axis's other end from chart_data directly —
      // this list previously had no row for it at all. Tapping it opens
      // the same combined Nodes section North Node's row opens (see
      // mean_south_lunar_node in natal/page.tsx's PLANET_TO_INDEX).
      if (p.key !== 'mean_north_lunar_node') return [row];
      const southData = subject.mean_south_lunar_node;
      if (!southData) return [row];
      const southSign = SIGN_ABBR_MAP[southData.sign] ?? southData.sign ?? '';
      return [row, {
        key: 'mean_south_lunar_node', label: 'South Node',
        glyph: PLANET_GLYPHS.mean_south_lunar_node ?? '○',
        sign: southSign, signGlyph: SIGN_GLYPHS[southSign] ?? '',
        degree: southData.position != null ? Math.floor(southData.position) : 0,
        house: HOUSE_ORDINALS[southData.house] ?? null,
        retrograde: false,
      }];
    });

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: '#FDF5ED',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header — compact, close to nav */}
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
          Placements
        </div>
      </div>

      {/* Planet rows — no scroll, use space-evenly to fill */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        padding: '0',
      }}>
        {planets.map((planet, index) => (
          <div
            key={planet.key}
            onClick={() => onScrollToPlanet?.(planet.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              borderBottom: index < planets.length - 1 ? '0.5px solid rgba(22,22,18,0.10)' : 'none',
              cursor: onScrollToPlanet ? 'pointer' : 'default',
              flex: 1,
            }}
          >
            <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3vw, 14px)', color: 'rgba(22,22,18,0.45)', width: '20px', flexShrink: 0 }}>{planet.glyph}</span>
            <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3.2vw, 14px)', color: '#161612', letterSpacing: '-0.2px', flex: 1 }}>{planet.label}</span>
            <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 3.2vw, 14px)', color: '#161612', letterSpacing: '-0.2px', marginRight: '4px' }}>{planet.sign}</span>
            <span style={{ fontSize: 'clamp(10px, 2.8vw, 12px)', color: 'rgba(22,22,18,0.45)', marginRight: '6px' }}>{planet.signGlyph}</span>
            <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 2.6vw, 12px)', color: 'rgba(22,22,18,0.55)', marginRight: '4px' }}>{planet.degree}°</span>
            {planet.house && <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(9px, 2.4vw, 11px)', color: 'rgba(22,22,18,0.35)', marginRight: '4px' }}>{planet.house}</span>}
            {planet.retrograde && <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(9px, 2.4vw, 11px)', color: 'rgba(185,18,18,0.75)', letterSpacing: '1px' }}>R</span>}
          </div>
        ))}
      </div>

      {/* Birth data — same collapse/expand control as Chart view, so birth
          data is reachable from List too (previously only viewable on the
          removed standalone Birth Data screen). Red rule above (not below)
          the name — founder correction, Aug 30 2026, SPEC §16: matches the
          rest of the app's convention of a red line sitting above the
          content it introduces, replacing the old below-the-name rule that
          used to sit at this panel's outer bottom edge instead. */}
      <div style={{ flexShrink: 0, borderTop: '1.5px solid rgba(185,18,18,0.50)' }}>
        <BirthDataToggle name={customerName} birthDate={birthDate} birthTime={birthTime} birthLocation={birthLocation} theme="light" />
      </div>
    </div>
  );
}

// ── Chart View ────────────────────────────────────────────────────────────

function ChartView({
  chartData,
  birthTimeKnown,
  customerName,
  birthDate,
  birthTime,
  birthLocation,
}: {
  chartData: any;
  birthTimeKnown: boolean;
  customerName: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Wheel — bottom-anchored within the remaining space above the
          name band, instead of centered (SPEC §16, fix pass: centering
          left a large, variable void between the wheel and the name).
          The wheel-plus-glow unit is wrapped in its own relative box sized
          exactly to the wheel's diameter (unchanged formula, not enlarged)
          so the radial glow stays centered on the wheel itself regardless
          of where that unit sits in the region — previously the glow was
          centered by the same flex alignment as the wheel, which broke
          once that alignment became bottom-anchored instead of centered. */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{
          position: 'relative',
          width: 'min(calc(100dvh - 260px), calc(100vw - 24px), 62dvh)',
          aspectRatio: '1',
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
            <NatalChartWheelWeb chartData={chartData} birthTimeKnown={birthTimeKnown} />
          </div>
        </div>
      </div>

      {/* Fixed, short gap so the name sits comfortably close under the
          wheel rather than floating in empty space (SPEC §16, fix pass). */}
      <div style={{ height: '16px', flexShrink: 0 }} />

      {/* Birth data — collapsed default (name only), tap to expand. No red
          rule here: the red-line-above-name treatment is List-only, not
          the chart-wheel views (SPEC §16, fix pass — corrects the prior
          pass, which had applied it here too). `overlayExpand` keeps this
          band's own box a fixed size when tapped, so the wheel above never
          shifts (see BirthDataToggle's prop comment). `position: relative`
          here is load-bearing, not decorative: the wheel's radial glow
          above is `position: absolute`, and CSS paints all positioned
          elements above plain static ones regardless of DOM order — with
          the gap now closed, the (unchanged, deliberately oversized) glow
          reaches down into this band and would otherwise wash out the name
          text. Making this band positioned too puts it in the same paint
          layer as the glow, where later DOM order (this band, after the
          wheel) wins and the text renders on top instead. */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <BirthDataToggle name={customerName} birthDate={birthDate} birthTime={birthTime} birthLocation={birthLocation} theme="dark" extraTopPadding={14} overlayExpand />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function ChartSection({
  chartData,
  customerName,
  birthDate,
  birthTime,
  birthLocation,
  onScrollToPlanet,
  activeViewOverride,
  onScrollNext,
}: ChartSectionProps) {
  const [activeView, setActiveView] = useState<ChartView>('chart');
  const currentView = activeViewOverride ?? activeView;
  const isLight = currentView === 'list';

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: isLight ? '#FDF5ED' : '#0e0c1a',
      backgroundImage: isLight ? '' : `url(${SKY_BG})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>

      {/* Nav — Chart | List only. Pushed below the fixed mobile nav bar
          (MobileNavShell, 56px + safe-area-inset-top) — that bar already
          renders this page's one TEXTURE wordmark (top-right), so no
          second one is rendered here. Left-anchored, pipe-divided group
          (spacing-cleanup task) — matches the desktop toggle convention
          already used by HomeMyChartPanel/HomeTodaySkyPanel, instead of
          the old full-width Chart-far-left/List-far-right spread. */}
      <div style={{
        position: 'absolute', top: NAV_ROW_TOP, left: 0, right: 0,
        display: 'flex', paddingLeft: '20px', paddingRight: '20px', zIndex: 20,
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['chart', 'list'] as ChartView[]).map((view, i) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 'clamp(13px, 3.5vw, 16px)',
                letterSpacing: '1px',
                color: currentView === view
                  ? (isLight ? '#161612' : 'rgba(253,245,237,1)')
                  : (isLight ? 'rgba(22,22,18,0.35)' : 'rgba(253,245,237,0.35)'),
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 0', textTransform: 'capitalize',
                fontWeight: currentView === view ? 'bold' : 'normal',
                borderLeft: i > 0 ? `1px solid ${isLight ? 'rgba(22,22,18,0.20)' : 'rgba(253,245,237,0.30)'}` : 'none',
                paddingLeft: i > 0 ? '10px' : '0',
              }}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', top: CONTENT_TOP, bottom: '36px', left: 0, right: 0 }}>
        {currentView === 'chart' && (
          <ChartView
            chartData={chartData}
            birthTimeKnown={!!chartData}
            customerName={customerName}
            birthDate={birthDate}
            birthTime={birthTime}
            birthLocation={birthLocation}
          />
        )}
        {currentView === 'list' && (
          <ListView
            chartData={chartData}
            onScrollToPlanet={onScrollToPlanet}
            customerName={customerName}
            birthDate={birthDate}
            birthTime={birthTime}
            birthLocation={birthLocation}
          />
        )}
      </div>

      {/* Arrow */}
      <button
        onClick={onScrollNext}
        style={{
          position: 'absolute',
          bottom: isLight ? '0.2%' : '0.8%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: '18px',
          color: isLight ? 'rgba(22,22,18,0.35)' : 'rgba(253,245,237,0.50)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 16px',
          zIndex: 30,
        }}
      >
        ↓
      </button>

    </div>
  );
}
