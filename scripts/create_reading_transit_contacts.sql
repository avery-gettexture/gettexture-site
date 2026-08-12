-- Stage 1 (structured aspect tables, per docs/SPEC.md): reading_transit_
-- contacts and its child table reading_natal_activations. These persist the
-- STRUCTURED version of what contact-engine.mjs already computes for a
-- NATAL_CONTACT timeline entry -- today that data is stringified into brief
-- text and only {id, prose} survives into transit_pieces. See docs/SPEC.md
-- for the full record.
--
-- Both tables are created EMPTY here. No data is written, no backfill runs,
-- and no engine/assembler code changes in this step -- these tables are
-- unused until a later stage wires writes. This migration does not touch
-- any existing table.
--
-- TIMELESS FACTS, NOT PHASE-SCOPED SNAPSHOTS: a contact's own window/pass
-- numbers are intrinsic to the contact itself (computed once across the
-- transiting body's full passage), never "which phase was current when this
-- was computed." There is deliberately no trigger_id / phase column here --
-- phase membership is a read-time query against window_start/window_end,
-- since SPEC.md's phase-membership rule (strict overlap) allows one contact
-- window to belong to two adjacent phases at once, which a single stored
-- phase link could never represent correctly.
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner) -- same route used for every
-- prior migration in this repo.

CREATE TABLE reading_transit_contacts (
  id                              text PRIMARY KEY,  -- {reading_slug}-{contact_id}, lowercased
  reading_slug                    text NOT NULL,
  contact_id                      text NOT NULL,     -- bare engine-minted ID (mintContactId / mintAxisContactId output)
  body                            text NOT NULL,      -- the transiting body
  natal_point                     text NOT NULL,      -- the natal receiving point
  natal_point_sign                text,               -- NULL when natal_point = 'Axis' (see north/south below)
  natal_point_north_sign          text,               -- Axis rows only
  natal_point_south_sign          text,               -- Axis rows only
  natal_point_degree              float8 NOT NULL,
  natal_point_house               text,               -- NULL when the reading's birth time is unknown
  aspect                          text NOT NULL,       -- conjunction | sextile | square | trine | opposition
  axis_involved                   boolean NOT NULL,
  axis_kind                       text,                -- conjunct-node-north | conjunct-node-south | square-node-axis; axis-involved rows only
  transiting_sign                 text NOT NULL,
  window_start                    date NOT NULL,
  window_end                      date NOT NULL,
  still_open_at_series_end        boolean NOT NULL,
  exact_date                      date,                -- NULL = a window that opened and closed without perfecting
  exact_degree                    float8,              -- NULL when exact_date is NULL
  transiting_retrograde_at_exact  boolean,             -- NULL when exact_date is NULL
  passage_window_index            integer NOT NULL,
  passage_window_count            integer NOT NULL,
  passage_pass_index              integer,             -- NULL when exact_date is NULL
  passage_pass_count              integer NOT NULL,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reading_slug, contact_id),
  CHECK (body IN ('Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Nodes')),
  CHECK (natal_point IN ('Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'MC', 'Axis')),
  CHECK (aspect IN ('conjunction', 'sextile', 'square', 'trine', 'opposition')),
  CHECK (axis_kind IS NULL OR axis_kind IN ('conjunct-node-north', 'conjunct-node-south', 'square-node-axis')),
  CHECK (axis_involved = (body = 'Nodes' OR natal_point = 'Axis'))
);

CREATE INDEX reading_transit_contacts_reading_body_idx ON reading_transit_contacts (reading_slug, body);
CREATE INDEX reading_transit_contacts_exact_date_idx ON reading_transit_contacts (exact_date);

ALTER TABLE reading_transit_contacts ENABLE ROW LEVEL SECURITY;
-- No policies defined on purpose: default-deny to anon/authenticated roles,
-- matching how transit_pieces was created (before its later slug-gated
-- get_transit_pieces_by_slug function was added). Server code reads/writes
-- using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. No RPC is built in
-- this step -- if a future feature ever needs the app to read this table
-- directly, a get_reading_transit_contacts_by_slug function (same shape as
-- get_transit_pieces_by_slug) would be the path, noted here, not built now.

COMMENT ON TABLE reading_transit_contacts IS
  'Structured, per-reading record of every transit-planet-vs-natal-point contact (the NATAL_CONTACT timeline entry, per docs/SPEC.md 11A.8), computed once across the transiting body''s full tracked history -- not scoped to any one phase or brief. TIMELESS FACTS: window/pass numbers are intrinsic to the contact itself; which phase a contact currently belongs to is a read-time query against window_start/window_end, never a stored column (a window can overlap two adjacent phases at once, which a single stored phase link could not represent). Regeneration is an idempotent upsert by id (reading_slug + contact_id) -- contact_id already encodes the exact date and pass number, so a genuinely new pass mints a new id naturally; no row versioning is needed. Unused until a later stage wires the assembler to write to it.';

COMMENT ON COLUMN reading_transit_contacts.contact_id IS
  'The bare engine-minted ID from contact-engine.mjs (mintContactId or mintAxisContactId) -- NOT globally unique on its own, since it encodes the natal point''s NAME (e.g. "Sun") but not its sign/degree, so two different readings can produce the identical contact_id for genuinely different placements. reading_slug is prefixed onto the primary key id for that reason.';

COMMENT ON COLUMN reading_transit_contacts.natal_point_sign IS
  'NULL only when natal_point = ''Axis'' -- axis rows carry natal_point_north_sign/natal_point_south_sign instead, mirroring transit_calendar''s own sign/north_sign/south_sign convention for Nodes rows.';

COMMENT ON COLUMN reading_transit_contacts.aspect IS
  'The five majors, same vocabulary as aspect_calendar.event (minus the eclipse values, which never apply here). For axis-involved rows this is the aspect EQUIVALENT to the row''s dist value (0=conjunction, 3=square, 6=opposition per contact-engine.mjs''s AXIS ASPECT RESTRICTION) -- axis_kind carries the north/south-specific label the plain aspect name can''t distinguish.';

COMMENT ON COLUMN reading_transit_contacts.still_open_at_series_end IS
  'True when this window was still in orb at the end of the tracked sky_positions data (2046-07-31) -- distinct from "remains in orb at phase close," which is a read-time comparison against a specific phase''s own end date. Carried through from contact-engine.mjs''s finalizeContactWindow even though the current brief text does not render it, since it is a real structural fact the engine already computes.';

COMMENT ON COLUMN reading_transit_contacts.passage_pass_index IS
  'This row''s pass number within its own PASSAGE-scoped sequence of exact perfections (contact-engine.mjs''s filterAndGroupForPassage) -- NULL for a "no exact" row. passage_pass_count (always populated) is the group''s total, visible on every row in the group per the same convention aspect_calendar uses for pass_n/pass_m.';

-- ── Child table: reading_natal_activations ──────────────────────────────
--
-- One row per "a third planet activated this contact" fact (docs/SPEC.md
-- 11A.8's ACTIVATIONS block), foreign-keyed to the host contact above.
-- NORMALIZED CHILD TABLE, not a JSONB column on the parent -- the founder's
-- explicit call: the point of this refactor is queryable structured data,
-- and a JSONB blob reintroduces the same unqueryable-blob problem this
-- whole stage exists to fix, just at a smaller scale. Follows the
-- eclipse_aspects precedent (its own table, own engine-minted id, FK to the
-- row it enriches) rather than aspect_calendar's occasional inline pattern.
--
-- The SKY_ASPECT leg (the third planet vs. the host contact's own
-- transiting planet) is NOT duplicated here -- that fact is chart-
-- independent and already lives on aspect_calendar, reached via
-- sky_aspect_id. Only the NATAL_ASPECT leg (genuinely reading-specific,
-- since it depends on the SAME natal point''s placement) and the
-- activation's own computed facts (anchor date, before/after-host-orb) are
-- stored here.

CREATE TABLE reading_natal_activations (
  id                          text PRIMARY KEY,  -- {reading_slug}-{activation_id}, lowercased
  reading_slug                text NOT NULL,
  activation_id                text NOT NULL,     -- bare engine-minted ID (mintActivationId output)
  host_contact_id              text NOT NULL REFERENCES reading_transit_contacts(id) ON DELETE CASCADE,
  candidate_body                text NOT NULL,     -- the third planet (B)
  sky_aspect_id                 text NOT NULL REFERENCES aspect_calendar(id),  -- leg 1: candidate vs. the host's own transiting planet
  anchor_date                   date NOT NULL,
  perfects_before_host_orb      boolean NOT NULL,
  perfects_after_host_orb       boolean NOT NULL,
  natal_aspect                  text NOT NULL,     -- leg 2: candidate's own aspect type to the SAME natal point
  natal_aspect_window_start     date NOT NULL,
  natal_aspect_window_end       date NOT NULL,
  natal_aspect_exact_date       date,
  natal_aspect_exact_degree     float8,
  candidate_motion_state        text NOT NULL,     -- direct | retrograde
  created_at                    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reading_slug, activation_id),
  CHECK (natal_aspect IN ('conjunction', 'sextile', 'square', 'trine', 'opposition')),
  CHECK (candidate_motion_state IN ('direct', 'retrograde')),
  CHECK (NOT (perfects_before_host_orb AND perfects_after_host_orb))
);

CREATE INDEX reading_natal_activations_host_idx ON reading_natal_activations (host_contact_id);
CREATE INDEX reading_natal_activations_reading_idx ON reading_natal_activations (reading_slug);

ALTER TABLE reading_natal_activations ENABLE ROW LEVEL SECURITY;
-- Same default-deny / service-role-only posture as reading_transit_contacts
-- above -- no policies, no RPC built in this step.

COMMENT ON TABLE reading_natal_activations IS
  'Structured, per-reading record of a third planet activating a NATAL_CONTACT (docs/SPEC.md 11A.8''s ACTIVATIONS block) -- a two-leg fact: SKY_ASPECT (the candidate planet reaching the 1-degree exact band with the host contact''s own transiting planet, chart-independent, referenced via sky_aspect_id rather than duplicated) and NATAL_ASPECT (that same candidate''s own contact to the SAME natal point, reading-specific, stored here in full since it is not guaranteed to already exist as its own reading_transit_contacts row). TIMELESS: anchor_date and perfects_before/after_host_orb are intrinsic facts about the activation itself, not a phase-scoped snapshot. ON DELETE CASCADE: deleting/regenerating a host contact removes its activations with it.';

COMMENT ON COLUMN reading_natal_activations.activation_id IS
  'The bare engine-minted ID from contact-engine.mjs (mintActivationId(skyId, natalPointName)) -- like reading_transit_contacts.contact_id, not globally unique on its own (natalPointName is a generic name, not reading-specific), hence the reading_slug prefix on the primary key id.';

COMMENT ON COLUMN reading_natal_activations.perfects_before_host_orb IS
  'True when the SKY_ASPECT leg''s own exact date falls before the host contact''s orb window opened -- mutually exclusive with perfects_after_host_orb (both false means it perfects within the host''s own window, or there is no exact at all). Drives the brief''s "before this contact begins" / "after this contact separates" phrasing.';

COMMENT ON COLUMN reading_natal_activations.natal_aspect_exact_date IS
  'The candidate''s own NATAL_ASPECT exact-perfection date -- NULL for a "no exact" contact. Independent of the host contact''s own exact_date; the two are computed from different windows.';
