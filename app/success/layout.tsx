import type { Metadata } from 'next';

// Search-indexing guarantee (SPEC §5.1, §16 — search-indexing task, Sep 10
// 2026). /success is the post-payment "your reading is being prepared" screen.
// It has no content worth ranking and can briefly display a link to a real
// reading, so it is kept out of search. Same pattern as app/reading/layout.tsx:
// the page is a client component and cannot export metadata itself, so this
// server layout adds the noindex meta tag; next.config.ts adds the matching
// `X-Robots-Tag` header. No-op otherwise — renders children directly.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
