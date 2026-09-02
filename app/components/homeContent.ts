// Marketing copy shared by the desktop pre-purchase home
// (HomeBirthChartPanel.tsx) and the mobile pre-purchase home
// (MobileHomePage.tsx) — extracted to one file so the two can't drift out
// of sync (recover-old-mobile-home task, SPEC §16). This is the CURRENT
// copy (13 Placements, the Education row, "reference dictionary" wording),
// not the stale copy ("14 Placements") that lived in the old pre-Aug-16
// single-column page.

export const OPENER_PARAGRAPH = 'Your chart is a woven system of planets, signs, houses, and aspects pushing and pulling on each other in ways unique to you. The more of it you explore, and the more context you hold, the more you\'ll start to recognize. This reading walks you through the nuance of your chart, so you can sit with the detail and find what it means to you.';

export const FEATURES = [
  { label: '13 Placements', text: 'Sun, moon, rising, and all major planets, bodies and points interpreted in full.' },
  { label: '~6,500 Words', text: 'Explore the depth your chart has to offer with ~500 words of unique copy for each placement, written for only you.' },
  { label: 'Full Context', text: 'Interpretations written to reflect that your chart is more than the sum of its parts. Sign, house, degree, aspects, and motion are considered for every placement.' },
  { label: 'Permanent URL', text: 'Your reading lives at a unique link. Save it, revisit it, share it anytime.' },
  { label: 'Education', text: 'Reference material throughout to define all major astrological terms.' },
];

export const DESCRIPTION_PARAGRAPHS = [
  'A chart is a woven system. Your placements are the threads, but how they interact creates the texture. This reading reflects that nuance — sign, house, degree, aspects, and motion are all considered, so your placements are read in context, not isolation.',
  'The report you\'ll receive is irreducibly specific to your chart. Your Sun at 29 degrees Leo in your 10th house, with a square to Saturn is different than a Sun in Leo in a different house, at a different degree, or with different aspects. If you\'re interested in astrology, and curious about what insights more specific reading could offer beyond an isolated planet in sign or planet in house interpretation, this report will surface the nuance you\'re looking for.',
  'Astrology resonates when it gets precise, and this report honors that precision. Factors like sign, house, degree, motion, and aspects push and pull on planets to shift what they mean for you. A planet in its home sign might be complicated by the house it\'s in or the aspects pulling against it, or a planet in a challenging sign might be supported by house or aspects. This reading illuminates the unique character of your chart for you to reflect on, consider, and sit with.',
  'This report is written to deliver a felt sense of your chart regardless of your experience with astrology — you do not need to be fluent in astrological terms to understand it. There are reference sections on each placement to define the planet, sign, house, degree, motion, and aspects referenced in the interpretation, as well as a complete reference section at the end with all terms defined.',
];

export const WHATS_INCLUDED = [
  'Birth chart wheel (Whole Sign house system)',
  'Full placements list',
  '~500 words of interpretation per placement',
  '~6,500 words of personalized content total',
  'Reference sections throughout',
  'Complete reference dictionary',
];

export const PLACEMENTS_INTERPRETED = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus',
  'Neptune', 'Pluto', 'Rising Sign / Ascendant', 'Midheaven', 'Nodes',
];

// Methodology copy (replaces the old APPROACH_PARAGRAPHS/APPROACH_METHOD_NOTE
// pair, Sep 2, 2026, SPEC §16) — same copy as the reference_content
// "Methodology" category (scripts/add_methodology_reference_content.sql),
// kept in sync deliberately since both surfaces show the identical text.
export const METHODOLOGY_SECTIONS = [
  {
    heading: 'Chart Calculation',
    paragraphs: [
      "The position of every planetary body at your moment of birth, from the Sun through Pluto, the lunar nodes, and the Ascendant and Midheaven, is calculated using ephemeris data checked against professional astronomical sources. The same birth details always produce the same chart. This part doesn't interpret anything. It locates.",
    ],
  },
  {
    heading: 'Writing',
    paragraphs: [
      "The reading is written by a language model. It receives the chart as discrete facts, a planet with its degree, its sign, its house, and its aspects to other points, and it interprets those facts. It runs no calculations, and it never reads a chart whole and guesses at the gist. It works from the numbers.",
      "Each factor in a chart answers a different question. A planet is a kind of energy, the thing at work. Its sign is how that energy moves. Its house is where it plays out. Its aspects are what it's in conversation with. On its own each is a single fact, but read together they compound, one conditioning the next, until a placement means something no single factor could say alone. Astrology's depth is in how they layer. The model's work is to hold all of it at once and let the layers build, which is what a reading needs and what no fixed set of descriptions can reach.",
      "It interprets in astrology, which the model knows the way it knows any documented subject. Astrology is a symbol system built over thousands of years. Saturn means structure and limit, the seventh house is partnership, a square is friction between two placements. These meanings are held in common across the whole tradition. No one owns them, and everyone who studies astrology works from them. A language model reads enough of that written tradition to reason inside the system rather than look things up in it. So it does what an astrologer does with a chart they've never seen. It applies the shared language to this specific case, and every reading is generated fresh.",
      "That's why a reading meets your actual chart. Saturn in the fourth house means one thing alone and another once you factor the sign it occupies, the planets aspecting it, and the rest of the chart. Reading those together, for one chart, is the work, and it takes a system that holds astrology as a method rather than a set of fixed meanings.",
      "The interpretation runs in stages. The analysis is assembled first, then written, with checks between.",
    ],
  },
  {
    heading: 'Astrological Systems',
    paragraphs: [
      "This reading uses the following systems: Whole Sign houses and the tropical zodiac, the frame of the chart; sect and decans, traditional techniques that weight and shade how a placement expresses; and modern rulerships — Uranus rules Aquarius, Neptune rules Pisces, Pluto rules Scorpio, with traditional rulerships for the rest.",
      "(Each is defined in the Reference Section.)",
      "The frame and techniques are traditional, and the rulerships are modern. Texture reads the standing conditions of a chart, how things tend to run, and does not predict events.",
    ],
  },
  {
    heading: 'Astrological Standards',
    paragraphs: [
      "The interpretations are directed to the academic and traditional body of astrology, the documented and argued-over lineage of the practice. The aim is to work at the level of someone who takes astrology seriously as a system, and to stay accurate to that tradition rather than to what's merely familiar.",
    ],
  },
  {
    heading: 'Your Interpretation',
    paragraphs: [
      "A reading describes a chart. It does not tell you who you are. Every interpretation is written as information to reflect on. A placement leans this way, tends toward that, makes something more available, but never hands down a verdict about your character or your future. The chart is the subject, not you. Texture holds the symbols to be precise and what they describe to be real, and still leaves you in full control of what any of it means for your life.",
      "A chart describes tendencies, not verdicts. It leans and colors. It doesn't decide. Texture exists to surface the layers of your chart so you can sit with the nuance and decide what any of it means for you.",
    ],
  },
];
