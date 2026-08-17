// Header for the pre-purchase home only (home-two-panel-rebuild task, SPEC
// §16; rebuilt again in the pre-purchase-home-refinements follow-up, SPEC
// §16). Not the authenticated NavBar (app/components/NavBar.tsx) — that
// component's five links all point at /reading/[slug]/*, and no slug exists
// before a reading is purchased. TEXTURE is the ONLY centered item now
// (Avery's call) — the page's former left-side wordmark+email and right-side
// "example →" link were dropped, not carried into this version. The old page
// footer (Privacy/Terms/Support) moved up into this nav's right corner;
// copyright moved OUT of the nav onto the page background instead (see
// app/page.tsx's .prepurchase-bg-copyright).
import Link from 'next/link';

export default function PrePurchaseNavBar() {
  return (
    <nav className="nav-bar">
      <div className="prepurchase-nav-row">
        <div />
        <span className="prepurchase-nav-center">TEXTURE</span>
        <div className="prepurchase-nav-legal">
          <Link href="/privacy">PRIVACY</Link>
          <span>·</span>
          <Link href="/terms">TERMS</Link>
          <span>·</span>
          <a href="mailto:help@gettexture.app">SUPPORT</a>
        </div>
      </div>
    </nav>
  );
}
