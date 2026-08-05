-- PHASE 3A (natal re-housing): adds the combined Nodes column.
--
-- SPEC §4.1: the natal reading consolidates North Node + South Node into
-- ONE axis piece ("Nodes"), dropping the natal reading from 14 sections to
-- 13. This column is where that single combined reading will live once
-- generated. It is empty (NULL) until content is written for it later --
-- this script only adds the column and wires it into the slug-gated read
-- function; it does not generate or move any content.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner) -- same route used for
-- scripts/lock_readings_and_transit_pieces.sql, which this file's function
-- definition is copied from (only the added `nodes` column differs).
--
-- NOTE FOR WHOEVER RUNS THIS: the app code was temporarily wired to read
-- the existing `north_node` column in place of `nodes` (so build work
-- wasn't blocked on this migration). After running this script, tell
-- Claude Code to swap the natal page's temporary `north_node` reference
-- back to the real `nodes` column -- see the "TEMPORARY" comments in
-- app/reading/[slug]/natal/page.tsx.

ALTER TABLE readings ADD COLUMN IF NOT EXISTS nodes text;

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
  south_node        readings.south_node%TYPE,
  nodes             readings.nodes%TYPE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, name, birth_date, birth_time, birth_location, birth_lat, birth_lng,
         birth_time_known, chart_data, sun, moon, mercury, venus, mars, jupiter,
         saturn, uranus, neptune, pluto, asc_reading, mc, north_node, south_node, nodes
  FROM readings
  WHERE slug = p_slug;
$$;

GRANT EXECUTE ON FUNCTION get_reading_by_slug(text) TO anon;
