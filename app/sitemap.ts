import type { MetadataRoute } from 'next';

// Generated sitemap.xml (SPEC §5.1, §16 — search-indexing task, Sep 10 2026).
// Serves at /sitemap.xml. Lists only the public marketing/legal pages. Reading
// routes are per-person and database-gated — not enumerable and must never be
// listed here. /success is excluded too.
//
// The production domain is hardcoded (it already appears hardcoded in
// app/api/stripe-webhook/route.ts and the legal pages) rather than read from
// NEXT_PUBLIC_SITE_URL, which points at a Vercel preview URL on preview deploys
// and would put wrong absolute URLs into a production sitemap.
const SITE = 'https://gettexture.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/support`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
