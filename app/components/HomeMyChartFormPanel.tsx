'use client';

// RIGHT panel of the pre-purchase home ("My Chart" — home-two-panel-rebuild
// task, SPEC §16). Houses the site's one working order form (HomeOrderForm,
// extracted unchanged from the old single-column `/` page) on a cream
// rectangle, matching the "cream rectangle on each panel" instruction. Title
// and intro paragraph are fixed; the form region below scrolls in place if
// it runs taller than the panel (same contained-scroll pattern as the
// post-purchase home panels: overflow-y auto between two red rules).

import HomeOrderForm from './HomeOrderForm';
import { NATAL_READING_PRICE_USD } from '@/lib/config';

const DARK = 'var(--dark)';
const DARK_MUTED = 'var(--dark-muted)';

export default function HomeMyChartFormPanel() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--cream)', display: 'flex', flexDirection: 'column', padding: '0 6%' }}>
      <div style={{ flex: '0 0 auto', paddingTop: '6%' }}>
        <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(24px, 2.6vw, 34px)', color: DARK, letterSpacing: '1px', marginBottom: '10px' }}>
          My Chart
        </div>
        <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(13px, 1.05vw, 15px)', color: DARK_MUTED, lineHeight: 1.65, marginBottom: '4px' }}>
          Please enter the following information so we can deliver your personalized report. This information is used to calculate the position of the planets in the sky relative to the time and place you were born. Accurate information ensures you receive the highest quality report, and cannot be updated once you complete payment, so please be sure to check your entries. You'll receive your reading link by email immediately after purchase.
        </p>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
        borderTop: '1px solid var(--red-rule)', marginTop: '5%', paddingTop: '5%', paddingBottom: '6%',
      }}>
        <HomeOrderForm priceUsd={NATAL_READING_PRICE_USD} />
      </div>
    </div>
  );
}
