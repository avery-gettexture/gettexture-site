-- STAGE THREE (Step 4): drop `email` from `readings`. Email now lives
-- exclusively in `reading_contacts` (Steps 1-3: the locked table was
-- created and verified, all 7 surviving readings' emails were copied
-- over, and the Stripe webhook was rewired to write new purchases'
-- email there instead of here). Audited before writing this migration:
-- no code path reads readings.email anymore -- the reading page/
-- functions already excluded it since Stage One/Two, the webhook no
-- longer writes or reads it, and /api/generate selects readings.* but
-- only ever touches chart_data and birth_time_known. See docs/SPEC.md
-- for the full record.
--
-- Run this once, in full, against the Supabase project's SQL editor
-- (or any client authenticated as the database owner) -- same route
-- used for every prior migration in this repo. This does not touch
-- reading_contacts, transit_pieces, or any other table.

ALTER TABLE readings DROP COLUMN email;
