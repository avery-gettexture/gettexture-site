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
      <main className="app-stage">
        {/* sr-only page title (a11y Phase 2, SPEC §16): establishes real
            heading hierarchy above the two panel headings below, with no
            visible change — this page previously had no <h1> at all. */}
        <h1 className="sr-only">Your Reading</h1>
        <MorphBackgroundPlaceholder />
        <div className="home-panels">
          <div className="home-panel home-panel-left">
            <h2 className="home-panel-sticker">My Chart</h2>
            <div className="home-panel-slot">{leftPanel}</div>
          </div>
          <div className="home-panel home-panel-right">
            <h2 className="home-panel-sticker">Today&apos;s Sky</h2>
            <div className="home-panel-slot">{rightPanel}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
