'use client';

// Placeholder — the post-purchase home. Renders the Phase 2 <HomeLayout>
// skeleton with filler content to prove the template works; real panel
// content (placements list, today's sky, aspects) is built in Phase 3.

import { use } from 'react';
import HomeLayout from '@/app/components/HomeLayout';

export default function ReadingHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <HomeLayout
      slug={slug}
      leftPanel={<p className="placeholder-text">My Chart panel — built in Phase 3.</p>}
      rightPanel={<p className="placeholder-text">Today&apos;s Sky panel — built in Phase 3.</p>}
    />
  );
}
