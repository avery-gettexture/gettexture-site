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
// instead — title capped (and kept single-line via whiteSpace:nowrap) so it
// doesn't wrap and eat the content region's height budget; paragraph/feature
// sizes tuned so the short-state content's natural height sits just under
// the available flex region at 1280×800 (the narrowest common desktop
// width tested — narrower panels wrap text into more lines at a given font
// size, which was the actual overflow driver, not viewport height). Verified
// with no overflow at 1280×800, 1366×768, 1440×900, 1920×1080.

import { useState } from 'react';
import { DOGFOOD_READING_SLUG, NATAL_READING_PRICE_USD } from '@/lib/config';

type ContentState = 'short' | 'long' | 'approach';

const DARK = 'var(--dark)';
const DARK_MUTED = 'var(--dark-muted)';
const RED = 'var(--red-strong)';

const FEATURES = [
  { label: '13 Placements', text: 'Sun, moon, rising, and all major planets, bodies and points interpreted in full.' },
  { label: '~6,500 Words', text: 'Explore the depth your chart has to offer with ~500 words of unique copy for each placement, written for only you.' },
  { label: 'Full Context', text: 'Interpretations written to reflect that your chart is more than the sum of its parts. Sign, house, degree, aspects, and motion are considered for every placement.' },
  { label: 'Permanent URL', text: 'Your reading lives at a unique link. Save it, revisit it, share it anytime.' },
  { label: 'Education', text: 'Reference material throughout to define all major astrological terms.' },
];

const DESCRIPTION_PARAGRAPHS = [
  'A chart is a woven system. Your placements are the threads, but how they interact creates the texture. This reading reflects that nuance — sign, house, degree, aspects, and motion are all considered, so your placements are read in context, not isolation.',
  'The report you\'ll receive is irreducibly specific to your chart. Your Sun at 29 degrees Leo in your 10th house, with a square to Saturn is different than a Sun in Leo in a different house, at a different degree, or with different aspects. If you\'re interested in astrology, and curious about what insights more specific reading could offer beyond an isolated planet in sign or planet in house interpretation, this report will surface the nuance you\'re looking for.',
  'Astrology resonates when it gets precise, and this report honors that precision. Factors like sign, house, degree, motion, and aspects push and pull on planets to shift what they mean for you. A planet in its home sign might be complicated by the house it\'s in or the aspects pulling against it, or a planet in a challenging sign might be supported by house or aspects. This reading illuminates the unique character of your chart for you to reflect on, consider, and sit with.',
  'This report is written to deliver a felt sense of your chart regardless of your experience with astrology — you do not need to be fluent in astrological terms to understand it. There are reference sections on each placement to define the planet, sign, house, degree, motion, and aspects referenced in the interpretation, as well as a complete reference section at the end with all terms defined.',
];

const WHATS_INCLUDED = [
  'Birth chart wheel (Whole Sign house system)',
  'Full placements list',
  '~500 words of interpretation per placement',
  '~6,500 words of personalized content total',
  'Reference sections throughout',
  'Complete reference dictionary',
];

const PLACEMENTS_INTERPRETED = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus',
  'Neptune', 'Pluto', 'Rising Sign / Ascendant', 'Midheaven', 'Nodes',
];

const APPROACH_PARAGRAPHS = [
  "Astrology describes patterns. It does not dictate them. Nothing is written as a verdict about who you are or what will happen — it's a description of tendencies, qualities, and the ways energy characteristically moves in your chart. What you recognize, what you set aside, and what you do with any of it is entirely yours. The most useful way to read this report is as a mirror, not a map of a fixed destination.",
];

const APPROACH_METHOD_NOTE = 'A note on method: astrology is a tradition thousands of years in the making. The interpretations here were generated by a language model trained on that body of knowledge and directed at the specific configuration of your chart, calculated using the Whole Sign house system.';

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
        <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(22px, 3.6dvh, 32px)', color: DARK, letterSpacing: '1px', lineHeight: 1.15, marginBottom: 'clamp(6px, 1dvh, 10px)', whiteSpace: 'nowrap' }}>
          Take a closer look at your chart.
        </div>
      </div>

      {/* Content region — the only part that swaps */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {state === 'short' && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(12px, 1.7dvh, 15px)', color: DARK_MUTED, lineHeight: 1.5, marginBottom: 'clamp(7px, 1dvh, 11px)' }}>
              Your chart is a woven system of planets, signs, houses, and aspects pushing and pulling on each other in ways unique to you. The more of it you explore, and the more context you hold, the more you&apos;ll start to recognize. This reading walks you through the nuance of your chart, so you can sit with the detail and find what it means to you.
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
