import Link from 'next/link';

export type NavKey = 'home' | 'natal' | 'transits' | 'reference' | 'settings';

interface NavBarProps {
  slug: string;
  active: NavKey;
}

// HIDE (SPEC §16, hide-transits pass): Settings has no live content yet
// (transits/subscriptions aren't built) — hidden from the nav, not removed.
// The route itself still works by direct URL. Flip back to true to restore
// the link.
const SHOW_SETTINGS_NAV = false;

const ALL_NAV_ITEMS: { key: NavKey; label: string; path: string }[] = [
  { key: 'home', label: 'Home', path: '' },
  { key: 'natal', label: 'My Chart', path: '/natal' },
  { key: 'transits', label: 'Transits', path: '/transits' },
  { key: 'reference', label: 'Reference', path: '/reference' },
  { key: 'settings', label: 'Settings', path: '/settings' },
];

const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => SHOW_SETTINGS_NAV || item.key !== 'settings');

export default function NavBar({ slug, active }: NavBarProps) {
  return (
    <nav className="nav-bar">
      <span className="nav-wordmark">TEXTURE</span>
      <div className="nav-links">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.key}
            href={`/reading/${slug}${item.path}`}
            className={`nav-link${item.key === active ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
