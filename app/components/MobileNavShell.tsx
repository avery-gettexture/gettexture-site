'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type MobileNavKey = 'home' | 'natal' | 'transits' | 'reference';

interface MobileNavShellProps {
  slug: string;
  active: MobileNavKey;
}

// Mobile-only nav shell (SPEC §16, mobile nav shell task) — top bar +
// hamburger drawer for the 4-page mobile site (Home, My Chart, Today's
// Sky, Reference). Visibility is entirely CSS-driven (.mobile-nav-shell is
// display:none outside `@media (max-width: 1023px)` in globals.css) so
// this is safe to mount on any route regardless of viewport. Route paths
// mirror NavBar.tsx's ALL_NAV_ITEMS so the desktop and mobile navs never
// drift apart.
const DRAWER_ITEMS: { key: MobileNavKey; label: string; path: string }[] = [
  { key: 'home', label: 'Home', path: '' },
  { key: 'natal', label: 'My Chart', path: '/natal' },
  { key: 'transits', label: "Today's Sky", path: '/transits' },
  { key: 'reference', label: 'Reference', path: '/reference' },
];

export default function MobileNavShell({ slug, active }: MobileNavShellProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="mobile-nav-shell">
      <div className="mobile-nav-bar">
        <button
          type="button"
          className="mobile-menu-trigger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          Menu
        </button>
        <Link href={`/reading/${slug}`} className="mobile-nav-wordmark">
          TEXTURE
        </Link>
      </div>

      {open && (
        <>
          <div className="mobile-drawer-scrim" onClick={() => setOpen(false)} />
          <nav className="mobile-drawer">
            {DRAWER_ITEMS.map(item => (
              <Link
                key={item.key}
                href={`/reading/${slug}${item.path}`}
                className={`mobile-drawer-item${item.key === active ? ' active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
