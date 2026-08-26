'use client';

// LEFT panel of the pre-purchase home ("Birth Chart" — home-two-panel-rebuild
// task, SPEC §16). Title and footer are fixed; only the content region
// between them swaps across three states (short / long / approach), all
// copy pulled verbatim from the old single-column `/` page except the two
// named edits (13 Placements, Nodes consolidation, "reference dictionary").
// Sits on a cream card (per Avery's "cream rectangle on each panel"
// instruction), unlike the post-purchase My Chart panel's light-on-dark
// treatment — this page has no post-purchase equivalent to match there.
//
// Type sizing (fill-the-frame pass, SPEC §16): the prior refinements pass
// shrank text purely to guarantee zero scroll, leaving tiny type stranded in
// a mostly-empty card. Sizes here are set to comfortably fill the card
// instead; paragraph/feature sizes tuned so the short-state content's
// natural height sits just under the available flex region at 1280×800
// (the narrowest common desktop width tested — narrower panels wrap text
// into more lines at a given font size, which was the actual overflow
// driver, not viewport height). Verified with no overflow at 1280×800,
// 1366×768, 1440×900, 1920×1080.
//
// Layout bug fix (SPEC §16): the title previously had whiteSpace:nowrap,
// which clipped it instead of wrapping on narrow widths — removed so it
// wraps naturally. The short-state content box previously used
// justifyContent:center, which centers overflowing content symmetrically
// above and below, making the top of the paragraph unreachable by scroll
// once the box got tall enough to need one — changed to flex-start so the
// content always starts at its top edge.

import { useState } from 'react';
import { DOGFOOD_READING_SLUG, NATAL_READING_PRICE_USD } from '@/lib/config';
import {
  OPENER_PARAGRAPH,
  FEATURES,
  DESCRIPTION_PARAGRAPHS,
  WHATS_INCLUDED,
  PLACEMENTS_INTERPRETED,
  APPROACH_PARAGRAPHS,
  APPROACH_METHOD_NOTE,
} from './homeContent';

type ContentState = 'short' | 'long' | 'approach';

const DARK = 'var(--dark)';
const DARK_MUTED = 'var(--dark-muted)';
const RED = 'var(--red-strong)';

const scrollBoxStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, overflowY: 'auto', overscrollBehavior: 'contain',
  borderTop: '1px solid var(--red-rule)', borderBottom: '1px solid var(--red-rule)',
  padding: '14px 0',
};

const footerLinkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 'clamp(13px, 1.15vw, 16px)',
  letterSpacing: '0.5px',
  color: RED,
  textDecoration: 'underline',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 0,
};

export default function HomeBirthChartPanel() {
  const [state, setState] = useState<ContentState>('short');

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--cream)', display: 'flex', flexDirection: 'column', padding: '0 6%' }}>

      {/* Title — fixed across all states. Sized/spaced off viewport HEIGHT
          (dvh), not width, so it — and the short-state content below —
          actually shrinks on a shorter desktop window instead of staying a
          fixed size while the panel itself shrinks with it (the cause of a
          real overflow found on a 1366×768 screen, pre-purchase-home-
          refinements task, SPEC §16: the "no scroll" rule applies to this
          panel's default view too, not just the right panel's form). */}
      <div style={{ flex: '0 0 auto', paddingTop: 'clamp(8px, 2.6dvh, 28px)' }}>
        <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(22px, 3.6dvh, 32px)', color: DARK, letterSpacing: '1px', lineHeight: 1.15, marginBottom: 'clamp(6px, 1dvh, 10px)' }}>
          Take a closer look at your chart.
        </div>
      </div>

      {/* Content region — the only part that swaps */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {state === 'short' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(12px, 1.7dvh, 15px)', color: DARK_MUTED, lineHeight: 1.5, marginBottom: 'clamp(7px, 1dvh, 11px)' }}>
              {OPENER_PARAGRAPH}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.05dvh, 13px)' }}>
              {FEATURES.map(({ label, text }) => (
                <div key={label} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', paddingBottom: 'clamp(6px, 0.85dvh, 9px)', borderBottom: '0.5px solid rgba(22,22,18,0.08)' }}>
                  <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 1.2dvh, 12px)', color: RED, letterSpacing: '1px', flexShrink: 0, paddingTop: '2px', minWidth: '104px' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 1.5dvh, 14px)', color: DARK_MUTED, lineHeight: 1.48 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state === 'long' && (
          <div style={scrollBoxStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {DESCRIPTION_PARAGRAPHS.map((text, i) => (
                <p key={i} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: DARK_MUTED, lineHeight: 1.7 }}>{text}</p>
              ))}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>What's included</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {WHATS_INCLUDED.map(item => (
                  <li key={item} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '13px', color: DARK_MUTED, lineHeight: 1.5, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: RED, flexShrink: 0 }}>—</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Placements interpreted</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {PLACEMENTS_INTERPRETED.map(p => (
                  <li key={p} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '12px', color: 'rgba(22,22,18,0.55)', lineHeight: 1.6 }}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {state === 'approach' && (
          <div style={scrollBoxStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {APPROACH_PARAGRAPHS.map((text, i) => (
                <p key={i} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: DARK_MUTED, lineHeight: 1.7 }}>{text}</p>
              ))}
              <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px', color: 'rgba(22,22,18,0.35)', lineHeight: 1.7, paddingTop: '14px', borderTop: '0.5px solid rgba(22,22,18,0.10)' }}>
                {APPROACH_METHOD_NOTE}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer — fixed across all states */}
      <div style={{ flex: '0 0 auto', paddingTop: 'clamp(10px, 2.2dvh, 22px)', paddingBottom: 'clamp(10px, 2.2dvh, 22px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <button onClick={() => setState(state === 'short' ? 'long' : 'short')} style={footerLinkStyle}>
            {state === 'short' ? 'read more' : 'overview'}
          </button>
          <a
            href={`/reading/${DOGFOOD_READING_SLUG}/natal`}
            target="_blank"
            rel="noopener noreferrer"
            style={footerLinkStyle}
          >
            see example
          </a>
          <button onClick={() => setState('approach')} style={footerLinkStyle}>
            approach
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(18px, 1.8vw, 22px)', color: DARK, letterSpacing: '0.5px' }}>Birth Chart</span>
          <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(22px, 2.3vw, 27px)', color: RED, letterSpacing: '0.5px' }}>${NATAL_READING_PRICE_USD}</span>
        </div>
      </div>
    </div>
  );
}
