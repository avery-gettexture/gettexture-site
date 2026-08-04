'use client';

// Placeholder — Reference is a shell in this phase. Renders the Phase 2
// <ReadingLayout> + <Rail> skeleton to prove the template works; the rows
// below are dummy data in Rail's generic flat 2-line shape, not real
// Reference content (Reference's real shape is a nested outline — a
// Phase 3 concern). Real content is built in Phase 3.

import { use } from 'react';
import ReadingLayout from '@/app/components/ReadingLayout';
import Rail, { type RailRow } from '@/app/components/Rail';

const DEMO_ROWS: RailRow[] = [
  { id: 'sun', glyph: '☉', name: 'Sun', degree: '14°', signGlyph: '♌', sign: 'Leo', house: '5th', active: true },
  { id: 'moon', glyph: '☽', name: 'Moon', degree: '2°', signGlyph: '♋', sign: 'Cancer', house: '4th' },
  { id: 'mercury', glyph: '☿', name: 'Mercury', degree: '29°', retrograde: true, signGlyph: '♍', sign: 'Virgo', house: '6th' },
];

export default function ReferenceHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <ReadingLayout
      slug={slug}
      active="reference"
      background="/transits-background.png"
      rail={
        <Rail
          title="Reference"
          controls={[{ label: 'List', active: true }]}
          rows={DEMO_ROWS}
        />
      }
    >
      <p className="placeholder-text">Reference content — built in Phase 3.</p>
    </ReadingLayout>
  );
}
