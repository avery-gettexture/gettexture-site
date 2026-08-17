// Single source of truth for how the Reference dictionary
// (`reference_content`, see scripts/update_reference_content.sql and
// docs/SPEC.md §16) is organized for display — category order, each
// category's display label, and each entry's display order within it.
// Both the mobile Reference section (app/components/ReferencePage.tsx) and
// the desktop Reference page (app/reading/[slug]/reference/page.tsx) read
// this instead of keeping their own separate order lists.
//
// `slug` is the literal `category` column value. For the 5 categories that
// predate this rewrite (sign/house/planet/motion/aspect), the slug is NOT a
// free choice — lib/reference-utils.ts's per-placement natal lookups
// (`find('planet', 'Ascendant')` etc.) hardcode these exact strings, so
// renaming any of them would silently break the live Reference accordion
// on the natal page. New categories use new kebab-case slugs.

export interface ReferenceCategory {
  slug: string;
  label: string;
  /** Entry names in this category, in display order. */
  entryNames: string[];
}

export const REFERENCE_TAXONOMY: ReferenceCategory[] = [
  {
    slug: 'how-to-read-a-chart',
    label: 'How to Read a Chart',
    entryNames: ['How to Read a Chart'],
  },
  {
    slug: 'system',
    label: 'System',
    entryNames: ['Tropical Zodiac', 'Whole Sign Houses', 'Sect'],
  },
  {
    slug: 'sign',
    label: 'Signs',
    entryNames: [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ],
  },
  {
    slug: 'house',
    label: 'Houses',
    entryNames: [
      'Empty House',
      '1st House', '2nd House', '3rd House', '4th House',
      '5th House', '6th House', '7th House', '8th House',
      '9th House', '10th House', '11th House', '12th House',
    ],
  },
  {
    slug: 'planet',
    label: 'Planets and Points',
    entryNames: [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
      'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'Midheaven',
      'North Node', 'South Node',
    ],
  },
  {
    slug: 'points-and-calculations',
    label: 'Points and Calculations',
    entryNames: ['Nodes (Mean Node)', 'Planetary Ruler', 'Decan'],
  },
  {
    slug: 'motion',
    label: 'Motion',
    entryNames: ['Direct', 'Retrograde', 'Station'],
  },
  {
    slug: 'aspect',
    label: 'Aspects',
    entryNames: ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition', 'Orb'],
  },
  {
    slug: 'configurations-and-events',
    label: 'Configurations and Events',
    entryNames: ['Stellium', 'Eclipses'],
  },
  // Not a reference_content DB category — its content is live mailto/URL
  // links, which the plain-text DB-driven renderer below can't produce.
  // Both Reference implementations (desktop page.tsx and mobile
  // ReferencePage.tsx) special-case this slug and render fixed copy
  // instead of looking it up in allEntries.
  {
    slug: 'help',
    label: 'Help',
    entryNames: ['Help'],
  },
];

/** Splits a description on blank lines so multi-paragraph entries (How to
 * Read a Chart, Sect, Nodes, Orb, Eclipses) can render as separate <p>
 * tags instead of one run-on block. */
export function splitParagraphs(description: string): string[] {
  return description.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
}
