'use client';

// RIGHT panel of the pre-purchase home ("My Chart" — home-two-panel-rebuild
// task, SPEC §16; tightened in the pre-purchase-home-refinements follow-up,
// SPEC §16, to fit with ZERO scroll — Avery's non-negotiable constraint).
// Houses the site's one working order form (HomeOrderForm, extracted
// unchanged from the old single-column `/` page) on a cream rectangle.
// Title, intro paragraph, and the form now all sit in normal flow (no
// overflow/scroll anywhere in this panel) — text sizes and spacing here and
// in HomeOrderForm were shrunk specifically so the whole thing clears the
// panel's height at standard desktop sizes without scrolling.

import HomeOrderForm from './HomeOrderForm';
import { NATAL_READING_PRICE_USD } from '@/lib/config';

const DARK = 'var(--dark)';
const DARK_MUTED = 'var(--dark-muted)';

export default function HomeMyChartFormPanel() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--cream)', display: 'flex', flexDirection: 'column', padding: '4% 6%' }}>
      <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(21px, 3.4dvh, 32px)', color: DARK, letterSpacing: '1px', marginBottom: 'clamp(6px, 1dvh, 10px)' }}>
        My Chart
      </div>
      <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(11px, 1.55dvh, 15px)', color: DARK_MUTED, lineHeight: 1.5, marginBottom: 'clamp(6px, 1.4dvh, 14px)' }}>
        Please enter the following information so we can deliver your personalized report. This information is used to calculate the position of the planets in the sky relative to the time and place you were born. Accurate information ensures you receive the highest quality report, and cannot be updated once you complete payment, so please be sure to check your entries. You'll receive your reading link by email immediately after purchase.
      </p>

      <div style={{ borderTop: '1px solid var(--red-rule)', paddingTop: 'clamp(6px, 1.4dvh, 14px)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 1.1dvh, 12px)', color: 'rgba(22,22,18,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 'clamp(10px, 1.8dvh, 18px)' }}>
          my information
        </p>
        <HomeOrderForm priceUsd={NATAL_READING_PRICE_USD} />
      </div>
    </div>
  );
}
