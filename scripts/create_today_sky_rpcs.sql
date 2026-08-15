-- Two OPEN (non-slug-gated) SECURITY DEFINER functions for the home
-- page's "Today's Sky" panel. Same lock-table-plus-gate-function
-- pattern as get_reading_by_slug / get_transit_pieces_by_slug
-- (scripts/lock_readings_and_transit_pieces.sql), except neither
-- function takes a slug: this is general sky data, not tied to any
-- one reading, so it's meant to be readable by any anon visitor --
-- not just customers. The access-audit finding that prompted this:
-- sky_positions and aspect_calendar are both RLS-on with zero
-- policies (service-role-only already, per docs/SPEC.md 11.1 and
-- 11A.3), so today's anon browser cannot read either table at all.
-- Each function below filters to the current window SERVER-SIDE, so
-- an anon caller can only ever get today's slice, never the whole
-- table (sky_positions is ~103k rows; aspect_calendar is ~4,600).
--
-- Run this once, in full, against the Supabase project's SQL editor
-- (or any client authenticated as the database owner). Does not
-- touch any other table or function.

-- ---- sky_positions ----

ALTER TABLE sky_positions ENABLE ROW LEVEL SECURITY;
REVOKE SELECT ON sky_positions FROM anon;

CREATE OR REPLACE FUNCTION get_current_sky_positions()
RETURNS TABLE (
  body        sky_positions.body%TYPE,
  sign        sky_positions.sign%TYPE,
  sign_degree sky_positions.sign_degree%TYPE,
  retrograde  sky_positions.retrograde%TYPE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT body, sign, sign_degree, retrograde
  FROM sky_positions
  WHERE date = CURRENT_DATE;
$$;

GRANT EXECUTE ON FUNCTION get_current_sky_positions() TO anon;

-- ---- aspect_calendar ----
-- Nothing personal or per-reading lives in aspect_calendar -- every
-- row is a chart-independent sky-sky event (body_1/body_2/event/dates),
-- derived purely from sky_positions and shared by all subscribers
-- (docs/SPEC.md 11A.3). Open, unfiltered-by-identity exposure is
-- appropriate here in a way it is not for readings/transit_pieces.

ALTER TABLE aspect_calendar ENABLE ROW LEVEL SECURITY;
REVOKE SELECT ON aspect_calendar FROM anon;

CREATE OR REPLACE FUNCTION get_current_sky_aspects()
RETURNS TABLE (
  body_1       aspect_calendar.body_1%TYPE,
  body_2       aspect_calendar.body_2%TYPE,
  event        aspect_calendar.event%TYPE,
  window_start aspect_calendar.window_start%TYPE,
  window_end   aspect_calendar.window_end%TYPE,
  exact_date   aspect_calendar.exact_date%TYPE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT body_1, body_2, event, window_start, window_end, exact_date
  FROM aspect_calendar
  WHERE window_start <= CURRENT_DATE
    AND (window_end >= CURRENT_DATE OR window_end IS NULL);
$$;

GRANT EXECUTE ON FUNCTION get_current_sky_aspects() TO anon;
