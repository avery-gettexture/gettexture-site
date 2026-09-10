import type { Metadata } from 'next';

// Search-indexing guarantee (SPEC §5.1, §16 — search-indexing task, Sep 10
// 2026). Every route under /reading/* is a private personal reading, reachable
// only by its emailed slug. This layout adds a server-rendered
// `<meta name="robots" content="noindex, nofollow">` to the <head> of every
// /reading/* page (the home, natal, transits, reference, settings, and anything
// added later). The reading pages are client components and cannot export
// metadata themselves; a server layout can, and Next resolves it into the HTML
// the server sends — not browser-injected. The authoritative belt-and-suspenders
// partner to this is the `X-Robots-Tag` HTTP header set in next.config.ts.
// This layout is otherwise a no-op: it renders children directly, no wrapper.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ReadingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
