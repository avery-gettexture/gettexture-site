-- Fixes get_current_sky_aspects() (built August 15, 2026 --
-- scripts/create_today_sky_rpcs.sql) for the home page's "Today's Sky"
-- right panel (HomeTodaySkyPanel.tsx). Two changes, both scoped to this one
-- function -- get_current_sky_positions() is untouched:
--
-- 1. DATE BASIS: the old function filtered on Postgres CURRENT_DATE, the
--    database SERVER's UTC date. Every other date on this panel (the date
--    label, the Today's Sky planet list, sky positions) keys off the
--    VISITOR's own browser-local date, so right around UTC midnight the two
--    could disagree -- the panel could show tomorrow's aspects while its
--    own date label still says today. Fixed by making the function take the
--    browser-local date as a PARAMETER (p_local_date) instead of reading
--    the server clock. The frontend now computes this the same way it
--    already computes the date label (lib/date-utils.ts
--    getTodayLocalISODate()) and passes it in.
--
-- 2. ECLIPSES: aspect_calendar's eclipse rows (event IN ('Solar Eclipse',
--    'Lunar Eclipse')) have NULL window_start/window_end -- they're point
--    events, not orb windows -- so the old window filter silently dropped
--    every eclipse row. Now also returned, using the same rule already
--    ratified for the Transits calendar page (TransitCalendarPane.tsx): an
--    eclipse is visible starting 2 weeks before its exact_date and drops
--    the day AFTER exact_date, no "recently happened" grace period. Uses
--    the SAME passed-in p_local_date as the anchor for both branches of the
--    query, so aspects and eclipses are always evaluated against the same
--    "today."
--
-- Also adds body_2_sign to the returned columns -- needed by the frontend
-- to label eclipse rows ("Solar Eclipse in Leo" / "Lunar Eclipse in
-- Pisces"). body_2_sign, not body_1_sign, is the right field for this:
-- body_2 is always Moon on an eclipse row, and per the ratified rule on
-- aspect_calendar.body_2_sign, that column is already correctly DERIVED for
-- both eclipse types -- same sign as the Sun for a Solar Eclipse
-- (conjunction), the opposite sign for a Lunar Eclipse (opposition) -- so
-- one column covers both without a per-type branch. Founder-confirmed
-- (August 16, 2026): a lunar eclipse is named by the eclipsed body (the
-- Moon's sign), not the Sun's, matching standard astrological convention.
-- Harmless to also return body_2_sign for ordinary (non-eclipse) aspect
-- rows, which ignore it.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner). It only replaces this one
-- function (dropping the old no-argument version first, since the frontend
-- will only ever call the new one-argument version going forward) -- it
-- does not touch aspect_calendar, sky_positions, or
-- get_current_sky_positions().

DROP FUNCTION IF EXISTS get_current_sky_aspects();

CREATE OR REPLACE FUNCTION get_current_sky_aspects(p_local_date date)
RETURNS TABLE (
  body_1       aspect_calendar.body_1%TYPE,
  body_2       aspect_calendar.body_2%TYPE,
  event        aspect_calendar.event%TYPE,
  body_2_sign  aspect_calendar.body_2_sign%TYPE,
  window_start aspect_calendar.window_start%TYPE,
  window_end   aspect_calendar.window_end%TYPE,
  exact_date   aspect_calendar.exact_date%TYPE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT body_1, body_2, event, body_2_sign, window_start, window_end, exact_date
  FROM aspect_calendar
  WHERE (
    event NOT IN ('Solar Eclipse', 'Lunar Eclipse')
    AND window_start <= p_local_date
    AND (window_end >= p_local_date OR window_end IS NULL)
  )
  OR (
    event IN ('Solar Eclipse', 'Lunar Eclipse')
    AND exact_date >= p_local_date
    AND exact_date <= p_local_date + 14
  );
$$;

GRANT EXECUTE ON FUNCTION get_current_sky_aspects(date) TO anon;
