-- Legal revisions Part C item 1 (docs/TEXTURE_LEGAL_REVISIONS.md): the
-- Terms page's new Section 19 asserts that the user acknowledges, at
-- checkout, waiving their statutory withdrawal/cooling-off right for
-- digital content once generation begins. This column is the proof of
-- that consent -- a timestamp captured client-side the moment the
-- checkout review modal's waiver checkbox is checked, carried through
-- Stripe session metadata, and written here by the webhook at the same
-- time the reading row itself is created.
--
-- Server-side/audit field only -- NOT added to the get_reading_by_slug
-- anon RPC (scripts/add_nodes_column.sql), since the reading display
-- page has no reason to expose it. NULL on any row created before this
-- column existed.
--
-- Run this once against the Supabase project (SQL editor, or any client
-- authenticated as the database owner). It only adds a column -- no
-- existing data is touched.

ALTER TABLE readings ADD COLUMN IF NOT EXISTS waiver_acknowledged_at timestamptz;

COMMENT ON COLUMN readings.waiver_acknowledged_at IS
  'Timestamp the buyer checked the checkout review modal''s withdrawal-waiver acknowledgment checkbox (HomeOrderForm.tsx), captured client-side and carried through via Stripe checkout session metadata (waiver_acknowledged_at) to the stripe-webhook insert. Proof of consent for the Terms Section 19 immediate-performance / withdrawal-right-waiver clause. NULL for any reading created before this column existed.';
