-- Stage 1 (structured aspect tables, per docs/SPEC.md): eclipse_transiting_
-- catches -- a GENERAL, chart-independent table, mirroring eclipse_aspects.
-- Persists whether a given eclipse catches a given TRANSITING planet's own
-- position within 3 degrees (same or opposite sign) -- the gating fact
-- behind whether a planet piece gets a TYPE: ECLIPSE_ACTIVATION entry at
-- all (docs/SPEC.md 11A.8), distinct from reading_eclipse_catches (which
-- planet the eclipse also caught).
--
-- Deliberately NOT derived from eclipse_aspects: eclipse_aspects always
-- excludes the eclipse's own anchor body from its other_body comparison set
-- (a body cannot meaningfully "aspect itself"), which structurally cannot
-- hold the one case this table exists to cover -- a solar eclipse catching
-- the transiting SUN itself (the anchor body), a real, valid catch under
-- eclipseCatches()'s degree-proximity test even though it is not an
-- "aspect" in the angular sense eclipse_aspects computes. This table is
-- its own small, purpose-built table rather than a derive-and-special-case
-- reading of eclipse_aspects, per the founder's explicit call.
--
-- Created EMPTY here. No data written, no engine/assembler changes. This
-- migration does not touch any existing table.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner).

CREATE TABLE eclipse_transiting_catches (
  id                text PRIMARY KEY,  -- mintEclipseTransitActivationId output: {eclipse_id}-activates-transiting-{slug(body)}
  eclipse_id        text NOT NULL REFERENCES aspect_calendar(id),
  eclipse_date      date NOT NULL,
  eclipse_event     text NOT NULL,      -- Solar Eclipse | Lunar Eclipse
  transiting_body   text NOT NULL,
  transiting_sign   text NOT NULL,
  transiting_degree float8 NOT NULL,
  catch_end         text NOT NULL,      -- same sign as eclipse | opposite sign from eclipse
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (eclipse_event IN ('Solar Eclipse', 'Lunar Eclipse')),
  CHECK (transiting_body IN ('Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto')),
  CHECK (catch_end IN ('same sign as eclipse', 'opposite sign from eclipse'))
);

CREATE INDEX eclipse_transiting_catches_eclipse_idx ON eclipse_transiting_catches (eclipse_id);
CREATE INDEX eclipse_transiting_catches_body_idx ON eclipse_transiting_catches (transiting_body, eclipse_date);

ALTER TABLE eclipse_transiting_catches ENABLE ROW LEVEL SECURITY;
-- No policies defined on purpose: default-deny to anon/authenticated roles,
-- matching aspect_calendar and eclipse_aspects (this table's own
-- neighborhood). Server code reads/writes using SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS. No RPC expected here, same reasoning as
-- sky_pair_activations.

COMMENT ON TABLE eclipse_transiting_catches IS
  'Structured, chart-INDEPENDENT record of whether a given eclipse catches a given TRANSITING planet''s own position within 3 degrees (same or opposite sign as the eclipse) -- contact-engine.mjs''s eclipseCatches() applied to the transiting body itself rather than to a natal point. This is the gating fact behind whether a planet piece''s brief gets a TYPE: ECLIPSE_ACTIVATION entry at all (docs/SPEC.md 11A.8), distinct from reading_eclipse_catches (which natal points, if any, the SAME eclipse also caught -- a per-reading fact). Deliberately its own table rather than a derived reading of eclipse_aspects: eclipse_aspects excludes the eclipse''s own anchor body from its comparison set by construction, so it structurally cannot represent a solar eclipse catching the transiting Sun (the anchor body) or a lunar eclipse catching the transiting Moon -- excluded here too by the transiting_body CHECK, since Moon is never a tracked contact/timeline body, but Sun is retained specifically to cover the self-anchor solar case. One row per qualifying catch only, matching eclipse_aspects'' own "no placeholder rows" pattern. TIMELESS: both an eclipse and a tracked body''s position at that instant are fixed astronomical facts. Unused until a later stage wires the assembler to write to it.';

COMMENT ON COLUMN eclipse_transiting_catches.transiting_body IS
  'One of the 9 tracked non-Moon bodies (Sun through Pluto) -- the same population TYPE: ECLIPSE_ACTIVATION entries can apply to (Nodes pieces use their own TYPE: ECLIPSE entry mechanism instead, unrelated to this table). Sun is included deliberately: a solar eclipse IS the transiting Sun at that instant, so this is always a catch for Sun on every solar eclipse -- a real, structurally guaranteed row, not a bug.';

COMMENT ON COLUMN eclipse_transiting_catches.transiting_degree IS
  'The transiting body''s own degree-within-sign on the eclipse date, read from its sky_positions row -- denormalized here for display convenience, same pattern as eclipse_aspects.other_body_degree.';
