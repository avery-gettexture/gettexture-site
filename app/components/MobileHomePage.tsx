'use client';

// Mobile-specific pre-purchase home (recover-old-mobile-home task, SPEC
// §16). Desktop keeps the two-panel layout (HomeBirthChartPanel +
// HomeMyChartFormPanel inside app-shell/app-stage) — that frame is a
// fixed-height, overflow:hidden container built for a no-scroll desktop
// app, which doesn't work as a scrolling mobile page. This component is
// the recovered OLD single-column layout (git history, pre-Aug-16-2026
// two-panel rebuild) rebuilt with CURRENT copy: plain document flow (no
// app-shell), 4 sections in the order Avery specified plus the old
// layout's closing Approach section (restored per Avery's follow-up
// request, placed after the About section rather than after the form —
// the form was section 2 in this rebuild, not the last section it was in
// the old layout), reusing the same HomeOrderForm the desktop panel uses
// so purchase behavior is identical, and the old page's sticky-bottom-CTA
// scroll-listener pattern (here simplified to the one condition Avery
// specified: hidden while the form section is in view, sticky otherwise
// — the old file tracked 5 refs, this only needs the form section's own
// ref).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import HomeOrderForm from './HomeOrderForm';
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

const DARK = 'var(--dark)';
const DARK_MUTED = 'var(--dark-muted)';
const RED = 'var(--red-strong)';
const CREAM = 'var(--cream)';

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px',
  color: 'rgba(22,22,18,0.35)', letterSpacing: '2px', textTransform: 'uppercase',
  marginBottom: '20px',
};

export default function MobileHomePage() {
  const [stickyHidden, setStickyHidden] = useState(false);
  const formSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function checkVisibility() {
      const el = formSectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      setStickyHidden(inView);
    }
    window.addEventListener('scroll', checkVisibility, { passive: true });
    checkVisibility();
    return () => window.removeEventListener('scroll', checkVisibility);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM, color: DARK }}>
      {/* Own header rather than reusing PrePurchaseNavBar: that component
          renders with the `.nav-bar` class, which app/globals.css already
          force-hides below 1024px (mobile-nav-shell task) for the reading
          pages, which show MobileNavShell instead. `/` has no
          MobileNavShell (it needs a reading slug that doesn't exist
          pre-purchase), so reusing `.nav-bar` here would render nothing. */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', paddingTop: 'calc(16px + env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(22,22,18,0.08)',
      }}>
        <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '18px', color: RED, letterSpacing: '2px' }}>TEXTURE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '10px', color: 'rgba(22,22,18,0.30)', letterSpacing: '0.5px' }}>
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>PRIVACY</Link>
          <span>·</span>
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>TERMS</Link>
          <span>·</span>
          <a href="mailto:help@gettexture.app" style={{ color: 'inherit', textDecoration: 'none' }}>SUPPORT</a>
        </div>
      </header>

      {/* Section 1 — Take a closer look at your chart. */}
      <section style={{ padding: '40px 24px 32px' }}>
        <h1 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(26px, 8vw, 34px)', color: DARK, letterSpacing: '1px', lineHeight: 1.15, marginBottom: '16px' }}>
          Take a closer look at your chart.
        </h1>
        <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '15px', color: DARK_MUTED, lineHeight: 1.6, marginBottom: '28px' }}>
          {OPENER_PARAGRAPH}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          {FEATURES.map(({ label, text }) => (
            <div key={label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '0.5px solid rgba(22,22,18,0.08)' }}>
              <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: RED, letterSpacing: '1px', flexShrink: 0, paddingTop: '2px', minWidth: '96px' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '13px', color: DARK_MUTED, lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Dogfood stand-in per the brief — swap for the real sample reading later */}
          <a
            href={`/reading/${DOGFOOD_READING_SLUG}/natal`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: RED, letterSpacing: '1px', textDecoration: 'none' }}
          >
            see example
          </a>
          <a href="#description" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: RED, letterSpacing: '1px', textDecoration: 'none' }}>
            Full description ↓
          </a>
        </div>
      </section>

      {/* Section 2 — My Chart (order form) */}
      <section id="form" ref={formSectionRef} style={{ borderTop: '1.5px solid var(--red-rule)', padding: '40px 24px 48px' }}>
        <h2 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(24px, 7vw, 30px)', color: DARK, letterSpacing: '1px', marginBottom: '10px' }}>
          My Chart
        </h2>
        <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: DARK_MUTED, lineHeight: 1.6, marginBottom: '28px' }}>
          Please enter the following information so we can deliver your personalized report. This information is used to calculate the position of the planets in the sky relative to the time and place you were born. Accurate information ensures you receive the highest quality report, and cannot be updated once you complete payment, so please be sure to check your entries. You'll receive your reading link by email immediately after purchase.
        </p>
        <HomeOrderForm priceUsd={NATAL_READING_PRICE_USD} />
      </section>

      {/* Section 3 — About the reading (long description) */}
      <section id="description" style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '40px 24px' }}>
        <div style={sectionLabelStyle}>About the reading</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {DESCRIPTION_PARAGRAPHS.map((text, i) => (
            <p key={i} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: 'rgba(22,22,18,0.80)', lineHeight: 1.7 }}>{text}</p>
          ))}
        </div>
      </section>

      {/* Section 4 — About (What's Included / Placements Interpreted) */}
      <section style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '40px 24px' }}>
        <div style={sectionLabelStyle}>About</div>
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>What's included</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {WHATS_INCLUDED.map(item => (
              <li key={item} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '13px', color: DARK_MUTED, lineHeight: 1.5, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: RED, flexShrink: 0 }}>—</span>{item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Placements interpreted</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {PLACEMENTS_INTERPRETED.map(p => (
              <li key={p} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '13px', color: 'rgba(22,22,18,0.55)', lineHeight: 1.6 }}>{p}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 5 — Texture's Approach (restored per Avery's follow-up
          request, placed after the About section / at the bottom of the
          content, before the footer) */}
      <section style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '40px 24px 64px' }}>
        <div style={sectionLabelStyle}>Texture's approach</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {APPROACH_PARAGRAPHS.map((text, i) => (
            <p key={i} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: 'rgba(22,22,18,0.80)', lineHeight: 1.7 }}>{text}</p>
          ))}
          <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px', color: 'rgba(22,22,18,0.35)', lineHeight: 1.7, paddingTop: '16px', borderTop: '0.5px solid rgba(22,22,18,0.10)' }}>
            {APPROACH_METHOD_NOTE}
          </p>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '20px 24px 100px', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.25)', letterSpacing: '1px' }}>© 2026 TEXTURE</span>
      </footer>

      {/* Sticky "My Chart" CTA — hidden while the form section is in view */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          backgroundColor: CREAM,
          borderTop: '1px solid rgba(22,22,18,0.10)',
          zIndex: 50,
          display: stickyHidden ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <a
          href="#form"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px',
            color: CREAM, backgroundColor: RED, padding: '16px', textDecoration: 'none',
          }}
        >
          MY CHART →
        </a>
      </div>
    </div>
  );
}
