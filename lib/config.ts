// Dogfood-build configuration. Not a secret — just the one chart this
// unlinked build phase targets, kept out of page code per the build's rules.
export const DOGFOOD_READING_SLUG = 'hejkhjq1zns5';

// The constructed demonstration reading ("Sample," not a real person —
// SPEC §16, Sep 2 2026) that the pre-purchase homepage's "see example"
// link points at. Single source of truth, same pattern as
// DOGFOOD_READING_SLUG above.
export const EXAMPLE_READING_SLUG = 'sample';

// Natal reading price — SINGLE SOURCE OF TRUTH. This is the only place the
// price is set. Checkout (app/api/checkout/route.ts) builds the Stripe charge
// inline from this number every time (unit_amount: NATAL_READING_PRICE_USD *
// 100) — it does NOT read a Price stored in Stripe. Every on-site display
// (HomeBirthChartPanel, MobileHomePage, HomeMyChartFormPanel, all via
// HomeOrderForm) also reads this same constant. That means editing a price in
// the Stripe Dashboard has NO EFFECT on what this site charges or shows — to
// change the price, change this number and redeploy. Per AGENTS.md ("Prices
// are placeholders. Never hardcode a price; use config values").
export const NATAL_READING_PRICE_USD = 16;

// Transit generation cost tracking. Placeholders (0) until Avery sets real
// Opus prices from the Anthropic console — never guess a number here.
// Units: USD per MILLION tokens, matching Anthropic's published/console
// units; generation_cost_usd math divides by 1,000,000.
export const TRANSIT_GENERATION_PRICING_USD_PER_MILLION_TOKENS = {
  input: 0,
  output: 0,
  cacheWrite: 0,
  cacheRead: 0,
};

// Natal generation cost tracking (dry/real-run script console output only --
// readings has no cost column, unlike transit_pieces, so this isn't
// persisted). Same placeholder-until-Avery-sets-real-prices rule as above.
export const NATAL_GENERATION_PRICING_USD_PER_MILLION_TOKENS = {
  input: 0,
  output: 0,
  cacheWrite: 0,
  cacheRead: 0,
};
