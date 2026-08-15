'use client';

// The post-purchase home (SPEC §16, post-purchase home build). Two-panel
// live home: left = "My Chart" (the person's own placements), right =
// "Today's Sky" (plain, unpersonalized current-sky data). Transits is
// deliberately hidden here — see HomeTodaySkyPanel's own header comment.

import { use } from 'react';
import HomeLayout from '@/app/components/HomeLayout';
import HomeMyChartPanel from '@/app/components/HomeMyChartPanel';
import HomeTodaySkyPanel from '@/app/components/HomeTodaySkyPanel';

export default function ReadingHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <HomeLayout
      slug={slug}
      leftPanel={<HomeMyChartPanel slug={slug} />}
      rightPanel={<HomeTodaySkyPanel slug={slug} />}
    />
  );
}
