-- Phase 1 migration: retire the old app-era transit_calendar and create its
-- two replacements, both derived purely from sky_positions (2023-01-01 to
-- 2046-07-31). See docs/SPEC.md for the product context.
--
-- Confirmed before writing this file (read-only checks, see the approved
-- plan): nothing deployed in this repo or in astrology-proxy reads
-- transit_calendar, so the rename below is safe.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner). It does not touch any table
-- other than transit_calendar, and it does not delete any data -- the old
-- table is renamed, not dropped.

-- Step 1: retire the old table under a new name. No data is touched or lost.
ALTER TABLE transit_calendar RENAME TO transit_calendar_archive;

-- Step 2: the new transit_calendar -- one row per content-regeneration
-- trigger (sign ingress, retrograde re-ingress, station retrograde, station
-- direct). Moon is excluded entirely. Nodes is a single axis-change row per
-- axis (body = 'Nodes'), never a station row (mean node, steady motion).
CREATE TABLE transit_calendar (
  id                text PRIMARY KEY,
  body              text NOT NULL,
  event_type        text NOT NULL,
  sign              text,
  north_sign        text,
  south_sign        text,
  date              date NOT NULL,
  degree            float8,
  phase_end_date    date,
  sign_egress_date  date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (body <> 'Moon'),
  CHECK (body <> 'Nodes' OR event_type = 'ingress'),
  CHECK (event_type IN ('ingress', 'retro_ingress', 'station_retrograde', 'station_direct'))
);

CREATE INDEX transit_calendar_body_date_idx ON transit_calendar (body, date);

ALTER TABLE transit_calendar ENABLE ROW LEVEL SECURITY;
-- No policies defined on purpose: this is a default-deny to the anon and
-- authenticated roles, matching sky_positions. Server code reads/writes
-- using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely -- the same
-- credential app/api/generate/route.ts and the sky_positions fill script
-- already use. No new access pattern is introduced.

COMMENT ON TABLE transit_calendar IS
  'One row per content-regeneration trigger, derived purely from sky_positions (2023-01-01 to 2046-07-31). Events: sign ingress, retrograde re-ingress, station retrograde, station direct. Moon is excluded entirely. Nodes is one axis-change row per axis (body = ''Nodes''), never a station row. A NULL in phase_end_date or sign_egress_date means that phase''s start or end falls outside the 2023-01-01 to 2046-07-31 data window -- not that it is unknown for any other reason. Houses are per-chart facts and are not stored here; the generation step joins to each chart downstream. DATING CONVENTION (ratified): every event is stamped with its actual UTC calendar date -- always the EARLIER of the two daily sky_positions snapshots bracketing the true crossing/station moment, never the later snapshot that first reveals the change. See the date column comment for detail.';

COMMENT ON COLUMN transit_calendar.body IS
  'Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, or Nodes. Never Moon.';

COMMENT ON COLUMN transit_calendar.date IS
  'The event''s date. DATING CONVENTION (ratified): dated to the earlier of the two daily sky_positions snapshots bracketing the true crossing/station moment -- e.g. a sign crossing at 14:00 UTC on the 14th is dated the 14th, never the 15th (whose snapshot is merely the first to show the new sign already in place). What actually changed (the new sign entered, the new motion direction) is necessarily read from the later snapshot, since the earlier one has not recorded it yet -- that is unavoidable, not an inconsistency. Any other point-in-time value on the row (a station''s degree) is read from the same earlier snapshot the row is dated to.';

COMMENT ON COLUMN transit_calendar.event_type IS
  'ingress | retro_ingress | station_retrograde | station_direct. IDs mirror these values exactly as ingress / retro-ingress / station-retrograde / station-direct -- one uniform naming system, no abbreviations.';

COMMENT ON COLUMN transit_calendar.sign IS
  'Sign entered (ingress or retro_ingress) or sign the station occurs in. NULL for Nodes rows, which carry north_sign/south_sign instead.';

COMMENT ON COLUMN transit_calendar.north_sign IS
  'Nodes rows only: the North Node''s sign after this axis change.';

COMMENT ON COLUMN transit_calendar.south_sign IS
  'Nodes rows only: the South Node''s sign after this axis change (always opposite north_sign).';

COMMENT ON COLUMN transit_calendar.degree IS
  'Degree within sign, station rows only. NULL for both ingress event types -- not because ingress is universally at 0 degrees: a direct ingress happens at 0 degrees, but a retro-ingress happens at the end of the sign (about 29.99 degrees), since it is the same sign boundary crossed from the other direction. Either way the degree is fixed by the boundary itself, so storing it would be redundant.';

COMMENT ON COLUMN transit_calendar.phase_end_date IS
  'This body''s next trigger of any kind (any event_type), defining the motion phase this row opens. NULL if that next trigger falls after 2046-07-31 (the phase is still open at the end of the data window).';

COMMENT ON COLUMN transit_calendar.sign_egress_date IS
  'Date this body finally leaves the sign named in `sign` (or north_sign/south_sign, for Nodes). NULL if that egress falls after 2046-07-31.';

-- Step 3: aspect_calendar -- all dated sky-sky events: the five major
-- aspects among the tracked bodies (Moon excluded, except inside eclipse
-- rows), plus eclipses.
CREATE TABLE aspect_calendar (
  id                 text PRIMARY KEY,
  event              text NOT NULL,
  body_1             text NOT NULL,
  body_2             text NOT NULL,
  body_1_sign        text NOT NULL,
  body_2_sign        text NOT NULL,
  window_start       date,
  window_end         date,
  exact_date         date,
  pass_n             integer,
  pass_m             integer,
  body_1_retrograde  boolean,
  body_2_retrograde  boolean,
  exact_degree       float8,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (event NOT IN ('Solar Eclipse', 'Lunar Eclipse') AND body_1 <> 'Moon' AND body_2 <> 'Moon')
    OR
    (event IN ('Solar Eclipse', 'Lunar Eclipse') AND body_1 = 'Sun' AND body_2 = 'Moon')
  ),
  CHECK (event IN ('conjunction', 'sextile', 'square', 'trine', 'opposition', 'Solar Eclipse', 'Lunar Eclipse'))
);

CREATE INDEX aspect_calendar_pair_window_idx ON aspect_calendar (body_1, body_2, window_start);
CREATE INDEX aspect_calendar_exact_date_idx ON aspect_calendar (exact_date);

ALTER TABLE aspect_calendar ENABLE ROW LEVEL SECURITY;
-- Same default-deny / service-role-only pattern as transit_calendar above.

COMMENT ON TABLE aspect_calendar IS
  'All dated sky-sky events -- the five major aspects among tracked bodies (Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto; Moon excluded entirely except inside eclipse rows) plus eclipses -- derived purely from sky_positions (2023-01-01 to 2046-07-31). DATA MODEL LAW: rows are events, content units are windows. Multiple exact rows sharing one continuous orb window (identical window_start and window_end) are ONE story for any content-generation or grouping consumer -- "in orb X to Y, exacting m times" is one block, never m blocks. There is no static limit on exacts per window. Any future consumer must group by the shared window, never by row count. A window a body pair enters but stations and leaves without perfecting is one row with a NULL exact_date -- a valid, factual "no exact" state, not a gap. EDGE-WINDOW RULE (ratified): a window already open on 2023-01-01 (the data''s first day) or still open on 2046-07-31 (the data''s last day) is dropped entirely, never written -- its true start or close falls outside the data, so no window_start, pass count, or "no exact" row is fabricated for it. This table therefore has no rows whose window genuinely straddles either edge of the 2023-2046 range. DATING CONVENTION (ratified): every event is stamped with its actual UTC calendar date -- always the EARLIER of the two daily sky_positions snapshots bracketing the true crossing/exactness moment, never the later snapshot that first reveals the change. See the exact_date column comment for detail.';

COMMENT ON COLUMN aspect_calendar.event IS
  'conjunction | sextile | square | trine | opposition | Solar Eclipse | Lunar Eclipse. Eclipses use this same field, with no separate kind/subtype column (total/partial/annular deliberately excluded).';

COMMENT ON COLUMN aspect_calendar.body_1 IS
  'The faster body in the canonical speed order (Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto). Sun, for eclipse rows -- eclipses are the only Sun-Moon events in this table.';

COMMENT ON COLUMN aspect_calendar.body_2 IS
  'The slower body in the canonical speed order. Moon, for eclipse rows.';

COMMENT ON COLUMN aspect_calendar.body_1_sign IS
  'body_1''s sign at the relevant date (exact_date, or window_start for a no-exact row). For eclipse rows, body_1 is always Sun, so this is simply the Sun''s own sky_positions row on the eclipse date -- no exception needed here (see body_2_sign for the eclipse-specific rule).';

COMMENT ON COLUMN aspect_calendar.body_2_sign IS
  'body_2''s sign at the relevant date. ECLIPSE EXCEPTION (ratified, deliberate -- do not "fix" this to read the Moon''s own row): for a Solar Eclipse this equals body_1_sign (conjunction, same sign). For a Lunar Eclipse this is DERIVED as the sign exactly opposite body_1_sign (the Sun''s sign), never read from the Moon''s own sky_positions row. Reason: the Sun moves under 1 degree/day, so its daily snapshot sits within about half a degree of the true eclipse moment; the Moon moves 13+ degrees/day, so its own snapshot can be many degrees off and even land on the wrong side of a sign boundary. The Sun''s row is simply the more precise source for both bodies at an eclipse.';

COMMENT ON COLUMN aspect_calendar.window_start IS
  'Start of the continuous orb window. Shared verbatim by every row belonging to that window. NULL for eclipse rows, which have no orb-window concept.';

COMMENT ON COLUMN aspect_calendar.window_end IS
  'End of the continuous orb window. Shared verbatim by every row belonging to that window. NULL for eclipse rows.';

COMMENT ON COLUMN aspect_calendar.exact_date IS
  'The exact-perfection date. NULL only for a "no exact" row -- a window the pair entered and left without perfecting. For eclipse rows, this is the eclipse date. DATING CONVENTION (ratified): dated to the earlier of the two daily sky_positions snapshots bracketing the true crossing moment -- e.g. a crossing at 07:40 UTC on the 14th is dated the 14th, never the 15th (whose snapshot is merely the first to show the change already happened). The fractional position within that day is used only to interpolate exact_degree, never to round the date toward the later snapshot.';

COMMENT ON COLUMN aspect_calendar.pass_n IS
  'This row''s pass number within its window''s full sequence of exact perfections. NULL for "no exact" rows and eclipse rows.';

COMMENT ON COLUMN aspect_calendar.pass_m IS
  'Total number of exact perfections counted across this row''s window. NULL for "no exact" rows and eclipse rows.';

COMMENT ON COLUMN aspect_calendar.exact_degree IS
  'Degree within sign shared by both bodies at exactness (all five major aspects land on the same degree number by construction, since sign-consonant separations are exact multiples of 30 degrees), or the eclipse''s degree. NULL for "no exact" rows. ECLIPSE EXCEPTION (ratified, deliberate -- do not "fix" this to average in or read from the Moon''s row): for eclipse rows, always the SUN''s own degree specifically, for the same precision reason documented on body_2_sign -- the Sun''s sub-1-degree/day motion makes its snapshot far more accurate at the eclipse moment than the Moon''s 13+ degree/day snapshot. SIGN-BOUNDARY VERIFICATION (done): all 104 eclipse rows were checked for a Sun-derived sign/degree within 1 degree of a sign boundary (a risk that the Sun crossed that boundary later the same UTC day the snapshot was taken from). 5 rows genuinely straddled a same-day crossing and were checked against NASA''s published greatest-eclipse time; 2 (2031-05-21, 2039-06-21) had their sign/degree corrected to the far side of the crossing. See scripts/load-eclipses.mjs for the full record.';
