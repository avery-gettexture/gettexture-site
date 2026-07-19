-- Follow-up to create_transit_and_aspect_calendars.sql: documents the
-- ratified eclipse sign/degree convention (Sun's row is the source for
-- both bodies, never the Moon's) and records that all 104 eclipse rows
-- were checked for sign-boundary risk (2 corrected as a result). Adds
-- column comments for body_1_sign and body_2_sign (never previously
-- commented individually) and extends the exact_degree comment. Safe to
-- run any time -- COMMENT ON is idempotent and touches no data. Run this
-- once, against the same Supabase project, the same way as the earlier
-- follow-up files.

COMMENT ON COLUMN aspect_calendar.body_1_sign IS
  'body_1''s sign at the relevant date (exact_date, or window_start for a no-exact row). For eclipse rows, body_1 is always Sun, so this is simply the Sun''s own sky_positions row on the eclipse date -- no exception needed here (see body_2_sign for the eclipse-specific rule).';

COMMENT ON COLUMN aspect_calendar.body_2_sign IS
  'body_2''s sign at the relevant date. ECLIPSE EXCEPTION (ratified, deliberate -- do not "fix" this to read the Moon''s own row): for a Solar Eclipse this equals body_1_sign (conjunction, same sign). For a Lunar Eclipse this is DERIVED as the sign exactly opposite body_1_sign (the Sun''s sign), never read from the Moon''s own sky_positions row. Reason: the Sun moves under 1 degree/day, so its daily snapshot sits within about half a degree of the true eclipse moment; the Moon moves 13+ degrees/day, so its own snapshot can be many degrees off and even land on the wrong side of a sign boundary. The Sun''s row is simply the more precise source for both bodies at an eclipse.';

COMMENT ON COLUMN aspect_calendar.exact_degree IS
  'Degree within sign shared by both bodies at exactness (all five major aspects land on the same degree number by construction, since sign-consonant separations are exact multiples of 30 degrees), or the eclipse''s degree. NULL for "no exact" rows. ECLIPSE EXCEPTION (ratified, deliberate -- do not "fix" this to average in or read from the Moon''s row): for eclipse rows, always the SUN''s own degree specifically, for the same precision reason documented on body_2_sign -- the Sun''s sub-1-degree/day motion makes its snapshot far more accurate at the eclipse moment than the Moon''s 13+ degree/day snapshot. SIGN-BOUNDARY VERIFICATION (done): all 104 eclipse rows were checked for a Sun-derived sign/degree within 1 degree of a sign boundary (a risk that the Sun crossed that boundary later the same UTC day the snapshot was taken from). 5 rows genuinely straddled a same-day crossing and were checked against NASA''s published greatest-eclipse time; 2 (2031-05-21, 2039-06-21) had their sign/degree corrected to the far side of the crossing. See scripts/load-eclipses.mjs for the full record.';
