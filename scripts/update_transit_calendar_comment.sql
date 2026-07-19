-- Follow-up to create_transit_and_aspect_calendars.sql: adds the ratified
-- dating convention to the transit_calendar documentation -- it was only
-- ever written into the generation script's header, never into the SQL
-- comments. Safe to run any time -- COMMENT ON is idempotent and touches no
-- data. Run this once, against the same Supabase project, the same way as
-- the original file.

COMMENT ON TABLE transit_calendar IS
  'One row per content-regeneration trigger, derived purely from sky_positions (2023-01-01 to 2046-07-31). Events: sign ingress, retrograde re-ingress, station retrograde, station direct. Moon is excluded entirely. Nodes is one axis-change row per axis (body = ''Nodes''), never a station row. A NULL in phase_end_date or sign_egress_date means that phase''s start or end falls outside the 2023-01-01 to 2046-07-31 data window -- not that it is unknown for any other reason. Houses are per-chart facts and are not stored here; the generation step joins to each chart downstream. DATING CONVENTION (ratified): every event is stamped with its actual UTC calendar date -- always the EARLIER of the two daily sky_positions snapshots bracketing the true crossing/station moment, never the later snapshot that first reveals the change. See the date column comment for detail.';

COMMENT ON COLUMN transit_calendar.date IS
  'The event''s date. DATING CONVENTION (ratified): dated to the earlier of the two daily sky_positions snapshots bracketing the true crossing/station moment -- e.g. a sign crossing at 14:00 UTC on the 14th is dated the 14th, never the 15th (whose snapshot is merely the first to show the new sign already in place). What actually changed (the new sign entered, the new motion direction) is necessarily read from the later snapshot, since the earlier one has not recorded it yet -- that is unavoidable, not an inconsistency. Any other point-in-time value on the row (a station''s degree) is read from the same earlier snapshot the row is dated to.';
