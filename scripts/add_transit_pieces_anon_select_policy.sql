-- TEMPORARY, not the correct end-state (per Avery's explicit note when
-- approving this during the transit-generation dogfood task). Grants the
-- anon role unrestricted SELECT on transit_pieces, matching how `readings`
-- is currently exposed in practice (readings has no real slug-level RLS
-- scoping either -- anon can already list all rows there; the slug scoping
-- everyone assumed existed is only an application-level filter, not a
-- database-level restriction). A proper access/security pass revisiting
-- this (and readings) is a separate follow-up task.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner) -- same route used for
-- transit_calendar, aspect_calendar, and transit_pieces itself. This does
-- not touch any other table.

CREATE POLICY "anon can read transit_pieces"
  ON transit_pieces FOR SELECT
  TO anon
  USING (true);
