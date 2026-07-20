-- Phase 3 (Call 1/Call 2 output storage): the transit_pieces table.
-- Schema per the approved Phase 0 proposal, amended by the founder's
-- rulings: keyed by (reading_slug, body, trigger_id) -- one row per phase
-- edition, prior editions kept rather than overwritten. See docs/SPEC.md
-- and the transit engine build plan for context.
--
-- Run this once, in full, against the Supabase project's SQL editor (or
-- any client authenticated as the database owner) -- same route used for
-- transit_calendar and aspect_calendar. This does not touch any other
-- table.

CREATE TABLE transit_pieces (
  id                   text PRIMARY KEY,   -- {reading_slug}-{body}-{trigger_id}, lowercased
  reading_slug         text NOT NULL,
  body                 text NOT NULL,      -- Sun..Pluto or 'Nodes'
  trigger_id           text NOT NULL,      -- transit_calendar.id that opened this phase
  phase_opened_date    date NOT NULL,
  phase_end_date       date,               -- NULL = open-ended, matches transit_calendar convention
  sign                 text,               -- NULL for Nodes
  north_sign           text,               -- Nodes only
  south_sign           text,               -- Nodes only
  motion               text,               -- FORWARD | RETROGRADE | NULL for Nodes
  synthesis_prose      text NOT NULL,
  timeline_entries     jsonb NOT NULL,     -- [{id, type, facts, activations, prose}], IDs engine-minted, echoed verbatim by Call 2
  engine_input         jsonb NOT NULL,     -- the full assembled Call 1 field block (audit / regen / debugging)
  brief                text,               -- raw Call 1 output (QC / debugging during dogfood)
  model                text NOT NULL,
  generation_cost_usd  numeric,
  generated_at         timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reading_slug, body, trigger_id)
);

CREATE INDEX transit_pieces_reading_body_idx ON transit_pieces (reading_slug, body, phase_opened_date DESC);

ALTER TABLE transit_pieces ENABLE ROW LEVEL SECURITY;
-- No policies defined on purpose: default-deny to anon/authenticated roles,
-- matching sky_positions / transit_calendar / aspect_calendar. Server code
-- reads/writes using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.

COMMENT ON TABLE transit_pieces IS
  'Generated transit pieces (synthesis prose + timeline entries) for one (reading, body) pair, one row per phase edition. Keyed by (reading_slug, body, trigger_id) so regeneration within the same phase upserts in place while a new phase inserts a new row -- prior editions are kept, not overwritten. The page renders the newest row per (reading_slug, body) by phase_opened_date. timeline_entries stores each rendered entry (NATAL_CONTACT or SKY_CONTACT) with its engine-minted ID, its dated facts, any attached ACTIVATION facts (engine-minted IDs, independently queryable for the future notification layer), and its rendered prose.';

COMMENT ON COLUMN transit_pieces.trigger_id IS
  'The transit_calendar.id row that opened this phase -- the same ID used in PHASE.OPENED_BY when assembling the Call 1 input for this piece.';

COMMENT ON COLUMN transit_pieces.timeline_entries IS
  'Array of rendered timeline entries: [{id, type: NATAL_CONTACT|SKY_CONTACT, facts: {...}, activations: [{id, body, sky_aspect, natal_aspect, date}], eclipse_activations: [...], prose}]. Entry and activation IDs are engine-minted and echoed verbatim from Call 2''s output -- never composed downstream.';
