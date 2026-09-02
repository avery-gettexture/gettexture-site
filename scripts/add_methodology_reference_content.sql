-- Adds a new "Methodology" category to the reference_content table (5 rows),
-- per founder brief (Sep 2, 2026). Same copy as the pre-purchase home's
-- "approach" panel (app/components/homeContent.ts, METHODOLOGY_SECTIONS).
--
-- Run this whole file against the live database (founder has DB write access;
-- Claude does not, per AGENTS.md). Read-only verification after running:
--   select category, name, length(description) from reference_content
--   where category = 'methodology' order by id;
--
-- What this does: INSERTs 5 new rows under category = 'methodology'
-- (Chart Calculation, Writing, Astrological Systems, Astrological Standards,
-- Your Interpretation). No existing rows touched.
--
-- The taxonomy entry (lib/reference-taxonomy.ts) places this category last,
-- immediately before "help", so it appears at the end of the Reference rail.
--
-- "Astrological Systems" was given to this session as a bulleted list;
-- rendered here as prose (semicolon-separated) instead, since the shared
-- Reference-page accordion component has no bullet/list rendering anywhere
-- in the codebase (founder confirmed this call, Sep 2 2026 session).

begin;

insert into reference_content (category, name, description, version)
  values ('methodology', 'Chart Calculation', 'The position of every planetary body at your moment of birth, from the Sun through Pluto, the lunar nodes, and the Ascendant and Midheaven, is calculated using ephemeris data checked against professional astronomical sources. The same birth details always produce the same chart. This part doesn''t interpret anything. It locates.', 1);

insert into reference_content (category, name, description, version)
  values ('methodology', 'Writing', 'The reading is written by a language model. It receives the chart as discrete facts, a planet with its degree, its sign, its house, and its aspects to other points, and it interprets those facts. It runs no calculations, and it never reads a chart whole and guesses at the gist. It works from the numbers.

Each factor in a chart answers a different question. A planet is a kind of energy, the thing at work. Its sign is how that energy moves. Its house is where it plays out. Its aspects are what it''s in conversation with. On its own each is a single fact, but read together they compound, one conditioning the next, until a placement means something no single factor could say alone. Astrology''s depth is in how they layer. The model''s work is to hold all of it at once and let the layers build, which is what a reading needs and what no fixed set of descriptions can reach.

It interprets in astrology, which the model knows the way it knows any documented subject. Astrology is a symbol system built over thousands of years. Saturn means structure and limit, the seventh house is partnership, a square is friction between two placements. These meanings are held in common across the whole tradition. No one owns them, and everyone who studies astrology works from them. A language model reads enough of that written tradition to reason inside the system rather than look things up in it. So it does what an astrologer does with a chart they''ve never seen. It applies the shared language to this specific case, and every reading is generated fresh.

That''s why a reading meets your actual chart. Saturn in the fourth house means one thing alone and another once you factor the sign it occupies, the planets aspecting it, and the rest of the chart. Reading those together, for one chart, is the work, and it takes a system that holds astrology as a method rather than a set of fixed meanings.

The interpretation runs in stages. The analysis is assembled first, then written, with checks between.', 1);

insert into reference_content (category, name, description, version)
  values ('methodology', 'Astrological Systems', 'This reading uses the following systems: Whole Sign houses and the tropical zodiac, the frame of the chart; sect and decans, traditional techniques that weight and shade how a placement expresses; and modern rulerships — Uranus rules Aquarius, Neptune rules Pisces, Pluto rules Scorpio, with traditional rulerships for the rest.

(Each is defined in the Reference Section.)

The frame and techniques are traditional, and the rulerships are modern. Texture reads the standing conditions of a chart, how things tend to run, and does not predict events.', 1);

insert into reference_content (category, name, description, version)
  values ('methodology', 'Astrological Standards', 'The interpretations are directed to the academic and traditional body of astrology, the documented and argued-over lineage of the practice. The aim is to work at the level of someone who takes astrology seriously as a system, and to stay accurate to that tradition rather than to what''s merely familiar.', 1);

insert into reference_content (category, name, description, version)
  values ('methodology', 'Your Interpretation', 'A reading describes a chart. It does not tell you who you are. Every interpretation is written as information to reflect on. A placement leans this way, tends toward that, makes something more available, but never hands down a verdict about your character or your future. The chart is the subject, not you. Texture holds the symbols to be precise and what they describe to be real, and still leaves you in full control of what any of it means for your life.

A chart describes tendencies, not verdicts. It leans and colors. It doesn''t decide. Texture exists to surface the layers of your chart so you can sit with the nuance and decide what any of it means for you.', 1);

commit;
