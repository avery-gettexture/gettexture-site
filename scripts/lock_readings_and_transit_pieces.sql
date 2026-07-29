-- STAGE TWO (Step 3): locks readings and transit_pieces at the
-- database level. Direct anon reads are removed entirely; the only
-- way the public (anon) key can read a reading or its transit
-- pieces is by calling one of the two functions below with the
-- exact slug -- there is no way to ask either function for "all of
-- them." Replaces the temporary wide-open policy on transit_pieces
-- (scripts/add_transit_pieces_anon_select_policy.sql). See
-- docs/SPEC.md for the full record of why a plain RLS policy can't
-- do this (it can't tell whether a request named a slug or not) and
-- why a locked table + slug-required function is used instead.
--
-- Run this once, in full, against the Supabase project's SQL editor
-- (or any client authenticated as the database owner) -- same route
-- used for transit_calendar, aspect_calendar, and transit_pieces
-- itself. This does not touch any other table.

-- ---- readings ----

ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
REVOKE SELECT ON readings FROM anon;

CREATE OR REPLACE FUNCTION get_reading_by_slug(p_slug text)
RETURNS TABLE (
  slug              readings.slug%TYPE,
  name              readings.name%TYPE,
  birth_date        readings.birth_date%TYPE,
  birth_time        readings.birth_time%TYPE,
  birth_location    readings.birth_location%TYPE,
  birth_lat         readings.birth_lat%TYPE,
  birth_lng         readings.birth_lng%TYPE,
  birth_time_known  readings.birth_time_known%TYPE,
  chart_data        readings.chart_data%TYPE,
  sun               readings.sun%TYPE,
  moon              readings.moon%TYPE,
  mercury           readings.mercury%TYPE,
  venus             readings.venus%TYPE,
  mars              readings.mars%TYPE,
  jupiter           readings.jupiter%TYPE,
  saturn            readings.saturn%TYPE,
  uranus            readings.uranus%TYPE,
  neptune           readings.neptune%TYPE,
  pluto             readings.pluto%TYPE,
  asc_reading       readings.asc_reading%TYPE,
  mc                readings.mc%TYPE,
  north_node        readings.north_node%TYPE,
  south_node        readings.south_node%TYPE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, name, birth_date, birth_time, birth_location, birth_lat, birth_lng,
         birth_time_known, chart_data, sun, moon, mercury, venus, mars, jupiter,
         saturn, uranus, neptune, pluto, asc_reading, mc, north_node, south_node
  FROM readings
  WHERE slug = p_slug;
$$;

GRANT EXECUTE ON FUNCTION get_reading_by_slug(text) TO anon;

-- ---- transit_pieces ----

DROP POLICY IF EXISTS "anon can read transit_pieces" ON transit_pieces;
REVOKE SELECT ON transit_pieces FROM anon;

CREATE OR REPLACE FUNCTION get_transit_pieces_by_slug(p_reading_slug text)
RETURNS TABLE (
  body               transit_pieces.body%TYPE,
  synthesis_prose    transit_pieces.synthesis_prose%TYPE,
  timeline_entries   transit_pieces.timeline_entries%TYPE,
  phase_opened_date  transit_pieces.phase_opened_date%TYPE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT body, synthesis_prose, timeline_entries, phase_opened_date
  FROM transit_pieces
  WHERE reading_slug = p_reading_slug
  ORDER BY phase_opened_date DESC;
$$;

GRANT EXECUTE ON FUNCTION get_transit_pieces_by_slug(text) TO anon;
