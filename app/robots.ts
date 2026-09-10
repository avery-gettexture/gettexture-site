import type { MetadataRoute } from 'next';

// Generated robots.txt (SPEC §5.1, §16 — search-indexing task, Sep 10 2026).
// Serves at /robots.txt. Marketing/legal pages are crawlable; /reading/* (every
// private personal reading) and /success (post-payment screen) are disallowed —
// belt-and-suspenders with the noindex directives in app/reading/layout.tsx,
// app/success/layout.tsx, and the X-Robots-Tag headers in next.config.ts.
const SITE = 'https://gettexture.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/reading/', '/success'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
