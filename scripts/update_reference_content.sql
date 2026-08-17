-- Reference section content refresh (docs/Texture_Reference_Section_Updated.md
-- + docs/Texture_Extended_Reference_Terms.md), per founder brief.
--
-- Run this whole file against the live database (founder has DB write access;
-- Claude does not, per AGENTS.md). Read-only verification after running:
--   select category, name, length(description) from reference_content
--   where version = 1 order by category, id;
--
-- What this does:
--   1. UPDATEs the 46 existing entries' description text from
--      Texture_Reference_Section_Updated.md. Note: on comparison, this text is
--      byte-for-byte IDENTICAL to what's already live for all 46 rows -- these
--      UPDATEs are a no-op today, included for completeness/idempotency in case
--      that changes before this is run.
--   2. INSERTs 11 new rows: 4 new categories (How to Read a Chart, System,
--      Points and Calculations, Configurations and Events) plus Orb (joins
--      Aspects) and Station (joins Motion), from
--      Texture_Extended_Reference_Terms.md.
--   3. DELETEs the 3 Degree rows (Early/Middle/Late) and its category.
--
-- Naming note: existing entry names are preserved even where the source docs'
-- headings differ (e.g. doc says "Ascendant (Rising Sign)", kept as
-- "Ascendant") because lib/reference-utils.ts looks up these exact strings for
-- every placement's live "Reference" accordion on the natal page -- renaming
-- would silently break that feature. Category slugs are unchanged for the same
-- reason (planet/sign/house/motion/aspect); new categories use new kebab-case
-- slugs. See docs/SPEC.md §16 for the full ruling.

begin;

-- ===== STEP 2: overwrite existing entries =====

-- -- SIGNS --
update reference_content set description = 'Aries is cardinal fire — initiating, direct, and oriented toward forward motion. The essential quality is appetite for contact with what is next: attraction moves fast, decisions arrive before deliberation, and energy expresses most naturally as the first move rather than the sustained one.'
  where category = 'sign' and name = 'Aries' and version = 1;

update reference_content set description = 'Taurus is fixed earth — accumulating, sensory, and oriented toward what lasts. The essential quality is attunement to what is real, present, and worth holding: pleasure arrives through the body, stability is built through sustained contact, and value is assessed by what actually endures.'
  where category = 'sign' and name = 'Taurus' and version = 1;

update reference_content set description = 'Gemini is mutable air — circulating, connective, and oriented toward range. The essential quality is appetite for multiple inputs simultaneously: the mind moves laterally, curiosity disperses rather than concentrates, and understanding arrives through gathering rather than depth.'
  where category = 'sign' and name = 'Gemini' and version = 1;

update reference_content set description = 'Cancer is cardinal water — initiating through feeling, oriented toward protection and belonging. The essential quality is attunement to what nourishes: emotional intelligence operates close-in, security is built through sustained care, and the interior life is the primary instrument through which the world gets read.'
  where category = 'sign' and name = 'Cancer' and version = 1;

update reference_content set description = 'Leo is fixed fire — concentrated, expressive, and oriented toward genuine contribution. The essential quality is vitality that needs to be made visible: warmth seeks acknowledgment, creativity reaches toward an audience, and the self functions best when its particular quality is recognized rather than generic.'
  where category = 'sign' and name = 'Leo' and version = 1;

update reference_content set description = 'Virgo is mutable earth — discerning, precise, and oriented toward what works. The essential quality is close attention to how things actually function: the details matter, craft is taken seriously, and care is expressed through getting something right rather than getting it noticed.'
  where category = 'sign' and name = 'Virgo' and version = 1;

update reference_content set description = 'Libra is cardinal air — initiating through encounter, oriented toward balance and relational intelligence. The essential quality is awareness of the other as a real presence whose perspective must be accounted for: decision-making runs through weighing, aesthetic sensibility is finely calibrated, and the social field is read with unusual precision.'
  where category = 'sign' and name = 'Libra' and version = 1;

update reference_content set description = 'Scorpio is fixed water — concentrated, pressurized, and oriented toward what lies beneath the surface. The essential quality is tracking what is actually happening beneath what is presented: depth is preferred to breadth, the concealed carries more weight than the visible, and psychological intensity is the native register.'
  where category = 'sign' and name = 'Scorpio' and version = 1;

update reference_content set description = 'Sagittarius is mutable fire — dispersing, expansive, and oriented toward what lies beyond the immediate. The essential quality is appetite for larger meaning: belief organizes perception, the horizon matters more than the ground underfoot, and understanding arrives through reaching rather than through settling.'
  where category = 'sign' and name = 'Sagittarius' and version = 1;

update reference_content set description = 'Capricorn is cardinal earth — initiating through structure, oriented toward what can be built and sustained over time. The essential quality is strategic patience: effort accumulates deliberately, the long timeline is preferred to the quick result, and what gets built tends to hold because the process demanded it.'
  where category = 'sign' and name = 'Capricorn' and version = 1;

update reference_content set description = 'Aquarius is fixed air — concentrated, structural, and oriented toward pattern at a systemic level. The essential quality is perception of how things are organized beyond the individual case: concepts take precedence over immediate feeling, the collective context matters, and understanding tends toward the structural rather than the personal.'
  where category = 'sign' and name = 'Aquarius' and version = 1;

update reference_content set description = 'Pisces is mutable water — dispersing, permeable, and oriented toward what dissolves boundaries. The essential quality is attunement to what is felt before it is named: the boundary between self and other is unusually thin, understanding arrives through immersion rather than analysis, and the imaginal carries as much weight as the factual.'
  where category = 'sign' and name = 'Pisces' and version = 1;

-- -- HOUSES --
update reference_content set description = 'An empty house has no planets in it, and most charts have several. The sign on the house cusp describes the quality and character of this area of life — how it tends to operate and what it naturally emphasizes. The house''s themes are present and develop over a lifetime, regardless of whether a planet occupies it.'
  where category = 'house' and name = 'Empty House' and version = 1;

update reference_content set description = 'The 1st house is the domain of self — the body, the instinctive approach, and the quality of presence a person carries into every situation before deliberate self-construction begins. It is the most immediate layer of the chart: how a person meets the world before they''ve thought about how they''re meeting it.'
  where category = 'house' and name = '1st House' and version = 1;

update reference_content set description = 'The 2nd house governs material life — what is owned, earned, and held. More precisely, it describes a person''s relationship to resources and the instincts around what feels like enough, what feels worth accumulating, and what constitutes real security.'
  where category = 'house' and name = '2nd House' and version = 1;

update reference_content set description = 'The 3rd house governs the immediate mental environment — how a person thinks, communicates, and moves through the close-in world of everyday exchange. Its territory is the texture of daily mental life, and it traditionally extends to siblings, short journeys, and early education.'
  where category = 'house' and name = '3rd House' and version = 1;

update reference_content set description = 'The 4th house is private foundation — the interior life, the home environment, and the psychological ground a person carries everywhere and returns to when the world recedes. It describes what sustains a person from below rather than what they project outward.'
  where category = 'house' and name = '4th House' and version = 1;

update reference_content set description = 'The 5th house governs what a person generates from their own center — creative output, self-expression, play, and the kind of pleasure that comes from making something rather than receiving it. It is the domain of what is distinctively yours to produce.'
  where category = 'house' and name = '5th House' and version = 1;

update reference_content set description = 'The 6th house governs daily systems — the body''s routines, the structure of ordinary work, and the craft of maintaining functioning life. It is less about vocation as calling and more about how a person actually operates day to day, and what those operations demand.'
  where category = 'house' and name = '6th House' and version = 1;

update reference_content set description = 'The 7th house is the domain of significant encounter — the space between self and other where something workable must be negotiated. It governs close partnership, the people one chooses to bind to, and what one meets in the mirror of another person.'
  where category = 'house' and name = '7th House' and version = 1;

update reference_content set description = 'The 8th house governs depth, shared resources, and what is held in common with others — financially, psychologically, and energetically. It is the territory of entanglement, where the boundary between what is yours and what belongs to the relationship becomes complicated.'
  where category = 'house' and name = '8th House' and version = 1;

update reference_content set description = 'The 9th house governs the reach toward larger meaning — philosophy, belief, long travel, and the frameworks a person uses to make sense of experience beyond the immediate. It is the domain of what one is oriented toward rather than what one is currently standing on.'
  where category = 'house' and name = '9th House' and version = 1;

update reference_content set description = 'The 10th house governs public orientation — vocation as calling, reputation, and the quality of one''s contribution to something larger than private life. It describes the direction of long-term development: what a person is building toward over time, and what becomes visible to others as they do.'
  where category = 'house' and name = '10th House' and version = 1;

update reference_content set description = 'The 11th house governs collective belonging — the communities, causes, and shared purposes a person participates in. It is where individual orientation meets something larger, and where questions of what one is part of and what one is building with others live.'
  where category = 'house' and name = '11th House' and version = 1;

update reference_content set description = 'The 12th house governs what lies beneath ordinary awareness — solitude, withdrawal, the residue of what has not been consciously processed, and the territory of experience that resists direct observation. It is not hidden so much as pre-verbal, operating in a register the ego doesn''t easily access.'
  where category = 'house' and name = '12th House' and version = 1;

-- -- PLANETS AND POINTS --
update reference_content set description = 'The core of identity and vitality — the central organizing principle of who someone is and what they''re oriented toward. The Sun describes essential character and the drive to express it.'
  where category = 'planet' and name = 'Sun' and version = 1;

update reference_content set description = 'The emotional nature — how someone feels, processes, and seeks comfort. The Moon governs instinctive reactions, needs, and the internal world beneath the surface personality.'
  where category = 'planet' and name = 'Moon' and version = 1;

update reference_content set description = 'The mind — how someone thinks, learns, and communicates. Mercury governs perception, reasoning, language, and the way information is processed and exchanged.'
  where category = 'planet' and name = 'Mercury' and version = 1;

update reference_content set description = 'What someone values and is drawn to — in relationships, beauty, and pleasure. Venus governs attraction, taste, affection, and the capacity to connect and appreciate.'
  where category = 'planet' and name = 'Venus' and version = 1;

update reference_content set description = 'Drive and assertion — how someone pursues what they want and meets resistance. Mars governs energy, action, desire, and the capacity to assert and defend.'
  where category = 'planet' and name = 'Mars' and version = 1;

update reference_content set description = 'Expansion and meaning — where someone seeks growth, understanding, and possibility. Jupiter governs faith, opportunity, abundance, and the search for something larger.'
  where category = 'planet' and name = 'Jupiter' and version = 1;

update reference_content set description = 'Structure and limitation — where someone meets responsibility, discipline, and consequence. Saturn governs maturity, boundaries, and the slow work of building something durable.'
  where category = 'planet' and name = 'Saturn' and version = 1;

update reference_content set description = 'Disruption and individuation — where someone breaks from convention and asserts independence. Uranus governs sudden change, originality, and the drive toward freedom.'
  where category = 'planet' and name = 'Uranus' and version = 1;

update reference_content set description = 'Dissolution and transcendence — where boundaries soften and the imagination, spiritual, or ideal takes over. Neptune governs dreams, intuition, illusion, and the longing to merge.'
  where category = 'planet' and name = 'Neptune' and version = 1;

update reference_content set description = 'Power and transformation — where someone confronts depth, intensity, and what lies beneath the surface. Pluto governs death and rebirth, control, and profound change.'
  where category = 'planet' and name = 'Pluto' and version = 1;

update reference_content set description = 'The point on the eastern horizon at the moment of birth. The Ascendant describes how someone meets the world and is met by it — the lens through which the whole chart is expressed. It also sets the structure of the chart: in the Whole Sign system, the rising sign becomes the 1st house, and every house follows from there.'
  where category = 'planet' and name = 'Ascendant' and version = 1;

update reference_content set description = 'The highest point of the chart — the degree of the zodiac directly overhead at the moment and place of birth. The Midheaven describes public life, reputation, career, and the direction of someone''s outward path: what they''re known for and what they move toward in the world.'
  where category = 'planet' and name = 'Midheaven' and version = 1;

update reference_content set description = 'One of two points where the Moon''s orbit crosses the Sun''s apparent path through the sky. The North Node describes the direction of growth — the qualities and experiences someone is moving toward over a lifetime. It points to unfamiliar but developmental territory, the things an individual is learning to reach for.'
  where category = 'planet' and name = 'North Node' and version = 1;

update reference_content set description = 'One of two points where the Moon''s orbit crosses the Sun''s apparent path through the sky. The South Node describes what is already familiar and instinctive — established patterns a person carries in and relies on, the things that come easily and that the individual is learning to move beyond.'
  where category = 'planet' and name = 'South Node' and version = 1;

-- -- MOTION --
update reference_content set description = 'A planet moving direct is traveling forward through the zodiac, in its normal direction. This is the default state of most planets most of the time — the planet''s energy expresses outwardly and moves steadily ahead.'
  where category = 'motion' and name = 'Direct' and version = 1;

update reference_content set description = 'A planet moving retrograde appears from Earth to be traveling backward through the zodiac. Its energy turns inward — revisiting, reconsidering, and working through territory already covered. The planet''s quality is redirected toward a more internal and reflective expression, often less immediately visible from the outside.'
  where category = 'motion' and name = 'Retrograde' and version = 1;

-- -- ASPECTS --
update reference_content set description = 'A conjunction occurs when two planets occupy the same degree of the zodiac. The two principles join and act as one — a single concentrated force. Depending on the planets involved, this can intensify, focus, or blend their qualities, but the defining feature is unity: they operate together rather than separately.'
  where category = 'aspect' and name = 'Conjunction' and version = 1;

update reference_content set description = 'A sextile occurs when two planets are 60° apart. The two principles support each other easily — a harmonious aspect associated with opportunity, talent, and natural cooperation. The potential here is readily available; it tends to flow when engaged.'
  where category = 'aspect' and name = 'Sextile' and version = 1;

update reference_content set description = 'A square occurs when two planets are 90° apart. The two principles pull in different directions, creating dynamic tension. That friction is generative — squares are a primary source of drive, motivating growth and effort that smoother aspects don''t demand. The energy here builds something when it''s worked with.'
  where category = 'aspect' and name = 'Square' and version = 1;

update reference_content set description = 'A trine occurs when two planets are 120° apart. The two principles flow together with natural ease — a harmonious aspect associated with talent, grace, and innate capacity. What a trine offers tends to come naturally, an area where things simply work.'
  where category = 'aspect' and name = 'Trine' and version = 1;

update reference_content set description = 'An opposition occurs when two planets are directly across the zodiac from each other. The two principles sit in tension across an axis, each one complete and demanding its due. Oppositions are about balance and awareness — the work is integrating two genuine forces rather than choosing between them.'
  where category = 'aspect' and name = 'Opposition' and version = 1;

-- ===== STEP 3: insert new entries =====

-- -- HOW TO READ A CHART --
insert into reference_content (category, name, description, version)
  values ('how-to-read-a-chart', 'How to Read a Chart', 'A chart is a circle divided into twelve sections. The circle represents the whole sky at one specific moment and place, and each of the twelve sections is a house — an area of life, running from the self and body through home, relationships, work, and everything in between.

In the Whole Sign house system, which this reading uses, each house is filled by exactly one sign. The sign coming up over the horizon at that moment becomes the entire 1st house. The next sign moving counterclockwise becomes the 2nd house, the one after that the 3rd, and so on through all twelve. So the signs and the houses line up one to one: twelve signs, twelve houses, each sign occupying a single house.

Inside the wheel, you''ll see the planets. Each planet is placed at the exact degree of the sign it occupied at that moment — the sky, frozen at one instant. A planet''s position tells you two things at once: which sign it''s in (the style it expresses through) and which house that sign occupies (the area of life where it operates). A planet sits somewhere between 0° and 29° of its sign, and that degree is its precise location on the wheel.

The lines drawn across the center of the chart are the aspects. They show the angular relationships between planets — how far apart they are, measured in degrees around the circle. Certain angles are significant: planets a quarter of the circle apart form a square, a third of the circle apart form a trine, directly across from each other form an opposition. These relationships describe how the planets interact — where they support each other, where they create tension, where they combine. The aspect lines are what turn a set of separate placements into a connected system.

Read together, these four layers — houses, signs, planets, and aspects — are the full picture. A planet is an energy in the chart; its sign is how that energy is expressed; its house is the domain of life it shapes; and its aspects are the conversations it''s having with the rest of the chart.', 1);

-- -- SYSTEM --
insert into reference_content (category, name, description, version)
  values ('system', 'Tropical Zodiac', 'The tropical zodiac is the framework this reading uses to locate the planets. It''s anchored to the seasons — 0° Aries is fixed to the spring equinox, the moment the Sun crosses the celestial equator — and the twelve signs divide the year from there. It''s the standard system in Western astrology, rooted in the relationship between the Sun, the Earth, and the turning of the seasons rather than the current position of the constellations.', 1);

insert into reference_content (category, name, description, version)
  values ('system', 'Whole Sign Houses', 'Whole Sign is the house system this reading uses. In it, each house is exactly one full sign: the sign of your Ascendant becomes your entire 1st house, the next sign your entire 2nd house, and so on through all twelve. This is one of the oldest house systems in the tradition, valued for its clarity — every planet in a given sign falls cleanly into a single house, with no ambiguity about where one house ends and the next begins.', 1);

insert into reference_content (category, name, description, version)
  values ('system', 'Sect', 'Sect is the distinction between a day chart and a night chart, determined by whether the Sun sits above or below the horizon in the chart — the Ascendant–Descendant axis. A day chart has the Sun above the horizon, in the upper half of the chart (houses 7 through 12). A night chart has the Sun below the horizon, in the lower half (houses 1 through 6).

Sect subtly shifts how the planets express. In a day chart, the Sun, Jupiter, and Saturn are more at home and tend toward their more constructive expression; in a night chart, the Moon, Venus, and Mars take that role. The same placement can read a little differently depending on whether it belongs to the day or the night — a distinction the tradition uses to add nuance to how each planet operates in a given chart.', 1);

-- -- POINTS AND CALCULATIONS --
insert into reference_content (category, name, description, version)
  values ('points-and-calculations', 'Nodes (Mean Node)', 'The lunar nodes are the two points where the Moon''s orbit crosses the ecliptic — the Sun''s apparent path through the sky. Because they''re defined by the intersection of two orbits rather than by a physical body, the nodes are calculated points, not planets. They''re always exactly opposite each other: the North Node and the South Node.

There are two standard ways of calculating the nodes — mean and true. This reading uses the mean node, the nodes'' average position, smoothed over time. The true node tracks their exact moment-to-moment position, which wobbles slightly back and forth. The two are usually within a degree of each other, but near a sign boundary that small difference can place the nodes in different signs depending on the method — so you may occasionally see your nodes listed in a different sign elsewhere. Neither is wrong; they''re two conventions for locating the same points.', 1);

insert into reference_content (category, name, description, version)
  values ('points-and-calculations', 'Planetary Ruler', 'Every sign is ruled by a planet — the planet most associated with that sign''s nature and expression. Aries is ruled by Mars, Taurus by Venus, and so on. Rulership creates a link between a planet and the sign (and house) it governs: the ruling planet''s condition and placement carry information about the areas of the chart it rules. When a sign sits on a house, that sign''s ruling planet becomes a key to understanding that area of life.', 1);

insert into reference_content (category, name, description, version)
  values ('points-and-calculations', 'Decan', 'Each sign divides into three equal segments of 10° called decans, and each decan carries a slightly different flavor of the sign. This reading uses the Chaldean system, which assigns a planetary ruler to each decan following the Chaldean order of the planets (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon, repeating). A planet''s decan adds a further layer of nuance — a subtle coloring within the sign, depending on where in the sign''s arc the planet falls.', 1);

-- -- ASPECTS --
insert into reference_content (category, name, description, version)
  values ('aspect', 'Orb', 'An orb is the margin of allowance around an aspect. Aspects are exact at specific angles — a trine at 120°, a square at 90° — but they still operate when planets are near those angles, and the orb is how much distance from exact still counts. Within the orb, an aspect is active; beyond it, it fades. In this reading, natal aspects use an orb of 8° for most major aspects (10° for those involving the Sun or Moon), with sextiles held tighter at 6°; transits use 3°.

An aspect is applying when the planets are still moving toward exact — the aspect is building, and its influence is considered strongest here. It''s separating once the planets have passed exact and are moving apart, the influence gradually fading. An aspect is exact (or perfect) when the angle is precise, at 0° orb — the point of the aspect''s fullest expression.', 1);

-- -- MOTION --
insert into reference_content (category, name, description, version)
  values ('motion', 'Station', 'A planet stations when it appears to pause in the sky before changing direction — slowing to a near stop as it shifts between direct and retrograde motion, or retrograde back to direct. Because the planet lingers at nearly the same degree for an extended period, its influence is considered especially concentrated and strong at that point. A stationing planet is one whose themes are heightened, emphasized, and held in focus.', 1);

-- -- CONFIGURATIONS AND EVENTS --
insert into reference_content (category, name, description, version)
  values ('configurations-and-events', 'Stellium', 'A stellium is a cluster of three or more planets in the same sign. The planets concentrate their energy in one area of the chart, giving that sign unusual weight and emphasis. A stellium tends to be a defining feature of a chart — a place where a great deal of a person''s focus, drive, and development gathers.', 1);

insert into reference_content (category, name, description, version)
  values ('configurations-and-events', 'Eclipses', 'An eclipse is a supercharged lunation — a New or Full Moon that falls close to the lunar nodes, where the Sun, Moon, and Earth align precisely enough to cast a shadow. Because the nodes are involved, eclipses carry more weight than an ordinary lunation and are traditionally seen as markers of significant beginnings, endings, and turning points.

A solar eclipse is an intensified New Moon: the Sun and Moon meet at the same point near a node, and the Moon blocks the Sun. Like all New Moons it carries the quality of beginnings, but amplified — associated with fresh starts and new directions.

A lunar eclipse is an intensified Full Moon: the Sun and Moon oppose each other across the nodal axis, and the Earth''s shadow falls across the Moon. Like all Full Moons it carries the quality of culmination and revelation, but amplified — associated with endings, realizations, and what comes to light.', 1);

-- ===== STEP 4: delete the Degree category =====

delete from reference_content where category = 'degree';

commit;
