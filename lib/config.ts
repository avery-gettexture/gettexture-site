// Dogfood-build configuration. Not a secret — just the one chart this
// unlinked build phase targets, kept out of page code per the build's rules.
export const DOGFOOD_READING_SLUG = 'hejkhjq1zns5';

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
