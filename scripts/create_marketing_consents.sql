-- MARKETING OPT-IN (Part 1): marketing_consents -- the list of people who
-- explicitly consented, at checkout, to receive marketing / product-update
-- emails. No emails are sent yet; this only starts building the list.
--
-- DELIBERATELY SEPARATE from reading_contacts. reading_contacts.email is
-- transactional -- it is necessary to deliver the reading (the link email).
-- THIS table is marketing consent, a different legal basis (opt-in consent,
-- not contract performance). The two are never conflated: a buyer who does
-- NOT tick the opt-in box still gets a reading_contacts row and their
-- reading; they just get no row here.
--
-- Same locked posture as reading_contacts
-- (scripts/create_reading_contacts.sql): RLS enabled, ZERO policies, and no
-- SECURITY DEFINER function of any kind. With RLS on plus zero policies plus
-- zero exposing functions there is no public path in at all -- anon and
-- authenticated get nothing, direct or indirect. Only
-- SUPABASE_SERVICE_ROLE_KEY (the Stripe webhook, admin scripts) can read or
-- write this table, and it bypasses RLS entirely.
--
-- unsubscribe_token is generated now even though nothing uses it yet -- it
-- is cheap to add and saves a schema migration once the email program
-- exists. It is left untouched on re-opt-in (see the webhook upsert).
--
-- Run this once, in full, against the Supabase project's SQL editor (or any
-- client authenticated as the database owner) -- same route used for every
-- prior migration in this repo. This does not touch any other table.

CREATE TABLE marketing_consents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL UNIQUE,
  consented_at      timestamptz NOT NULL DEFAULT now(),
  source            text        NOT NULL DEFAULT 'checkout',
  unsubscribe_token uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE marketing_consents ENABLE ROW LEVEL SECURITY;
-- No policies defined, on purpose -- and no exposing function either. With
-- RLS on and zero policies plus zero functions there is no public path in:
-- anon and authenticated get nothing. Only the service-role key (which
-- bypasses RLS) can reach this table.
REVOKE ALL ON marketing_consents FROM anon, authenticated;

COMMENT ON TABLE marketing_consents IS
  'People who explicitly opted in, at checkout, to marketing / product-update emails. Marketing consent only -- deliberately separate from reading_contacts (whose email is transactional, necessary to deliver the reading). One row per email (UNIQUE); the Stripe webhook upserts on email so a repeat opt-in refreshes consented_at/source and leaves unsubscribe_token/created_at untouched. RLS on, zero policies, no exposing function -- service-role access only. No emails are sent from this list yet.';

COMMENT ON COLUMN marketing_consents.source IS
  'Where the consent was captured. Only ''checkout'' today (the order-review modal opt-in checkbox in HomeOrderForm.tsx). Free-form for future capture points.';

COMMENT ON COLUMN marketing_consents.unsubscribe_token IS
  'Per-person opaque token for future one-click unsubscribe links. Generated now, unused until the email program exists. Never regenerated on re-opt-in.';
