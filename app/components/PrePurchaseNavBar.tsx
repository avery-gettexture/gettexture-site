// Header for the pre-purchase home only (home-two-panel-rebuild task,
// SPEC §16). Not the authenticated NavBar (app/components/NavBar.tsx) — that
// component's five links all point at /reading/[slug]/*, and no slug exists
// before a reading is purchased. This echoes the same visual language
// (.nav-bar frame, the small red wordmark, the big active-link treatment for
// "TEXTURE" standing in for Home) without needing a slug: small wordmark +
// help email on the left, big "TEXTURE" center (this page IS Home), an
// "example →" link on the right that opens the dogfood reading in a new tab.
import { DOGFOOD_READING_SLUG } from '@/lib/config';

export default function PrePurchaseNavBar() {
  return (
    <nav className="nav-bar">
      <div className="prepurchase-nav-row">
        <div className="prepurchase-nav-left">
          <span className="nav-wordmark">TEXTURE</span>
          <a href="mailto:help@gettexture.app" className="prepurchase-nav-email">help@gettexture.app</a>
        </div>
        <span className="prepurchase-nav-center">TEXTURE</span>
        <a
          href={`/reading/${DOGFOOD_READING_SLUG}/natal`}
          target="_blank"
          rel="noopener noreferrer"
          className="prepurchase-nav-right"
        >
          example →
        </a>
      </div>
    </nav>
  );
}
