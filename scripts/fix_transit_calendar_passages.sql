-- Fixes the KNOWN BUG documented in docs/SPEC.md 11A.2: sign_egress_date
-- was stored per-leg, not per true passage. This migration adds the columns
-- the corrected generation script needs, before it re-writes the table's
-- data. Run this ONCE, in full, against the Supabase project's SQL editor
-- (the same way as the original create_transit_and_aspect_calendars.sql),
-- BEFORE re-running scripts/generate-transit-calendar.mjs.
--
-- Adds four columns (passage_id, passage_first_ingress_date, entry_number,
-- entry_count), widens the event_type CHECK to allow the new re_ingress
-- event type, and rewrites the affected column comments to document the
-- passage model. Touches no data -- ADD COLUMN and COMMENT ON are both
-- non-destructive; existing rows simply get NULL in the new columns until
-- the generation script re-writes them.

ALTER TABLE transit_calendar
  ADD COLUMN IF NOT EXISTS passage_id text,
  ADD COLUMN IF NOT EXISTS passage_first_ingress_date date,
  ADD COLUMN IF NOT EXISTS entry_number integer,
  ADD COLUMN IF NOT EXISTS entry_count integer;

-- Widen the event_type CHECK to include re_ingress. Postgres auto-named
-- this constraint transit_calendar_event_type_check when the table was
-- created (confirmed by running this migration -- an earlier version of
-- this file tried to detect the name via pg_get_constraintdef and failed,
-- because Postgres renders "IN (...)" back out as "= ANY (ARRAY[...])",
-- which the detection query's literal-text match didn't account for).
ALTER TABLE transit_calendar
  DROP CONSTRAINT IF EXISTS transit_calendar_event_type_check;

ALTER TABLE transit_calendar
  ADD CONSTRAINT transit_calendar_event_type_check
  CHECK (event_type IN ('ingress', 'retro_ingress', 're_ingress', 'station_retrograde', 'station_direct'));

-- ── Updated documentation ──────────────────────────────────────────────

COMMENT ON TABLE transit_calendar IS
  'One row per content-regeneration trigger, derived purely from sky_positions (2023-01-01 to 2046-07-31). Events: sign ingress, retrograde re-ingress, direct re-ingress, station retrograde, station direct. Moon is excluded entirely. Nodes is one axis-change row per axis (body = ''Nodes''), never a station row. PASSAGE MODEL (ratified July 2026, closing the prior KNOWN BUG): a passage is a body''s entire association with one sign, first ingress to true final egress, dips included. Passage MEMBERSHIP is sign-consonant -- every row belongs to the passage of the sign it is actually in, including a retrograde dip''s own rows, which belong to the DIPPED-INTO sign''s passage, not the sign it dipped out of. Because a passage stays open through any retrograde dip and only closes at its true final egress, ADJACENT PASSAGES INTERLEAVE IN TIME: a body dipping between two signs keeps both signs'' passages open simultaneously, and their date ranges legitimately overlap -- this is correct, not a data error. A NULL in phase_end_date, sign_egress_date, or passage_first_ingress_date means that value falls outside the 2023-01-01 to 2046-07-31 data window (trailing) or that the passage''s true first ingress predates it (leading) -- never that it is unknown for any other reason. Houses are per-chart facts and are not stored here; the generation step joins to each chart downstream. DATING CONVENTION (ratified): every event is stamped with its actual UTC calendar date -- always the EARLIER of the two daily sky_positions snapshots bracketing the true crossing/station moment, never the later snapshot that first reveals the change. See the date column comment for detail.';

COMMENT ON COLUMN transit_calendar.event_type IS
  'ingress | retro_ingress | re_ingress | station_retrograde | station_direct. IDs mirror these values exactly as ingress / retro-ingress / re-ingress / station-retrograde / station-direct -- one uniform naming system, no abbreviations. The three ingress-type events are symmetric: ingress = a sign''s first-ever arrival within its passage; retro_ingress = backing retrograde into the previous sign (always the departure leg of a dip, never a passage''s first arrival); re_ingress = a direct (forward) crossing back into a sign already entered earlier in the same passage (a dip''s return leg). A plain ingress row is retyped to re_ingress whenever it is not the first entry into that passage.';

COMMENT ON COLUMN transit_calendar.sign_egress_date IS
  'This passage''s TRUE FINAL egress from the sign named in `sign` (or north_sign/south_sign, for Nodes) -- the date of the entry-type event (ingress/retro_ingress/re_ingress, any sign) that immediately follows this passage''s own last entry, chronologically, across the body''s full event history. Identical on every row belonging to the same passage_id. NULL if that egress falls after 2046-07-31 (trailing edge) or is not yet reached because the passage is still open at the data window''s end.';

COMMENT ON COLUMN transit_calendar.passage_id IS
  'Identifies the passage this row belongs to: {body}-{sign}-{first ingress date}, e.g. saturn-aries-2025-05-25 (the event-type word is omitted, unlike this table''s own `id` column). Identical on every row belonging to the same passage, including a dip''s own retro_ingress/re_ingress/station rows, which are stamped with the DIPPED-INTO sign''s passage_id, not the sign that was dipped out of -- membership is sign-consonant. For a passage whose true first ingress predates 2023-01-01 (every body has exactly one such passage -- whichever sign it already occupied at the data window''s start), the anchor-less convention {body}-{sign}-pre-range is used instead.';

COMMENT ON COLUMN transit_calendar.passage_first_ingress_date IS
  'The true first ingress date of this row''s passage (identical on every row in the passage). NULL when the passage''s true first ingress predates 2023-01-01 -- every body has exactly one such passage at the data window''s leading edge.';

COMMENT ON COLUMN transit_calendar.entry_number IS
  'For ingress-type rows only (ingress, retro_ingress, re_ingress) -- NULL for station rows. Which entry into this row''s own passage this is: 1 for the passage''s first ingress, 2 for its first return (whether by re_ingress or retro_ingress), and so on; a retro_ingress counts as an entry into the sign it backs into, same as a forward ingress or re_ingress. NULL (not just absent) for every row -- including entry-type rows -- belonging to a pre-range passage (passage_first_ingress_date NULL): the total entry count for such a passage is itself unknowable, so no row in it can state its ordinal against an unknowable total.';

COMMENT ON COLUMN transit_calendar.entry_count IS
  'For ingress-type rows only (ingress, retro_ingress, re_ingress) -- NULL for station rows, same as entry_number. Total number of entries in this row''s passage (identical across all of that passage''s entry-type rows). NULL for a pre-range passage (passage_first_ingress_date NULL), for the same reason entry_number is NULL there: the true total cannot be known when the passage''s beginning is outside the data.';
