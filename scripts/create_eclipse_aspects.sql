-- Eclipse-aspect dataset: the ECLIPSED body's own aspects at each eclipse
-- instant, replacing the Sun-only CONFIGURATION currently shown for eclipse
-- entries (which is wrong for lunar eclipses -- the eclipsed body there is
-- the Moon, 180 degrees from the Sun, so its aspects differ). See
-- docs/SPEC.md for the ratified ground rules and scripts/generate-eclipse-
-- aspects.mjs for the computation. Data only: this table does not replace
-- any existing table, and no display code reads it yet.
--
-- Run this once against the Supabase project (SQL editor, or any client
-- authenticated as the database owner). It creates one new table and does
-- not touch aspect_calendar or any other existing table.

CREATE TABLE eclipse_aspects (
  id                     text PRIMARY KEY,
  eclipse_id             text NOT NULL REFERENCES aspect_calendar(id),
  eclipse_date           date NOT NULL,
  eclipse_event          text NOT NULL,
  anchor_body            text NOT NULL,
  anchor_sign            text NOT NULL,
  anchor_degree          float8 NOT NULL,
  other_body             text NOT NULL,
  other_body_sign        text NOT NULL,
  other_body_degree      float8 NOT NULL,
  other_body_retrograde  boolean NOT NULL,
  aspect                 text NOT NULL,
  orb                    float8 NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (eclipse_event IN ('Solar Eclipse', 'Lunar Eclipse')),
  CHECK (anchor_body IN ('Sun', 'Moon')),
  CHECK (other_body IN ('Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto')),
  CHECK (aspect IN ('conjunction', 'sextile', 'square', 'trine', 'opposition')),
  CHECK (orb >= 0 AND orb <= 3)
);

CREATE INDEX eclipse_aspects_eclipse_id_idx ON eclipse_aspects (eclipse_id);
CREATE INDEX eclipse_aspects_eclipse_date_idx ON eclipse_aspects (eclipse_date);

ALTER TABLE eclipse_aspects ENABLE ROW LEVEL SECURITY;
-- Same default-deny / service-role-only pattern as every other table here:
-- no policies defined, so anon/authenticated get nothing; server code reads
-- and writes with SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.

COMMENT ON TABLE eclipse_aspects IS
  'The ECLIPSED body''s own sign-consonant aspects (five majors, 3 degree active orb, identical standard to aspect_calendar) to the other 8 tracked bodies (Mercury-Pluto), computed at the frozen eclipse instant. Anchor = Moon for a Lunar Eclipse, Sun for a Solar Eclipse -- read from the eclipse''s own aspect_calendar row (body_1_sign/exact_degree for solar, body_2_sign/exact_degree for lunar), never re-derived from sky_positions, so any hand-corrected eclipse sign/degree (see load-eclipses.mjs BOUNDARY_CORRECTIONS) carries through automatically. The OTHER luminary is excluded (Moon dropped on a solar eclipse, Sun dropped on a lunar eclipse) since that pairing is the eclipse''s own defining axis, not a configuration -- as a consequence the comparison set is the same 8 bodies for every eclipse. One row per (eclipse, other body) that actually forms a qualifying aspect; a body with no qualifying aspect gets no row (no "none" placeholder rows, matching aspect_calendar''s own pattern). No new positions are computed anywhere in this table -- every value is read from the eclipse''s own aspect_calendar row or from an other body''s existing sky_positions row on that date. Computed by scripts/generate-eclipse-aspects.mjs. REPLACES the Sun-only CONFIGURATION previously shown for eclipse display -- see docs/SPEC.md for the record. Display code does not read this table yet; that is a separate, later task.';

COMMENT ON COLUMN eclipse_aspects.eclipse_id IS
  'Foreign key to aspect_calendar.id -- the specific eclipse row (solar-eclipse-{date} or lunar-eclipse-{date}) this aspect belongs to.';

COMMENT ON COLUMN eclipse_aspects.anchor_body IS
  'The eclipsed body: Moon for a Lunar Eclipse, Sun for a Solar Eclipse.';

COMMENT ON COLUMN eclipse_aspects.anchor_sign IS
  'The anchor body''s sign at the eclipse instant, read directly from the eclipse''s own aspect_calendar row (never re-derived).';

COMMENT ON COLUMN eclipse_aspects.anchor_degree IS
  'The anchor body''s degree-within-sign at the eclipse instant, read directly from the eclipse''s own aspect_calendar row (exact_degree). Identical for every eclipse_aspects row sharing one eclipse_id.';

COMMENT ON COLUMN eclipse_aspects.other_body IS
  'One of the 8 non-luminary tracked bodies: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.';

COMMENT ON COLUMN eclipse_aspects.other_body_sign IS
  'other_body''s real sign on the eclipse date, read from its own sky_positions row (not reconstructed).';

COMMENT ON COLUMN eclipse_aspects.other_body_degree IS
  'other_body''s real degree-within-sign on the eclipse date, read from its own sky_positions row.';

COMMENT ON COLUMN eclipse_aspects.other_body_retrograde IS
  'other_body''s motion state on the eclipse date, read from its own sky_positions row. Denormalized for downstream display convenience; not itself part of the aspect determination.';

COMMENT ON COLUMN eclipse_aspects.aspect IS
  'conjunction | sextile | square | trine | opposition -- determined by sign distance between anchor_sign and other_body_sign, identical mapping to scripts/generate-aspect-calendar.mjs (SIGN_DIST_TO_ASPECT).';

COMMENT ON COLUMN eclipse_aspects.orb IS
  'Absolute degrees between the actual angular separation (anchor vs. other_body, at the frozen eclipse instant) and the aspect''s exact angle. Always between 0 and 3 (rows outside the 3 degree active orb are not written). This is a SNAPSHOT fact at one instant, not a moving window -- there is no window_start/window_end/exact_date/pass concept here, unlike aspect_calendar''s own aspect rows.';
