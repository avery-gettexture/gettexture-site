'use client';

// The post-purchase home (SPEC §16, post-purchase home build). Two-panel
// live home: left = "My Chart" (the person's own placements), right =
// "Today's Sky" (plain, unpersonalized current-sky data). Transits is
// deliberately hidden here — see HomeTodaySkyPanel's own header comment.
//
// MOBILE (SPEC §16, mobile Home kill): the two-panel layout is a desktop
// design — there is no real mobile Home content yet (deferred, later task).
// Rather than show the desktop shell un-adapted on small screens, mobile
// visitors are redirected straight to My Chart (natal), the same
// matchMedia('(min-width: 1024px)') desktop-detection pattern
// natal/page.tsx and transits/page.tsx already use. Desktop is completely
// unaffected — it still renders HomeLayout exactly as before.

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeLayout from '@/app/components/HomeLayout';
import HomeMyChartPanel from '@/app/components/HomeMyChartPanel';
import HomeTodaySkyPanel from '@/app/components/HomeTodaySkyPanel';

export default function ReadingHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isDesktop === false) router.replace(`/reading/${slug}/natal`);
  }, [isDesktop, slug, router]);

  if (isDesktop === null || isDesktop === false) {
    return (
      <div style={{ height: '100dvh', background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-anton)', fontSize: '14px', color: 'var(--red-strong)', letterSpacing: '4px' }}>TEXTURE</span>
      </div>
    );
  }

  return (
    <HomeLayout
      slug={slug}
      leftPanel={<HomeMyChartPanel slug={slug} />}
      rightPanel={<HomeTodaySkyPanel slug={slug} />}
    />
  );
}
