-- Stage 1 (structured aspect tables, per docs/SPEC.md): reading_eclipse_
-- catches -- persists the structured version of contact-engine.mjs's
-- eclipseCatches() output for a specific reading's chart: which natal
-- points a given eclipse caught, and how (conjunct/opposite the eclipse
-- degree). Per docs/SPEC.md 11A.8, this SAME computation feeds both the
-- Nodes piece's own TYPE: ECLIPSE entries' NATAL_CAUGHT field and a planet
-- piece's TYPE: ECLIPSE_ACTIVATION entries' NATAL_CAUGHT field -- one row
-- set per (reading, eclipse) naturally serves both, independent of which
-- planet's brief is asking.
--
-- Created EMPTY here. No data written, no engine/assembler changes. This
-- migration does not touch any existing table.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner).

CREATE TABLE reading_eclipse_catches (
  id                  text PRIMARY KEY,  -- {reading_slug}-{eclipse_id}-{slug(natal_point)}, lowercased
  reading_slug        text NOT NULL,
  eclipse_id          text NOT NULL REFERENCES aspect_calendar(id),
  natal_point         text NOT NULL,
  natal_point_sign    text NOT NULL,
  natal_point_degree  float8 NOT NULL,
  natal_point_house   text,               -- NULL when the reading's birth time is unknown
  catch_end           text NOT NULL,      -- same sign as eclipse | opposite sign from eclipse
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reading_slug, eclipse_id, natal_point),
  CHECK (natal_point IN ('Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'MC', 'Axis (North Node end)', 'Axis (South Node end)')),
  CHECK (catch_end IN ('same sign as eclipse', 'opposite sign from eclipse'))
);

CREATE INDEX reading_eclipse_catches_reading_idx ON reading_eclipse_catches (reading_slug);
CREATE INDEX reading_eclipse_catches_eclipse_idx ON reading_eclipse_catches (eclipse_id);

ALTER TABLE reading_eclipse_catches ENABLE ROW LEVEL SECURITY;
-- No policies defined on purpose: default-deny to anon/authenticated roles,
-- matching reading_transit_contacts and how transit_pieces was originally
-- created. Server code reads/writes using SUPABASE_SERVICE_ROLE_KEY, which
-- bypasses RLS. No RPC built in this step.

COMMENT ON TABLE reading_eclipse_catches IS
  'Structured, per-reading record of which natal points a given eclipse caught (within 3 degrees, same or opposite sign -- contact-engine.mjs''s eclipseCatches()), per docs/SPEC.md 11A.8. Shared by both the Nodes piece''s TYPE: ECLIPSE entries and a planet piece''s TYPE: ECLIPSE_ACTIVATION entries -- one row set per (reading, eclipse), not duplicated per brief. TIMELESS: an eclipse is a fixed instant and a natal point is fixed at birth, so these facts never change once computed; no phase or brief scoping applies. The id''s {slug(natal_point)}-{eclipse_id} composition is a NEW convention introduced for this table -- unlike reading_transit_contacts.contact_id or reading_natal_activations.activation_id, contact-engine.mjs''s eclipseCatches() does not mint its own id today, so a later stage must construct this id the same deterministic way rather than reading one off the engine. Unused until a later stage wires the assembler to write to it.';

COMMENT ON COLUMN reading_eclipse_catches.natal_point IS
  'The 13 natal receiving points (per contact-engine.mjs''s extractNatalPoints), with the axis split into its two named ends (Axis (North Node end) / Axis (South Node end)) exactly as eclipseCatches() reports them -- unlike reading_transit_contacts.natal_point, which stores ''Axis'' as one value with separate north/south sign columns, an eclipse catch can catch one end without the other, so the two ends need to be independently rowed.';

COMMENT ON COLUMN reading_eclipse_catches.catch_end IS
  'Which side of the eclipse''s own lunation axis caught this point: "same sign as eclipse" or "opposite sign from eclipse" -- feeds the brief''s conjunct/opposite-the-eclipse-degree phrasing (re-anchored to the eclipsed body per SPEC.md 11A.8''s NATAL_CAUGHT re-anchor ruling).';
