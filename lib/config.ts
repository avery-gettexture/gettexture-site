// Dogfood-build configuration. Not a secret — just the one chart this
// unlinked build phase targets, kept out of page code per the build's rules.
export const DOGFOOD_READING_SLUG = 'hejkhjq1zns5';

// Natal reading price. Placeholder per AGENTS.md ("Prices are placeholders.
// Never hardcode a price; use config values") — currently matches the live
// Stripe checkout amount (app/api/checkout/route.ts), so the two can't drift
// out of sync. Displayed on the pre-purchase home (app/page.tsx).
export const NATAL_READING_PRICE_USD = 29;

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
