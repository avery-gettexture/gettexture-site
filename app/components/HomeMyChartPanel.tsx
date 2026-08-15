'use client';

// LEFT panel of the post-purchase home ("My Chart" — SPEC §16, post-purchase
// home build). Reuses the natal page's own building blocks (PLACEMENTS,
// glyph maps, getPlanetMeta, the Reading shape) rather than duplicating them
// — see the named exports added to app/reading/[slug]/natal/page.tsx for
// this purpose. Sits on the dark /sky-background.png the panel frame
// (HomeLayout/.home-panel-left) already paints, so all text here is
// light-on-dark, matching the mock (docs/mocks/homepage-variants.png).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import NatalChartWheelWeb from './NatalChartWheelWeb';
import { formatDate } from './BirthDataSection';
import {
  PLACEMENTS,
  type Reading,
  RAIL_PLANET_GLYPHS,
  RAIL_SIGN_GLYPHS,
  getPlanetMeta,
} from '@/app/reading/[slug]/natal/page';

// Row icons — planet-PNG assets, new to this build (docs/mocks/
// homepage-variants.png shows them; no existing component used these files
// before now, confirmed by repo search). Ascendant/Midheaven/Nodes have no
// PNG asset; per Avery's call those three rows render glyph-only, no icon.
const PLACEMENT_ICON: Partial<Record<string, string>> = {
  sun: '/sun.png', moon: '/moon.png', mercury: '/mercury.png', venus: '/venus.png',
  mars: '/mars.png', jupiter: '/jupiter.png', saturn: '/saturn.png', uranus: '/uranus.png',
  neptune: '/neptune.png', pluto: '/pluto.png',
};

type PaneMode = 'list' | 'chart';

const LIGHT = 'var(--cream)';
const LIGHT_MUTED = 'rgba(253,245,237,0.55)';
const LIGHT_FAINT = 'rgba(253,245,237,0.35)';

export default function HomeMyChartPanel({ slug }: { slug: string }) {
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [paneMode, setPaneMode] = useState<PaneMode>('list');
  // Name/birth-data tap mechanic — same interaction shape as
  // NatalChartPane.tsx's expanded state (click name, toggle, birth data
  // slides in below), adapted here for a top-left anchor instead of that
  // component's bottom-center one. Flagged for Avery's visual sign-off.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchReading() {
      const { data, error } = await supabase
        .rpc('get_reading_by_slug', { p_slug: slug })
        .single();
      if (!error && data) setReading(data as Reading);
      setLoading(false);
    }
    fetchReading();
  }, [slug]);

  if (loading || !reading) {
    return (
      <p className="placeholder-text" style={{ color: LIGHT_FAINT }}>
        {loading ? 'Loading…' : 'Reading not found.'}
      </p>
    );
  }

  const customerName = reading.name ?? '';
  const formattedBirthDate = formatDate(reading.birth_date);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

      {/* Header ~14% */}
      <div style={{ flex: '0 0 14%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: expanded ? '2px' : '10px' }}>
          <span style={{
            fontFamily: 'var(--font-anton), sans-serif',
            fontSize: expanded ? 'clamp(20px, 2.2vw, 26px)' : 'clamp(26px, 2.8vw, 34px)',
            color: LIGHT,
            letterSpacing: '1px',
            lineHeight: 1,
            transition: 'font-size 0.2s ease',
          }}>
            {customerName}
          </span>
          {expanded && (
            <span style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 'clamp(11px, 1vw, 13px)',
              color: LIGHT_MUTED,
              letterSpacing: '0.5px',
            }}>
              {formattedBirthDate}{reading.birth_time ? `  ${reading.birth_time}` : ''}
              {reading.birth_location ? `  ·  ${reading.birth_location}` : ''}
            </span>
          )}
        </div>

        {/* List | Chart toggle — swaps the body in place, no navigation. */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '12px' }}>
          {(['list', 'chart'] as PaneMode[]).map((m, i) => (
            <span
              key={m}
              onClick={() => setPaneMode(m)}
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: paneMode === m ? 'clamp(12px, 1vw, 14px)' : 'clamp(11px, 0.9vw, 13px)',
                fontWeight: paneMode === m ? 700 : 400,
                color: paneMode === m ? 'rgba(253,245,237,1)' : LIGHT_FAINT,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                borderLeft: i > 0 ? '1px solid rgba(253,245,237,0.30)' : 'none',
                paddingLeft: i > 0 ? '10px' : '0',
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {paneMode === 'list' ? (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {PLACEMENTS.map(placement => {
              const meta = getPlanetMeta(reading.chart_data, placement.id);
              const icon = PLACEMENT_ICON[placement.id];
              return (
                <div key={placement.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  borderBottom: '0.5px solid rgba(253,245,237,0.12)',
                  padding: '10px 0',
                }}>
                  <div style={{
                    width: '26px', height: '26px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden',
                    background: icon ? 'transparent' : 'rgba(253,245,237,0.08)',
                    display: icon ? undefined : 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon
                      ? <img src={icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '13px', color: LIGHT_MUTED }}>{RAIL_PLANET_GLYPHS[placement.id] ?? '○'}</span>}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(12px, 1vw, 14px)', color: LIGHT }}>
                      <span>{RAIL_PLANET_GLYPHS[placement.id] ?? '○'}</span>
                      <span>{placement.name}</span>
                      <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.85em', color: LIGHT_MUTED }}>{meta.degree}</span>
                      {meta.retrograde && <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.8em', color: 'var(--red-strong)' }}>R</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 0.9vw, 13px)', color: LIGHT_MUTED }}>
                      <span>{RAIL_SIGN_GLYPHS[meta.sign] ?? ''}</span>
                      <span>{meta.sign}</span>
                      {meta.house && <span>· {meta.house}</span>}
                    </div>
                  </div>
                  {/* Sideways caret — the only link on the row, to that
                      placement's own body on the natal page. */}
                  <Link
                    href={`/reading/${slug}/natal?open=${placement.id}`}
                    style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '18px', color: LIGHT_FAINT, textDecoration: 'none', flexShrink: 0, padding: '2px 4px' }}
                  >
                    ›
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '85%', aspectRatio: '1' }}>
              <NatalChartWheelWeb chartData={reading.chart_data} birthTimeKnown={reading.birth_time_known} />
            </div>
          </div>
        )}
      </div>

      {/* Footer ~13% */}
      <div style={{ flex: '0 0 13%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <Link href={`/reading/${slug}/natal?open=sun`} style={footerBtnStyle}>Read</Link>
        <Link href={`/reading/${slug}/reference`} style={footerBtnStyle}>Learn</Link>
      </div>
    </div>
  );
}

const footerBtnStyle: React.CSSProperties = {
  flex: 1,
  textAlign: 'center',
  padding: '10px 0',
  border: '1px solid rgba(253,245,237,0.30)',
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 'clamp(12px, 1vw, 14px)',
  letterSpacing: '0.5px',
  color: LIGHT,
  textDecoration: 'none',
};
