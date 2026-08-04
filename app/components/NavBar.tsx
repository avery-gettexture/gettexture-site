import Link from 'next/link';

export type NavKey = 'home' | 'natal' | 'transits' | 'reference' | 'settings';

interface NavBarProps {
  slug: string;
  active: NavKey;
}

const NAV_ITEMS: { key: NavKey; label: string; path: string }[] = [
  { key: 'home', label: 'Home', path: '' },
  { key: 'natal', label: 'My Chart', path: '/natal' },
  { key: 'transits', label: 'Transits', path: '/transits' },
  { key: 'reference', label: 'Reference', path: '/reference' },
  { key: 'settings', label: 'Settings', path: '/settings' },
];

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
