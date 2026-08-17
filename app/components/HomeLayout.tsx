import NavBar from './NavBar';
import MobileNavShell from './MobileNavShell';
import MorphBackgroundPlaceholder from './MorphBackgroundPlaceholder';

interface HomeLayoutProps {
  slug: string;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

// DESKTOP HOME template (docs/TEXTURE_LAYOUT_PROPORTIONS.md). Two equal
// "sheet" panels floating on a full-bleed background. This component builds
// the frame only — panel interiors (header/body/footer proportions) are
// screen content and land in Phase 3 via the leftPanel/rightPanel slots.
export default function HomeLayout({ slug, leftPanel, rightPanel }: HomeLayoutProps) {
  return (
    <div className="app-shell">
      <NavBar slug={slug} active="home" />
      <MobileNavShell slug={slug} active="home" />
      <div className="app-stage">
        <MorphBackgroundPlaceholder />
        <div className="home-panels">
          <div className="home-panel home-panel-left">
            <span className="home-panel-sticker">My Chart</span>
            <div className="home-panel-slot">{leftPanel}</div>
          </div>
          <div className="home-panel home-panel-right">
            <span className="home-panel-sticker">Today&apos;s Sky</span>
            <div className="home-panel-slot">{rightPanel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
