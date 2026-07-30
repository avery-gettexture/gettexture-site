-- STAGE THREE (Step 1): reading_contacts -- moves the one sensitive
-- field left in `readings` (email) into its own locked table, and adds
-- full_name as a new, currently-empty column for future billing/
-- identity capture. Keyed 1:1 on readings.id (uuid, confirmed against
-- the live schema before writing this file) -- an internal primary key
-- that is never sent to the browser, unlike stripe_session_id (which
-- rides in the post-checkout redirect URL and was ruled out for that
-- reason). See docs/SPEC.md for the Stage Three record.
--
-- Run this once, in full, against the Supabase project's SQL editor (or
-- any client authenticated as the database owner) -- same route used
-- for every prior migration in this repo. This does not touch any
-- other table; it does not migrate any data (that's Step 2).

CREATE TABLE reading_contacts (
  reading_id  uuid PRIMARY KEY REFERENCES readings(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,               -- left empty at creation; future billing/identity capture
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reading_contacts ENABLE ROW LEVEL SECURITY;
-- No policies defined, on purpose -- and unlike readings/transit_pieces,
-- no SECURITY DEFINER function is created for this table either. With
-- RLS on and zero policies plus zero exposing functions, there is no
-- public path in at all: anon and authenticated get nothing, direct or
-- indirect. Only SUPABASE_SERVICE_ROLE_KEY (webhook, admin scripts) can
-- read or write this table, and it bypasses RLS entirely.
REVOKE ALL ON reading_contacts FROM anon, authenticated;

COMMENT ON TABLE reading_contacts IS
  'Sensitive identity/contact fields split out of readings (Stage Three). One row per reading, keyed 1:1 on reading_contacts.reading_id = readings.id (never the slug, never sent to the browser). No RLS policy and no exposing function exist for this table -- server-role access only. ON DELETE CASCADE: deleting a reading removes its contact row too (privacy-motivated founder ruling, July 2026).';

COMMENT ON COLUMN reading_contacts.full_name IS
  'New as of Stage Three, left NULL/empty for all existing rows -- not backfilled from any prior data. Reserved for a future billing/identity capture flow.';
