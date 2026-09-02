'use client';

import { useEffect, useState } from 'react';
import PrePurchaseNavBar from './components/PrePurchaseNavBar';
import MorphBackgroundPlaceholder from './components/MorphBackgroundPlaceholder';
import HomeBirthChartPanel from './components/HomeBirthChartPanel';
import HomeMyChartFormPanel from './components/HomeMyChartFormPanel';
import MobileHomePage from './components/MobileHomePage';

// Pre-purchase home (home-two-panel-rebuild task, SPEC §16; refined further
// in the pre-purchase-home-refinements follow-up, SPEC §16). Same two-panel
// frame as the post-purchase home (app/components/HomeLayout.tsx), rebuilt
// here rather than reused directly: HomeLayout's NavBar needs a reading slug
// that doesn't exist before purchase, so this page uses PrePurchaseNavBar
// instead and otherwise shares the same CSS (.app-shell/.app-stage/
// .home-panels/.home-panel), except the cream inset, which uses this page's
// own .prepurchase-panel-slot (6.5%/8%) rather than the shared
// .home-panel-slot (2%/5%, still used by the post-purchase home) — no
// sticker labels here either, unlike post-purchase. Backgrounds are the
// post-purchase home's two images, swapped left/right (Avery's call): left
// panel gets /transits-background.png, right gets /sky-background.png — the
// inline `style` below overrides the class's own default image for each
// side. The order form (HomeOrderForm, inside HomeMyChartFormPanel) is the
// same working form that was previously inline on this page — unchanged
// behavior, only re-housed.
//
// Mobile branch (recover-old-mobile-home task, SPEC §16): the two-panel
// frame above is a fixed-height (100dvh), overflow:hidden container built
// for a no-scroll desktop app — it mis-renders on mobile widths. Below
// 1024px this page instead renders MobileHomePage, the recovered old
// single-column layout (git history, pre-Aug-16-2026) rebuilt with current
// copy. Same matchMedia('(min-width: 1024px)') pattern the reading pages
// use (app/reading/[slug]/natal/page.tsx, .../transits/page.tsx) — resolved
// in a useEffect so there's no server/client hydration mismatch; null (not
// yet measured) renders nothing.
export default function HomePage() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (isDesktop === null) return null;

  if (!isDesktop) return <MobileHomePage />;

  return (
    <div className="app-shell">
      <PrePurchaseNavBar />
      <main className="app-stage">
        <MorphBackgroundPlaceholder />
        <div className="home-panels">
          <div className="home-panel home-panel-left" style={{ backgroundImage: "url('/transits-background.png')" }}>
            <div className="prepurchase-panel-slot">
              <HomeBirthChartPanel />
            </div>
          </div>
          <div className="home-panel home-panel-right" style={{ backgroundImage: "url('/sky-background.png')" }}>
            <div className="prepurchase-panel-slot">
              <HomeMyChartFormPanel />
            </div>
          </div>
        </div>
        {/* Copyright, relocated off the nav onto the background itself
            (pre-purchase-home-refinements task, SPEC §16) — Privacy/Terms/
            Support live in the nav's corner instead (PrePurchaseNavBar). */}
        <span className="prepurchase-bg-copyright">© 2026 TEXTURE</span>
      </main>
    </div>
  );
}
