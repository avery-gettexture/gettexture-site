import PrePurchaseNavBar from './components/PrePurchaseNavBar';
import MorphBackgroundPlaceholder from './components/MorphBackgroundPlaceholder';
import HomeBirthChartPanel from './components/HomeBirthChartPanel';
import HomeMyChartFormPanel from './components/HomeMyChartFormPanel';

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
export default function HomePage() {
  return (
    <div className="app-shell">
      <PrePurchaseNavBar />
      <div className="app-stage">
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
      </div>
    </div>
  );
}
