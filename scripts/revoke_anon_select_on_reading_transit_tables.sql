-- PRE-LAUNCH HARDENING (Sep 8, 2026) -- closes gap 1 from the Supabase
-- security review recorded in docs/SPEC.md Section 16.
--
-- The three per-reading transit tables below already have Row Level Security
-- turned ON with no policies, so the public ("anon") key cannot actually read
-- any rows from them. But they still carry Postgres's default SELECT grant for
-- the anon role left over from when they were created. The practical effect of
-- that leftover grant: a public request gets back an empty list instead of a
-- flat "permission denied." Our most sensitive tables (readings,
-- reading_contacts, transit_pieces) had that grant removed so the public key
-- is denied outright -- see scripts/lock_readings_and_transit_pieces.sql.
--
-- This script removes the same leftover grant from the three transit tables so
-- they match that stronger "denied" posture. It changes NO data, does NOT
-- touch Row Level Security, does NOT touch any function, and does NOT touch any
-- other table. It is purely defense-in-depth.
--
-- Run this once, in full, in the Supabase project's SQL editor (or any client
-- authenticated as the database owner) -- the same route used for the other
-- lock scripts.

REVOKE SELECT ON reading_transit_contacts  FROM anon;
REVOKE SELECT ON reading_natal_activations FROM anon;
REVOKE SELECT ON reading_eclipse_catches   FROM anon;
