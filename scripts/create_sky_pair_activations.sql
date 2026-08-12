-- Stage 1 (structured aspect tables, per docs/SPEC.md): sky_pair_
-- activations -- a GENERAL, chart-independent table, not a per-reading one.
-- Persists the structured version of a slow-pair SKY_CONTACT's own
-- ACTIVATIONS block (docs/SPEC.md 11A.8): a third transiting planet
-- reaching the 1-degree exact band with one member of an already-in-orb
-- pair, while itself aspecting the pair's OTHER member. Every field here
-- traces back to three aspect_calendar rows and nothing chart-specific --
-- by the DATA NATURE rule (split by what the data IS, not by where today's
-- code happens to compute it), this belongs in aspect_calendar's own
-- neighborhood, the same way eclipse_aspects does, not in a per-reading
-- table.
--
-- Created EMPTY here. No data written, no engine/assembler changes. This
-- migration does not touch any existing table.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner).

CREATE TABLE sky_pair_activations (
  id                          text PRIMARY KEY,  -- mintPairActivationId output: {candidate_sky_id}-activates-{host_sky_id}
  host_sky_id                 text NOT NULL REFERENCES aspect_calendar(id),      -- the pair aspect being activated
  candidate_sky_id            text NOT NULL REFERENCES aspect_calendar(id),      -- leg 1: candidate vs. one member of the host pair
  pair_sky_id                 text NOT NULL REFERENCES aspect_calendar(id),      -- leg 2: candidate vs. the host pair's OTHER member
  candidate_body               text NOT NULL,
  anchor_date                  date NOT NULL,
  perfects_before_host_orb     boolean NOT NULL,
  perfects_after_host_orb      boolean NOT NULL,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (perfects_before_host_orb AND perfects_after_host_orb))
);

CREATE INDEX sky_pair_activations_host_idx ON sky_pair_activations (host_sky_id);
CREATE INDEX sky_pair_activations_candidate_idx ON sky_pair_activations (candidate_sky_id);

ALTER TABLE sky_pair_activations ENABLE ROW LEVEL SECURITY;
-- No policies defined on purpose: default-deny to anon/authenticated roles,
-- matching aspect_calendar and eclipse_aspects (this table's own
-- neighborhood) -- server code reads/writes using
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. Unlike the per-reading
-- tables, no RPC is ever expected here (nothing anon-facing reads
-- aspect_calendar-adjacent tables directly today), so none is noted for
-- later either.

COMMENT ON TABLE sky_pair_activations IS
  'Structured, chart-INDEPENDENT record of a slow-pair SKY_CONTACT''s own ACTIVATIONS (docs/SPEC.md 11A.8): a third transiting planet (candidate) reaching the 1-degree exact band with one member of an already-in-orb pair (host), while the candidate itself aspects the pair''s other member. Every column resolves to a fact about three aspect_calendar rows and nothing chart-specific -- this is why the table lives here, in aspect_calendar''s own general neighborhood, rather than per-reading: the identical fact is canonical regardless of which reading''s brief (if any) ever renders it, matching mintPairActivationId''s own id, which is already globally unique with no reading component. TIMELESS: anchor_date and perfects_before/after_host_orb are intrinsic to the three-body relationship, not a phase-scoped snapshot. Unused until a later stage wires the assembler to write to it.';

COMMENT ON COLUMN sky_pair_activations.host_sky_id IS
  'The aspect_calendar row for the pair being activated (bodyA-bodyB). This is the "host" a brief would attach the ACTIVATIONS block to when rendering bodyA''s or bodyB''s own SKY_CONTACT entry for this pair.';

COMMENT ON COLUMN sky_pair_activations.candidate_sky_id IS
  'Leg 1 (SKY_ASPECT): the aspect_calendar row for candidate_body vs. one member of the host pair -- the leg that must reach the 1-degree exact band while the host pair''s own aspect is in orb.';

COMMENT ON COLUMN sky_pair_activations.pair_sky_id IS
  'Leg 2 (PAIR_ASPECT): the aspect_calendar row for candidate_body vs. the host pair''s OTHER member -- the leg that makes this a genuine three-body activation rather than a coincidental proximity.';

COMMENT ON COLUMN sky_pair_activations.perfects_before_host_orb IS
  'True when candidate_sky_id''s own exact date falls before the host pair''s orb window opened -- mutually exclusive with perfects_after_host_orb. Drives the brief''s "before this pair''s aspect begins" / "after this pair''s aspect separates" phrasing.';
