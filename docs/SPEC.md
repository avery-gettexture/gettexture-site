# TEXTURE — BUILD SPEC
## Decision Record & Build Requirements
*Consolidated July 2026 from founder planning sessions. Supersedes the prior SPEC.md and its Part II addendum — this is the single file. All decisions belong to the founder. Items marked OPEN or DEFERRED must not be assumed by any build session — ask or leave stubbed.*

---

## 0. HOW TO USE THIS DOCUMENT

This is the source of truth for the build. Every DECIDED item is a requirement. Every OPEN item needs a founder ruling before its build step. Every DEFERRED item is intentionally postponed — do not build it, do not foreclose it.

Items marked **[PROPOSED LANGUAGE]** are rationale prose drafted from founder rulings but not yet ratified as spec text. The ruling itself stands; the wording awaits approval.

Companion references in repo / project knowledge:
- `PROJECT_SUMMARY.md` — current product, stack, schema, natal pipeline
- `BRAND_VOICE_AND_IDENTITY.md` — voice, tone, refusals
- Natal prompts (current revisions): `SYNTHESIS_CALL_1_v12.md`, `SYNTHESIS_CALL_2_v1.md` (formerly Call 3 — see §10.1)
- Transit prompts (current revisions): `TRANSIT_C_CALL_1_v4.md`, `TRANSIT_CALL_2_v3.md`
- App-era transit prompts (archive/reference): `transit_a_c1/c3` (collective — archived, ignore), `transit_c_c1/c3` (chart-grounded — base of the current revision), `transit_c_sunmoon_c1/c3` (superseded — retired)
- App-era `transit_calendar` table (Supabase) and app UI (`transits.tsx`, `detail.tsx`)
- `create_sky_positions.sql` — the ephemeris table DDL (executed; see §11.1)

**Process law — binding on all sessions working from this document:**
Founder makes ALL decisions; nothing is marked decided without explicit confirmation. Full verbatim text is surfaced for every proposed change to any prompt or governing document; prompt language is never compressed or summarized; changes are additive-only unless a removal is explicitly ruled; every assembly is verified by snapshot diff with removed lines enumerated; judgment calls and unratified language are flagged, never silently included.

---

## 1. PRODUCT IDENTITY — DECIDED

Texture is a relationship between a person's chart and the moving sky, not a one-time document. Two objects:

1. **The natal reading** — permanent artifact. Full-chart context, permanent shareable URL. Exists today. **Now 13 placements**, not 14 — the nodes are consolidated into one axis piece (§4.1). Otherwise unchanged by this build except the parity items in §9.
2. **Transits** — a monthly subscription instrument. Standing per-planet interpretations of the current sky against the subscriber's natal chart, a transit calendar, and email as the watchfulness mechanism.

Core thesis (governs all tradeoffs): astrology's value is context. Planet = what energy, sign = how it moves, house = where it plays out, aspects = what it's in relationship with. The product's differentiator is honest, chart-specific synthesis — focus and triage, not content volume.

Value statement (for copy, logged): *"We watch your chart so you don't have to, and we only raise our hand when something's worth your attention."* Silence is the instrument working. Fewer notifications = the triage doing its job.

---

## 2. THE OFFER — DECIDED (prices OPEN)

Two independent doors, one room:

- **Door A — Subscribe to Transits.** The natal reading is INCLUDED, free, and remains theirs permanently regardless of subscription status.
- **Door B — Buy the natal reading standalone.** Complete product, no strings, no card retained, nothing to cancel. Carries a standing invitation to subscribe later at ~50% off the first month (exact mechanics OPEN — see §12.2).

Rules:
- No trials. No auto-attaching subscriptions. The discount invitation replaces trial mechanics.
- Gifting is solved by Door B: nothing attaches to the recipient.
- Natal reading price and subscription price are INDEPENDENT numbers. No symmetry constraint.
- **Prices: OPEN — decided last.** Positioning stance logged: subscription earns the high end of the astro-subscription band (~$9–12/mo market range) on personalization depth + honest triage. Placeholder used in planning: $12. DO NOT hardcode prices; config value.
- No annual pricing for now (DECIDED). Do not foreclose it architecturally.

**Free layer — DECIDED:** "Today's Texture" page, math only, no generated or written content:
- Daily sky wheel (new component, pairs with natal wheel)
- Current positions, signs, motion (retrograde flags)
- Active sky-level aspects; notable upcoming events
- The sole content preview anywhere on the site is the public **sample reading** (subject OPEN/deferred; criteria: deceased public figure, Rodden AA-rated birth data, culturally warm, astrologically interesting chart. NOT the founder's chart — firm boundary.)

**Paywall principle — DECIDED:** the line is birth data. Anything true of the sky for everyone = free. Anything requiring YOUR chart = paid. (Moon content sits paid-side because its closes are rising-sign-derived.)

---

## 3. TRANSIT CONTENT ARCHITECTURE — DECIDED

### 3.1 Standing pieces (per subscriber, per body)
Full standing pieces for: Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, and **Nodes (one piece, axis treated as a unit — both ends, both houses)**. Moon is the ONLY body excluded (see §3.6).

- **Length:** the synthesis prose targets ~200 words and may flex ~50 either way with the depth of the standing condition; timeline entries scale with the sky, governed by honest weight rather than a fixed count (§10.2).
- **Piece shape:** synthesis prose + timeline entries (the two-layer output — §10.2). This supersedes the earlier uniform-prose skeleton.
- **Itinerary-anchored, not degree-anchored:** the piece references dated events, never "current position," so it stays accurate for its whole lifespan.
- **Regeneration triggers (the ONLY triggers):** sign ingress (incl. retrograde re-ingress), station retrograde, station direct. Every trigger = FULL rewrite. Nodes piece regenerates only on nodal sign change (~18 months).
- **Eclipses:** NO eclipse-triggered generation. The Nodes piece bakes in the full eclipse itinerary for its lifespan at write time (dates, degrees, houses, configurations, any natal contacts within orb). Eclipse-day touch = notification + link into the eclipse's timeline entry by ID.

### 3.2 The temporal model (governs all transit content)
- A piece covers one **motion phase** — the stretch between the significant change that opened it and the next one coming (ingress→station, station→station, station→egress).
- **Vantage rule:** the piece knows and states the full passage as fact; it interprets the current phase only. Past and future crossings are referenced as astronomical events, never as experiences. The phase names its own dated boundaries — what opened it, what closes it.
- **Editions stand alone.** A subscriber may arrive mid-passage; every edition is a complete account of where the passage stands now, legible with nothing read before it.
- **The sign passage is the story; motion is the lens.** Tradition-grounded hierarchy: retrogradation is a condition of movement, not a headline event. The pop inversion (Mercury retrograde as subject, the sign as footnote) is a quality failure.
- **Out-of-phase contacts:** ~~undated pass summaries only (the `PASSAGE_CONTACTS` field)~~ **SUPERSEDED — see §11A.8: `PASSAGE_CONTACTS` is removed entirely; passage-scoped totals live in each entry's own WINDOW/PASS fields.** No out-of-phase dates ever appear in DATES; an entry's ID may still carry one as provenance (§11A.8).
- **Long passages:** the phase's boundaries are the only dated events named. The larger passage's shape is characterized, never enumerated (this is what keeps a Pluto piece from becoming a date ledger).
- **The next territory is out of scope.** A piece never names, assumes, or gestures at which sign or house the planet enters next. Nothing about the next territory is in the input, so it does not exist for that piece. (This covers nodal backward motion without a special case.)

### 3.3 The contact model
Two relationship categories:
- **Copresence** — a standing, sign-level relationship, on both the natal side (natal points sharing the transited sign) and the sky side (other transiting planets sharing it). It exists **whether or not any aspect perfects**, and is interpreted regardless — including when the phase's motion means a co-present point's degree is never crossed.
- **Contacts** — dated aspect events.

Three contact-event types (SUPERSEDED — see §11A.8 for the current,
four-entry-type architecture: NATAL_CONTACT, SKY_CONTACT,
ECLIPSE_ACTIVATION, and ECLIPSE — left here for history, do not build
against this list):
- **NATAL_CONTACT** — the planet in focus aspects one natal point.
- **SKY_CONTACT** — the planet in focus aspects another transiting planet. (Moon and ordinary lunations excluded; eclipses are homed in the Nodes piece.)
- **CONFIGURATION** — SUPERSEDED by the ACTIVATION restructure (founder
  ruling; see the ENTRY/ACTIVATION MODEL comment in
  scripts/engine/assemble-brief.mjs and the qualification rule at
  §11A.8). Entries are only NATAL_CONTACT and SKY_CONTACT; a
  qualifying sky aspect attaches as a dated ACTIVATION fact on the
  relevant NATAL_CONTACT rather than merging into a third entry type.
  Left here for history; do not build against this line.

Event standard:
- A contact appears on the timeline whenever its **orb window intersects the phase**, dated by what actually happens in-phase (orb open, exact, separate — whichever fall inside).
- A contact that applies without perfecting in-phase is one entry, interpreted as an **approach**: "no exact this phase," dated at orb entry, completion acknowledged by pass reference without out-of-phase dates.
- One contact event is always one entry. Entering orb and perfecting are dates of the same event, never separate entries.

### 3.4 Aspect policy — transits
- All **14 natal points receive** transits: Sun–Pluto, ASC, MC, North Node, South Node. (The natal *reading* consolidates the nodes into one piece; the nodes remain two receiving points for transit math, delivered as axis-shaped contacts — §4.1.)
- Orbs: **3° active / 1° exact**, flat for all bodies (see §11A.3).
- **Applying weighted over separating** — stories enter loud, exit quiet (e.g., active 3° applying → 1–2° separating).
- **Sign-consonant only.** An aspect exists only where the sign relationship supports it; out-of-sign contacts within orb are not aspects in this system. This makes the sign pre-filter exact rather than approximate, and is Hellenistic-grounded (aspects were sign relationships first, degrees second).
- Significance is expressed through **notification tiering and honest weight-language in prose — never by omission.** Traditional weighting for tiering: transits to luminaries/angles heaviest; slow-to-fast heavier than fast-to-anything; outer-to-outer lightest.
- **The governing rule on weight:** "There is no weighting in terms of what is worth saying at all — there is only honest presentation of appropriate weight." Every contact appears; a one-day exact sextile is described as a one-day exact sextile so a reader who sees it on the calendar finds it in the prose and learns what it is. Omission is editorializing.

### 3.5 Unknown birth time
- Sold with **plain pre-purchase disclosure** of what the no-house version includes/omits. Prose itself carries the natal pattern's grace: no house references, no acknowledgment of absence (RISING_SIGN_KNOWN: false pattern).
- Degradations: no house context for ingresses, no ASC/MC receiving points.
- **Natal Moon contacts: EXCLUDED entirely — DECIDED.** Not included with uncertainty flags. **[PROPOSED LANGUAGE — rationale drafted from the ruling, pending approval]** Unknown birth time leaves the Moon's degree uncertain by up to ~±6.5° — more than double the 3° active orb — so a contact may not exist at all; maybe-events with hedging violate the matter-of-fact register more than absence does. The exclusion is stated plainly in the same pre-purchase disclosure that covers the no-house degradations. **Note for disclosure-writing time:** the Moon's *sign* can also be ambiguous when it changes signs on the birth date.
- **Natal parity item:** unknown-birth-time purchase path was parked at natal launch — bring it live and correct (form, disclosure copy, pipeline path).

### 3.6 Moon & ambient layer (subscriber-side)
- Moon = ambient. **12 static sign blocks + 12 rising-sign closes** (24 pieces total, written once, assembled by current Moon sign + subscriber rising). No per-user Moon generation.
- Lives inside the subscription (paywall principle).
- Likely base for adaptation: the archived `transit_a` collective prompt (three-section collective format + rising-sign close pattern). Not yet drafted.

### 3.7 Profections
- Computed per subscriber (age mod 12 → activated house → lord of the year). Lives in a "your birth chart education" section, behind paywall. No generated prose at launch.
- DEFERRED: profection-weighted transit emphasis — logged as a styling/weighting note for the Transit Calendar.

### 3.8 Volume expectation (for costing/QA)
~66 regenerations/user/year ≈ 5–6/month average (Mercury ≈ ⅓ of all). Lumpy: 3–4 quiet months, 9–10 heavy months. At current natal economics (~$0.12/piece Opus), ≈ $0.70–0.80/user/month generation cost.

---

## 4. NATAL CONTENT ARCHITECTURE — DECIDED (updates from the July natal sweep)

### 4.1 Nodes as one axis piece
- The natal reading now contains **13 placements**, not 14: the North and South Node consolidate into one **Nodes** piece.
- Rationale ratified: every aspect to one node is an aspect to the other by construction, so two pieces force either duplication or false attribution; the tradition reads the nodes as an axis in every serious school; and the natal document is the reference manual the transit layer links into — one axis object on both sides.
- Structure: **the axis is the fact; the ends are the subjects; the relationship is the synthesis.** Each end developed in its own right (its sign, house, copresences); never a sentence-level toggle between ends; the exchange between the two houses is read as one story in the synthesis and close.
- **Aspects are to the axis.** A planet conjunct one end is opposite the other — one fact, one relationship, never two aspects. Squares to the axis = the bends. The engine delivers nodal contacts **pre-merged as axis contacts**, including inside other placements' ASPECTS lists.
- No motion (RETROGRADE unused; the word "retrograde" never appears in Nodes content), no decan (a planetary dignity, not applicable to points). Degree flags apply if stated.
- **Product consequences:** placement count in copy and section structure; two background images become one (`northnodebackground.png` / `southnodebackground.png` → one Nodes asset — asset decision OPEN, §12.6); the reference dictionary keeps **both** nodes individually defined (the reading merges; the vocabulary does not).

### 4.2 Angles handling
- ASC and MC previously ran through the planet-shaped prompt with no guidance. Now explicitly handled.
- **The Ascendant establishes the 1st house** — it is not a placement residing in the first house; the chart's whole house structure descends from it. Written from that structural role; planets sharing the rising sign are presences in the Ascendant's territory.
- **The Midheaven is interpreted in its actual whole-sign house.** In Whole Sign the MC's degree falls where it falls; the input states the house; never assumed into the 10th, never treated as unusual. **Engine addition:** compute the MC's whole-sign house.
- No motion, no decan, no sect job for angles. Copresence and aspects apply in full with the angle as subject.

### 4.3 Decans (replaces the early/middle/late degree treatment)
- **Chaldean order**, ruling by the descending-speed cycle (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon) beginning with Mars at 0° Aries. Three decans of 10° per sign.
- Grounds for Chaldean over triplicity, ratified: lineage coherence with the rest of the system parameters (Whole Sign, traditional weighting); alignment with the contemporary traditional revival the product is positioned toward; the founder's established tiebreaker (the internally consistent, traditionally grounded, disclosable choice). Reversal is cheap (a lookup table + regeneration).
- The decan is a **minor dignity** — the faces tradition. It shades expression; it never defines it.
- No prior early/middle/late language existed in the prompts — the model was supplying the maturity heuristic because "the sign's arc" and "developmental quality" invited it. Those phrases are now redirected to the decan.

### 4.4 Degree flags
- **29° (anaretic)** — the sign's final degree: culmination and urgency in the placement's expression. **The anaretic keyword is "urgency"; that describes the placement's character, never the writing's — urgency framing remains banned in full.**
- **0° (ingress)** — the sign's expression at its most unconditioned.
- These are the ONLY per-degree meanings. No Sabian symbols, no per-degree symbolism, no degree-number interpretation of any kind. (Sabians are the dominant per-degree tool and are channeled oracle material — incompatible with the product's register and unavailable as verified input.)

### 4.5 Sect
- `SECT: [day | night]` — diurnal if the Sun is above the horizon at birth, nocturnal if below. Absent when birth time is unknown (standard silence; no acknowledgment).
- Teams: day = Sun, Jupiter, Saturn; night = Moon, Venus, Mars; Mercury takes the sect of its position.
- Payload concentrates in four planets: benefic of sect (Jupiter by day, Venus by night) gives most freely; benefic contrary to sect supports more conditionally; malefic of sect (Saturn by day, Mars by night) expresses difficulty more constructively; malefic contrary to sect carries the chart's less filtered friction.
- **Sect is a weighting of expression — never a verdict, never doom.** Contrary-to-sect is "this planet's friction tends to run less filtered," not a sentence.
- **Engine addition:** Sun altitude at birth → boolean.

### 4.6 Natal copresence
- The `PLANETS_IN_SAME_SIGN` field already existed; the guarantee did not. Now: **each co-present planet receives its own treatment** — the standing relationship of sharing sign and house, which exists whether or not the two are in aspect; a co-present planet beyond aspect orb is still in the placement's company and is interpreted as such.
- The stellium guardrail is unchanged and stands: three or more planets in the same sign is a stellium; two is never a stellium under any circumstances.

### 4.7 Natal orbs — widened to standard
- Previous: 3° flat. That was unusually strict and excluded contacts any working astrologer would read.
- **Now: 8° for conjunction, opposition, square, and trine; 6° for the sextile; extended to 10° when the Sun or Moon is involved — DECIDED: the luminary extension applies to the 8° aspects only; the sextile stays 6° regardless of bodies.**
- **Sign-consonant only**, consistent with the transit ruling (§3.4).
- **Orb-weight law:** an aspect under 1° is exact and named as such, interpreted at full strength; within about 3° it is close and strong; beyond that, toward the edge of orb, the contact is real but background — present at its honest softer size. The facts carry the weight.
- **Consequence:** the natal engine's aspect computation changes, the methodology page discloses the scheme, and regeneration under the new orbs surfaces aspects that pre-launch readings never mentioned. Prelaunch, this is free.

### 4.8 Natal opportunities — DEFERRED, not foreclosed
- **Dispositors** (Venus in Aries answers to Mars — where is Mars?): would deepen the context thesis; adds real QC surface. Founder ruling: hold — "a rabbit hole of potential complexity."
- **Chart-level synthesis:** parked pending founder literacy, not permanently off the table. Whole-chart reading is a knowable, checkable domain (element/modality balance, chart ruler, aspect patterns, stellium weighting, dispositor chains).

---

## 5. SYSTEM ARCHITECTURE — DECIDED (opens marked)

### 5.1 Identity, URLs, access
- **No login, no passwords, no magic links at launch.** The reading slug URL is the address of the chart's whole texture.
- **The slug is a real key at the database level (Stage Two, July 29, 2026), not just an app-level filter.** `readings` and `transit_pieces` are locked to the public (anon) role — no direct table read is possible, filtered or not. The only access path is two SECURITY DEFINER functions, `get_reading_by_slug(p_slug)` and `get_transit_pieces_by_slug(p_reading_slug)`, each of which requires the slug as an input and returns nothing without a match. A plain RLS policy can't express "filtered reads succeed, unfiltered reads return nothing" — a policy has no way to see whether a request named a slug, only whether a given row is visible at all — so the lock-table-plus-gate-function pattern is used instead. `readings` no longer has an `email` column at all (Stage Three, July 30, 2026) — email lives in the separate `reading_contacts` table, keyed on `readings.id`, with no anon path of any kind (stricter than the slug-gated functions here). Full record: §16.
- **URL map (routing restructure, August 3, 2026 — Phase 1, §16):**
  - `/` — pre-purchase home (entry point; unchanged this phase, full
    build in Phase 3).
  - `/reading/[slug]` — post-purchase home (shell only as of Phase 1;
    the built 2-column My Chart / Transiting home is Phase 3).
  - `/reading/[slug]/natal` — the natal reading (moved here from
    `/reading/[slug]` in Phase 1, component unchanged at that time;
    **re-housed into the `ReadingLayout`/`Rail` shell at desktop widths
    (>=1024px) in Phase 3A, August 4, 2026, §16** — mobile keeps the
    original single-column component, with two content-structure fixes
    applied there too, see the Phase 3A entry).
  - `/reading/[slug]/transits` — transits (unchanged path; shell only
    until transit generation is live).
  - `/reading/[slug]/reference` — reference (shell as of Phase 1;
    content is Phase 3).
  - `/reading/[slug]/settings` — settings (shell as of Phase 1;
    content is Phase 3).
  - The slug is still the sole address — no login. Everything below
    this point in this section describes behavior once the pages are
    built out; Phase 1 only made the routes resolve.
- **Shared layout components (Phase 2, August 3, 2026, §16):** four
  reusable components in `app/components/` now supply the frame every
  screen above inherits: `NavBar` (the permanent cream top nav),
  `HomeLayout` (the two-panel home template), `ReadingLayout` (the
  rail + reading-zone template, including the reading zone's cream
  rectangle chrome), and `Rail` (the reusable table-of-contents list).
  Phase 2 wired only `/reading/[slug]` (via `HomeLayout`) and
  `/reading/[slug]/reference` (via `ReadingLayout` + `Rail`) as a
  rendering proof, both still placeholder content — `/natal`,
  `/transits`, and `/settings` are untouched. Real screen content
  (panel interiors, reading-zone interiors, live data) is Phase 3.
- Transit surface: same slug address — **un-gated while subscription is active.** Sharing is fine: what's priced is generation, not access. **Path vs. tab form: OPEN (§12.5) — ruled before any UI build.**
- Subscription attaches to the existing `readings` row (new relationship fields: stripe subscription id, status, paid-through). No separate account object.
- **Door B → subscribe later:** checkout is initiated FROM the reading page; slug rides into the Stripe session; webhook attaches subscription to the existing row. This is the linking mechanism — no matching problem.
- Lost link: "resend my link" email lookup.
- Billing management: Stripe hosted customer portal (cancel, card). Build no billing UI. Cancel must be trivially easy — no retention flows, no winbacks in the cancel path (brand refusal).

### 5.2 Lapse behavior — DECIDED (black and white)
At paid-through end: the ENTIRE transit surface gates — calendar, upcoming, all standing pieces, Moon content, profections — replaced by a resubscribe surface at the same address. No content-lifespan grace, no staggered decay. The natal reading is untouched, permanent. Resubscribe = same row, fresh monthly batch. (Whether prior months' pieces reappear as history on resubscribe: DEFERRED.)

### 5.3 Generation
- **Model: Opus everywhere (DECIDED).** Founder's production evidence: Opus adheres reliably; Sonnet showed more failures. **No temperature parameter** — Opus API calls take none; the legacy temperature lines are removed from all prompt headers.
- **Batch-monthly per subscriber, triggered on payment confirmation.** The month's regenerations are knowable at billing time (sky events are precomputable); payment kicks the user's month as one batch job; publication follows the sky's schedule, generation does not.
- Sky-event batches hit all subscribers at once (e.g., a Saturn ingress) → process as batches; shared system prompt = prompt-cache win. (Execution detail, not decision.)
- **Failure handling:** failures route to an email-to-founder pipeline (extends existing RETRY FAILED admin pattern).
- **Failure display — DECIDED: the holding message everywhere.** A failed regeneration shows the holding message ("this reading ran into some issues, check back in 24 hours") — never the prior edition. First-generation failure has no prior; the holding message covers it too. One failure state to design, not two. **[PROPOSED LANGUAGE — rationale drafted from the ruling, pending approval]** Each piece states its phase's dated boundaries as fact (§3.2), so a prior edition displayed after its phase ends asserts false dates; the holding message is briefly less content but never wrong.
- QC lives primarily IN the prompts (the embedded check sections — months of production evidence). Programmatic gates limited to parse/format sanity (delimiters, length) plus the date-verification gate enabled by entry IDs (§10.2). Do not invent additional validation architecture without founder sign-off.

### 5.4 Email (Resend — sufficient, no new tool)
- All sends are per-recipient API calls; "mass" events are loops/batches over affected subscribers. Personalized links (subscriber's slug) and per-user context (house of the eclipse, etc.) are therefore free.
- Email is the watchfulness mechanism: site-first product, email reaches out on the sky's schedule.
- Eclipse-day and exactness-day touches deep-link to the relevant **timeline entry by ID**.
- OPEN (§12.1 — the notification bundle): tier line (which events email vs. calendar-only), guaranteed monthly email on batch publish or not, subscriber volume preference or not, pointers-vs-content in email bodies. **Scheduling note: closes before stage G, ideally after the founder has seen real calendar output.**
- Build needs: suppression/unsubscribe handling.

### 5.5 Surfaces
- Site-first. Mobile web is first-class (site is app-derived and already mobile-strong). **PWA: DEFERRED post-launch.**
- New/changed surfaces: Transits surface (standing pieces), Transit Calendar (+ Notable Aspects, Upcoming Events), Today's Texture (free, math-only, incl. new daily sky wheel component), subscribe surface on reading pages (Door B + discount invitation), resubscribe surface (lapsed state), methodology page, education section (incl. profections, "finding your birth time"), sample reading page.
- **The double link:** every calendar entry links two directions — into the transit piece (the weather) and into the natal reading's corresponding section (the terrain). This is the digestibility mechanism and the retention loop; the natal document is the reference manual the transit layer reads against.
- **Timeline rendering:** the UI renders engine data joined by entry ID; entries are the arrival point for calendar clicks, so each must be legible standalone.

---

## 6. NAMING — DECIDED

Plain names for the instrument; the brand name is spent on the free page.
- Subscription: **Transits**
- Standing pieces section: **Transiting Planets**
- Calendar: **Transit Calendar**, with **Notable Aspects** and **Upcoming Events**
- Free page: **Today's Texture**
- Notification email naming: unneeded beyond subject lines (defer).

---

## 7. METHODOLOGY & DISCLOSURE — DECIDED (one maybe)

Methodology page, product-spec posture. **Disclose:**
- House system: **Whole Sign**. Zodiac: **tropical**.
- **Natal aspects and orbs:** major aspects only; 8° conjunction/opposition/square/trine, 6° sextile, 10° when the Sun or Moon is involved (8° aspects only — the sextile stays 6°); sign-consonant only.
- **Transit aspects and orbs:** 3° active / 1° exact, flat for all bodies (see §11A.3); applying weighted over separating; sign-consonant only; all 14 natal points receive.
- **Decans:** Chaldean order. **Degree flags:** 29° anaretic, 0° ingress; no other per-degree meaning.
- **Sect:** day/night, with the traditional team and benefic/malefic weighting.
- **Node convention:** mean node (CLOSED — §11A.1, §12 item 6). The system uses the mean lunar node, not the true node; the two can differ by up to ~3 weeks at a sign change — e.g. the 2026 Pisces→Aquarius shift is 2026-08-18 by mean node vs. ~2026-07-26 by true node. **PENDING, not yet built:** disclosure of this choice on the methodology page itself.
- Bodies covered; notable-event criteria; what the buyer gets, stated as a product spec.
- **Unknown birth time:** what that version includes and omits (no houses, no ASC/MC receiving, no natal Moon contacts; Moon sign ambiguity where applicable).
- **AI paragraph:** discloses the two-call pipeline (structured astrological brief → constrained prose render), the guardrails (tradition-referenced constraints, voice control, policy of translating phenomena vs. making claims about reality), and the why: the specificity this method unlocks IS the product; disclosure is honest marketing. "If someone won't read this because it's AI, this isn't for them."
- Limits stated plainly (non-predictive, no advice, tendencies not verdicts).
- REUSE: the app's settings/about page contains much of this language — reference it.
- Refusals list: INTERNAL doctrine (no daily horoscopes, no prediction, no advice, no chat oracle, no synastry, no planet personification, no manufactured urgency, no engagement mechanics, no dark-pattern retention). Public disclosure of refusals: MAYBE — possibly a small paragraph within methodology. Founder rules at page-writing time (§12.4).

**Community-facing posture (from the market pass, logged as rationale):** every documented category failure — recycled content, manipulative urgency, paywall creep, dark cancel flows, five-descriptor personalization — is something Texture already refuses on principle. The contribution is disclosure and structure, not more generated content: methodological transparency, honest handling of imperfect birth data, durational thinking (pass counts, windows), the tradition's actual toolkit (profections, decans, sect), and an honest on-ramp to human astrologers ("going deeper" page — books, podcasts, working astrologers). What is *not* built matters too: no chat oracle, no question-answering, no synastry — the restraint is legible to practitioners as respect for what requires a human.

---

## 8. EXISTING INFRASTRUCTURE (build on, don't rebuild)

- Natal pipeline: 2-call Opus synthesis, prompts in `lib/prompts/`, cache-warming pattern, admin retry. Production-proven.
- `readings` table: birth data, chart_data jsonb, 15 interpretation columns (14 original + `nodes`), slug, stripe_session_id. **Nodes consolidation status (Phase 3A, August 4, 2026, §16):** the natal page renders 13 sections (North Node + South Node merged into one "Nodes" section), sourced from a new `nodes` column, empty until content is generated for it. `scripts/add_nodes_column.sql` ran successfully against Supabase on the second attempt — the first attempt hit Postgres error 42P13 ("cannot change return type of existing function") because `CREATE OR REPLACE FUNCTION` cannot add a column to a function's `RETURNS TABLE` (named OUT parameters) shape; fixed by adding an explicit `DROP FUNCTION IF EXISTS get_reading_by_slug(text);` before recreating it (table/data untouched, only the function definition briefly gone). Verified with a live read via the anon-key RPC before any app code changed: `get_reading_by_slug` returns a `nodes` key (value `null`, as expected). App code then swapped from its temporary `north_node` stand-in to the real `nodes` column — confirmed by screenshot: the Nodes card now shows the "being prepared" placeholder instead of the old dogfood `north_node` text. The old `north_node`/`south_node` columns are left in place, unused by the app now but not dropped (a separate, not-yet-authorized decision). **Locked at the database level since Stage Two (§5.1, §16, July 29, 2026):** the public role has no direct SELECT; anon reads go only through `get_reading_by_slug(p_slug)`. Server code (webhook, generation, admin scripts) reads/writes with the service-role key, which bypasses this and is unaffected. `readings.name` is the reader-facing display name (optional, free-form, not the legal/Stripe name) and correctly stays in `readings`, slug-gated — it does not move in Stage Three. **`email` column removed as of Stage Three (§16, July 30, 2026)** — it now lives exclusively in the new `reading_contacts` table (keyed 1:1 on `readings.id`, service-role access only, no anon path of any kind), alongside a new, currently-empty `full_name` column reserved for future billing/identity capture.
- `transit_calendar` table (app-era, Supabase): rows = (planet, sign, transit_type [DIRECT_INGRESS | RETROGRADE_INGRESS | RE_INGRESS_DIRECT], ingress_date, egress_date, entering_degree, station_retrograde_{sign,degree,date}, station_direct_{sign,degree,date}, cacheable). **RETIRED** → renamed `transit_calendar_archive`, superseded by the rebuilt `transit_calendar` and new `aspect_calendar` (§11A). ~~Adaptation needed: stations are fields on ingress rows, not first-class events — normalize into an event stream (ingress/station events with dates) for triggers and calendar.~~ Obsolete — resolved as a full rebuild, not an adaptation.
- `sky_positions` table (NEW — created in Supabase; see §11.1).
- App-era transit prompts (`transit-prompts.json`): transit_a (collective — **archived, ignore**), transit_c (chart-grounded — the base of the current revision), transit_c_sunmoon (**superseded, retired**: the Sun gets full standing treatment, the Moon went ambient).
- App UI patterns: transits list screen, detail screen — translate to web, don't reinvent.
- Stripe (checkout mode today), Resend, Vercel, astrology-proxy for natal charts.

---

## 9. NEW BUILD — THE GAPS

1. **Aspect itinerary engine (largest genuinely new piece).** Per-chart computation of transit-to-natal contacts across all 14 receiving points — sign-consonant pre-filter, windows (3° applying → exact → separating), exactness dates, pass n-of-m across retrograde loops, plus sky-sky aspects, natal intersections, and the activation model (§11A.8). Deterministic math with ground truth: validate against a professional ephemeris before any generation depends on it. Feeds: timelines in standing pieces, Transit Calendar, notification triggers, Nodes eclipse itinerary.
2. **Eclipse dataset.** Precomputable years ahead: dates, kind, degree/sign, plus per-eclipse configuration (the eclipsed body's own aspects — Moon for lunar, Sun for solar; the earlier Sun-only version was a BUG, not an accepted limitation, fixed by `eclipse_aspects` (§11A.9), now computed at the true eclipse instant — §11A.10, BUILT — and now wired into display — §11A.9, BUILT) and natal points caught (lunar-eclipse display anchor and NATAL_CAUGHT re-anchor — §11A.5, §11A.8, BUILT). Feeds the Nodes piece + notifications.
3. **Sky event stream.** Normalized ingress/station/eclipse events from `transit_calendar` + eclipse data; drives regeneration scheduling and Today's Texture.
4. **Transit prompt revision.** DONE as drafts (§10). Remaining: founder's batch read; the reorder and reading-notes backlog (§10.5).
5. **Subscription lifecycle.** Stripe subscription mode, webhook extensions (attach-to-row, lapse gating at period end, resubscribe), monthly batch kickoff on payment confirmation, customer portal link.
6. **Moon blocks.** 12+12 static generation (one-time content job) + assembly logic. Prompt not yet drafted (§3.6).
7. **Surfaces** per §5.5, including daily sky wheel component (derive from `NatalChartWheelWeb`).
8. **Notification system** on Resend per §5.4 (blocked on the §12.1 bundle).
9. **Education layer** (after transits — DECIDED order): chart orientation page ("planets are what, signs are how, houses are where"), how-to-read-a-wheel, profections, finding-your-birth-time. Methodology page can interleave (zero dependencies).
10. **Natal parity:** unknown-birth-time purchase path live and correct.
11. **Sample reading** page (subject deferred).
12. **Natal engine + schema updates** from the natal sweep: decan, sect, degree flags, MC whole-sign house, axis-merged nodal aspects, widened sign-consonant orbs; 14 → 13 interpretation columns; node background assets.

---

## 10. PROMPT ARCHITECTURE

### 10.1 Naming and inventory
- **"Call 3" is retired across the board** — the legacy name from a pipeline that once had an intermediate step. The pipeline is Call 1 (interpretive brief) → Call 2 (prose construction), for both content types.
- Documents: `SYNTHESIS_CALL_1_v12.md`, `SYNTHESIS_CALL_2_v1.md` (renamed from `SYNTHESIS_CALL_3_v3.md`), `TRANSIT_C_CALL_1_v4.md`, `TRANSIT_CALL_2_v3.md`.
- **The two-call split is load-bearing and stays:** Call 1 writes for a colleague (a journalist's notebook — notes for the writer, not the audience), which removes the performance incentive that produced flattening, pre-digestion, and performed significance when the brief knew its final audience. Call 2 translates for the reader and introduces no new interpretive claims, even accurate ones.
- **Prompting philosophy (governs all prompt work):** the model knows astrology. Prompts supply frame, tradition-direction, and guardrails — never interpretation rubrics. Rubric-following reads dutiful and slightly dead; knowledge-reasoning reads like an astrologer. Sections say *which* tradition and *how to speak*; they never say what a placement means.
- **Shared core:** the universal sections are byte-identical across documents by design and are maintained as one canonical block (assembly step or discipline — OPEN, §12.7). Editing shared-core language forks the core; flag before doing it.

### 10.2 The transit output contract (Call 2)
```
[START]
<synthesis prose — one continuous block>
[ENTRY: {id}]
<entry prose>
[ENTRY: {id}]
<entry prose>
[END]
```
- **Two layers:** synthesis prose (the phase-durable standing condition, read whole) + entries (the dated events crossing it, each read closely). Same voice, different altitude — the prose is the terrain, the entries are the weather.
- **Source discipline:** prose ← [TERRITORY] + [QUALITY] + [INTEGRATION]; each entry ← its own [TIMELINE] entry and nothing else. The prose never narrates a dated event — the events are the entries' work; the prose does not report, preview, or summarize them. The prose is not a second timeline.
- **Delimiters:** opening tags only; each entry ends where the next tag begins. Prose block = everything between `[START]` and the first `[ENTRY:]`, or `[END]` when the phase has no entries. A quiet phase is prose-only and complete.
- **Entry IDs** originate at the engine, ride through the Call 1 brief, and are echoed verbatim by Call 2 — never composed. An ID is provenance, not fact: it may carry a date belonging to another phase, and the DATES/WINDOW/PASS/STATUS fields are the only sources of fact. The UI renders engine data joined by ID; a programmatic gate verifies prose-stated dates against the engine record.
- **The anchor:** each entry opens by stating the event as fact — the aspect, its dates, its pass and window position — before interpretation begins. Pass counts are passage-scoped ("the first of three passes while Saturn is transiting Pisces"); "no exact this phase" for a window that never perfects in-phase, with completion named as a pass reference, never an out-of-phase date.
- **Length:** synthesis prose ~200 words, flexing ~50 either way with the depth of the standing condition. Entries scale with the sky under the count model in §10.3 — host floor plus per-activation — governed by honest weight, no fixed per-entry sentence minimum.
- **Timeline ≠ brevity.** The timeline is a structure for completeness and chronology, never a license for thin treatment. Honest weight is expressed as length and register together.

### 10.3 The transit brief (Call 1) — four sections
`[TERRITORY]` 5–7 observations (orientation facts: phase + its place in the passage, house domain, natal copresences + a count of what the timeline holds, slow transiting company with spans, sign+house contribution) · `[QUALITY]` 7–10 (the standing condition at full depth — planet-in-sign-in-house-in-motion, each co-present natal point and each slow transiting body its own treatment, where the phase flows and where it grinds; retrograde motion colors the whole section) · `[TIMELINE]` one entry per contact event, date order, host floor 2–3 observations plus 1–2 per activation · `[INTEGRATION]` 4–6 (what becomes available).
- The [TERRITORY]/[QUALITY]/[INTEGRATION] observation lists are the kinds of observation to draw from, weighted toward what the chart gives most — not a template filled one observation per listed item. [TIMELINE] runs in date order with weight expressed inside each entry.
- The prose/entry division: the prose is the phase-durable layer (the standing condition, true for the whole stretch); the entries are the time-focused layer (the dated events). The prose never narrates an event. Three prose movements — Arrival ← [TERRITORY], Development ← [QUALITY], Close ← [INTEGRATION]; entries ← [TIMELINE].
- **The arrival is factual.** Interpretation begins in the Development movement; no compressed reading of the planet or sign in the opening, no aphorism, no planet-as-agent framing.
- **Copresence rule:** every co-present natal point is named (any speed — a natal placement in the sign is a stable condition); among transiting bodies, only a slow one (Jupiter or slower, including the transiting nodal axis) is named as standing company; a fast transiting body enters only as a dated event. A slow companion that also perfects a dated aspect gives its standing company to the prose and its dated event to the entry, never both.

### 10.3a The entry model (Call 1 [TIMELINE] / Call 2 entries)
- **Three entry types:** NATAL_CONTACT (the piece's planet aspecting one of the 13 natal points — the primary type), SKY_CONTACT (the piece's planet aspecting another transiting body, no natal point — a slow pair is a standing sky event, an atmospheric/TETHER pair is collective weather at honest weight), and ECLIPSE_ACTIVATION (an eclipse within 3° of the piece's planet on eclipse day). The Nodes variant additionally owns TYPE: ECLIPSE entries. CONFIGURATION as an entry type is removed (§11A.8).
- **Activations live inside a host entry, never as their own entry:** another transiting body that configures with the host contact in a dated moment (for a natal contact, also contacting the same natal point; for a sky contact, also aspecting the pair's other member). The host contact is the subject and spine; activations are dated brightenings of it.
- **Two role-axes that don't move together:** host/activator is structural (the host is always the piece's planet and always the subject); standing-condition/trigger is astrological and keyed to relative speed (the slower body holds the standing pressure, the faster is the trigger). Speed-weighting names the relationship truthfully; it never reassigns the subject. Vantage-symmetric: the same activation appears in both bodies' pieces with identical facts, each told as its own planet's story.
- **Multi-activation entries have an arc:** activations narrated in date order across the host window, differentiated by weight, with directional honesty when a perfection falls outside the window ("before this contact begins" / "after it separates").
- **Sky-contact placement by pair speed:** a slow pair (both Jupiter+) always gets its own entry and appears as an activation wherever it also intersects a natal point — two different facts, no hierarchy; a fast-involving pair appears in exactly one place (an activation if it intersects a natal point, otherwise its own atmospheric entry). A bare ingress or copresence with no aspect is not an entry.
- **Count model:** host floor 2–3 observations, plus 1–2 per activation scaled to weight, no fixed ceiling — an activation-rich entry runs long because it holds more, a bare one stays short. Founder will assess word count against real output before tuning.

### 10.4 Named transits — DECIDED
When the itinerary contains a contact carrying a traditional name, the content names it plainly: a planet conjunct its own natal position is a return (Saturn return, solar return, Jupiter return); the transiting axis aligning with the natal nodes is a nodal return. For a solar return, acknowledge that it falls near the birthday without claiming the dates align exactly. **The name comes from the contact in the input — never from cycle arithmetic** — and a named transit follows every register rule an unnamed one does (no drama, no urgency).

### 10.5 Prompt work status and backlog
All four prompts revised and delivered (pending founder's batch read):

- `SYNTHESIS_CALL_1_v12.md` / `SYNTHESIS_CALL_2_v1.md` — the natal sweep: nodes as one axis piece, angle handling, Chaldean decans, degree flags (29° anaretic with urgency-framing banned, 0° ingress), sect, copresence guarantee, widened sign-consonant orbs (8°/6°/10°, sextile stays 6°), four-section structure, USER MESSAGE FORMAT with DECAN/DEGREE_FLAG/SECT and the Nodes + angles variants.
- `TRANSIT_C_CALL_1_v4.md` / `TRANSIT_CALL_2_v3.md` — the transit redesign: activation model (three entry types, host-as-subject, speed-weighting, multi-activation arc, cross-piece symmetry, sky-contact placement rules), four-section brief with the throughline section removed, prose/entry two-layer division, copresence durability rules, Nodes handling against the real brief, USER MESSAGE FORMAT matching the finalized brief contract (§11A.8) — ACTIVATIONS, WINDOW/PASS, TETHER, ECLIPSE_ACTIVATION, ID-as-provenance, both variants.

**Executed and verified across all four (prior backlog, now closed):** temperature removed from all headers; canonical section order with sequential renumbering and name-based cross-references; USER MESSAGE FORMAT last; next-destination rule; named-transits rule; 29° urgency clarification; TEMPORAL REGISTER bold-header parity; luminary-sextile orb fix. Verification standard: body-level snapshot diff (sections split, headings stripped, bodies asserted byte-identical except ruled edits) — catches the heading-glue failure a line-diff cannot.

**Not yet drafted:** Moon blocks (12+12 static sign blocks + rising-sign closes, adapting the archived transit_a collective prompt — §3.6).

**Parked — flagged, not yet addressed:**
- The prose rendering an opposition to natal Jupiter as "crossing its own natal position" — the aspect word itself gets dropped in favor of a paraphrase. Needs a prompt fix.
- Nodes contact entries under-name the sign and house of the contact, leaning almost entirely on the aspect's angular relationship. Needs prompt attention.

**Section-number caveat for future edits:** section numbers in all four prompts are positional, not identities — any reorder renumbers them, which is why every cross-reference inside the prompts is name-based. Adding or moving a section renumbers the rest; nothing breaks.

---

## 11. ENGINE SPEC

### 11.1 `sky_positions` — the stored ephemeris (CREATED; BUILT & VALIDATED — see §11A.1)
Actual schema in Supabase:
```
body        text        -- Sun, Moon, Mercury..Pluto, North Node, South Node
date        date        -- position sampled at 00:00 UTC
longitude   float8      -- absolute ecliptic longitude, 0–360 (the primary value)
sign        text        -- derived convenience column
sign_degree float8      -- derived convenience column
retrograde  bool        -- longitude decreasing day-over-day
created_at  timestamptz -- DECIDED: ledger column, default now()
PK (body, date); index on date; RLS on, server-only reads.
```
- **Moon included — DECIDED** (essentially free to compute; feeds Today's Texture's daily sky wheel and positions). The Moon remains excluded as a *subject* of standing transit pieces.
- **Longitude-keyed by design:** aspect math is angular arithmetic on longitudes; sign/degree are conveniences derived at fill time, never re-derived downstream.
- **Fill:** ~20 years, ~80k rows (trivial for Supabase — a few MB). Script calls the existing Vercel astrology proxy; upsert on (body, date).
- **The governing coverage rule:** whenever a standing piece is written at an ingress, the table must already contain that planet's full stay in the new sign (the itinerary bakes in every contact through egress). The 20-year blanket satisfies this for all bodies and future-proofs the next ingress of each slow planet.
- **Validation before anything depends on it:** spot-check against astro.com's ephemeris; confirm the table's sign-boundary dates reproduce the existing `transit_calendar` ingress dates exactly. Two independent sources agreeing is the ground truth.
- **Interpolation:** linear between adjacent daily rows to find exact crossings — used ONLY to assign a crossing to a **date**. No times are stored or published (this also sidesteps timezone questions; daily precision is what the tradition publishes).
- **Mean vs. true node: OPEN (§12.6).** Founder leans **mean**. Required finding **before the fill**: which node the proxy library computes for natal charts, and whether both are available — `sky_positions` MUST match the natal-side computation. If the proxy computes true node, founder discussion on updating the proxy for consistency happens **before any rows are written**.

### 11.2 Computations the engine owes
- **Transit side:** sign-consonant pre-filter (in Whole Sign, sign-to-sign relationships are fixed, so a planet's candidate receiving points are known before any degree math); contact windows (3° applying → exact → separating) via threshold crossings + interpolation; pass n-of-m (free — `ORDER BY date` on the crossings); natal copresence (points where sign = transited sign); sky copresence with spans; sky-sky aspects (chart-independent, computed once, shared by all subscribers); natal intersections; stable **entry IDs**; eclipse dataset (base data loaded — §11A.5; per-eclipse configurations and natal points caught remain downstream per-user work); phase detection (ingress/station boundaries) and the regeneration schedule.
- **Natal side (new):** decan index + Chaldean ruler (`floor(sign_degree / 10)` + lookup); degree flags (29°, 0°); sect (Sun altitude at birth → day/night); MC whole-sign house; axis-merged nodal aspects (including inside other placements' ASPECTS lists); widened sign-consonant orbs per §4.7.
- **Shared:** the sky event stream (normalized ingresses, stations, eclipses) feeding triggers, calendar, notifications, and Today's Texture.

**ACTIVATION QUALIFICATION RULE (DECIDED July 19, 2026 — replaces the
"configuration merge" window-overlap test above; does NOT supersede
the two-leg CONFIGURATION structure at §3's contact-event list, only
the precision of its qualifying test):** an activation still requires
BOTH legs of the older rule — (A) the OTHER body has its own contact to
the SAME natal point, overlapping the host contact's window (unchanged)
— PLUS the new precision requirement: (B) the sky pair (focus body vs
the other body) was effectively exact (within the 1° band) at some
point during the host contact's own orb window — a deterministic form
of the practitioner's trigger-transit judgment. What Step 6 actually
replaces is leg B's old test (a blunt "sky window merely overlaps the
host window in date range") with real exactness. (An earlier draft of
this build wrongly dropped leg A entirely — sky-proximity alone,
no third-point contact required — that was caught in review and
corrected; recorded here so it isn't reintroduced.) Anchor date = the
day of closest approach to exactness within the shared span between
the sky pair's 1°-band interval and the host contact's own orb window;
ties resolve to the earlier day (the standing dating convention). When
the sky aspect's own literal perfection (exact_date) falls outside the
host contact's orb window, the fact states that explicitly ("perfects
{date}, after this contact separates"). A sky aspect that never
reaches the 1° band while any host contact (with the other body's own
matching contact) is in orb is not an activation, but still appears
wherever the SKY_CONTACT placement rules already put it (slow-pair own
entry, or atmospheric entry for a fast pair touching no natal point).
Implemented in findActivationAnchor (contact-engine.mjs), wired in
assemble-brief.mjs.

### 11.3 Data-integrity posture
Everything AI-generated sits downstream of everything deterministic. The math is validated against a professional ephemeris before the generative layer scales — wrong prose is a taste problem; wrong math is a legitimacy problem.

---

## 11A. ENGINE BUILD RECORD — SKY DATA LAYER (BUILT & VALIDATED JULY 2026)

The deterministic sky-data foundation (build sequence stage C, first
half) is BUILT and VALIDATED. Three tables in Supabase, all derived
conventions recorded here. Nothing downstream reads these tables yet.

### 11A.1 `sky_positions` (built July 14–15, 2026)

- One row per body per day: body, date, longitude (float8, 0–360), sign,
  sign_degree, retrograde, created_at (timestamptz ledger). PK (body,
  date). Body allow-list constraint (12 bodies; was missing Moon at
  creation — corrected before fill).
- Bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
  Neptune, Pluto, North Node, South Node. Chiron, Lilith EXCLUDED
  (DECIDED: no current product use; Lilith would force an unneeded
  variant choice; additive later — resumable fill keyed on (date, body)
  means adding a body is a pure append).
- Range: 2023-01-01 → 2046-07-31, uniform for all bodies (DECIDED:
  single range because sky-sky math needs every body on every date;
  start predates Pluto's first Aquarius ingress (March 2023) so every
  current passage's full history is in-range; end covers Pluto's final
  Aquarius egress with ~3.4 years margin, verified from the data).
- Time convention: every row = position at 00:00 UTC on its date
  (DECIDED July 15, overriding an earlier 12:00 note; matches
  astro.com/Astro-Seek 0h UT ephemeris convention for validation). The
  proxy interprets input hour in the location's LOCAL time, so the fill
  uses a fixed UTC+0 no-DST reference location (Accra) — verified
  empirically (Greenwich July vs. January differed by exactly the DST
  hour). No DST drift exists anywhere in the data.
- NODES: MEAN node (CLOSES the open node ruling). Finding: the proxy's
  library computes mean nodes; all delivered natal readings have always
  been mean-node; sky_positions matches. Methodology page discloses
  "mean node." Nodes are retrograde=true on every row (constant
  backward motion) — consistent with mean-node behavior.
- **PENDING (not yet built):** (a) disclosing the mean-node choice on
  the methodology page (§7); (b) a future reference-section entry
  explaining mean vs. true node to subscribers (education layer, §9
  item 9).
- Validation (passed July 15): 103,356 rows, zero gaps; longitudes and
  sign_degrees in range; sign/longitude consistency 103,356/103,356
  after one correction (Pluto 2024-09-02: rounding artifact at exactly
  300.000° stamped Capricorn; corrected to Aquarius 0° — longitude is
  the authoritative field, sign always derives from it); 15 samples
  verified against astro.com/Astro-Seek (Swiss Ephemeris) to
  sub-arcminute agreement; ingress cross-check against the old
  transit_calendar surfaced that table's defects (below).
- Maintenance: fill script is resumable and append-only, keyed on
  (date, body). Extending the range = re-run with later end date.

### 11A.2 `transit_calendar` (rebuilt July 17–18, 2026 — replaces the app-era table)

One row per CONTENT-GENERATION TRIGGER, derived purely from
sky_positions. 1,618 rows (1,189 ingress-type + 429 station-type,
cross-checked against a pre-code census of the raw data; the
ingress-type figure splits further into 1,121 ingress/retro-ingress +
68 re-ingress after the passage-fragmentation fix below — same 1,189
total, some retyped).

- Event types (and ID slugs, identically worded — DECIDED, no
  abbreviations): ingress, retro-ingress, re-ingress,
  station-retrograde, station-direct. No Moon rows (ambient layer
  reads sky_positions directly). ID format: {body}-{event}-{sign}-
  {date}, e.g. saturn-ingress-aries-2025-05-25 and its return leg
  saturn-re-ingress-aries-2026-02-14.
- NODES: one row per axis change (one trigger = one content block);
  body = "Nodes"; row carries north_sign and south_sign (ID:
  nodes-ingress-{north_sign}-{south_sign}-{date}). No node station
  rows ever (mean node); Nodes never dip or re-enter (constant
  backward motion), so every Nodes passage has exactly one entry.
  Houses are per-chart facts and are JOINED AT GENERATION TIME, never
  stored in this global table.
- Self-contained rows (DECIDED): each row carries phase_end_date (this
  body's next trigger of any kind — defines the motion phase the row
  begins), sign_egress_date (this PASSAGE's true final egress — see
  the passage model below), passage_id, passage_first_ingress_date,
  entry_number, and entry_count. NULL where the answer falls outside
  the data range (documented in-schema; trailing NULLs self-heal on
  range extension) or where the passage's true first ingress predates
  the range (every body has exactly one such passage — see below).
- Station rows carry the station's sign and degree. Ingress rows store
  no degree (direct ingress enters at 0°, retro-ingress at ~29°59' —
  fixed by the boundary, redundant to store).
- Defensive constraints: body never Moon; Nodes rows are ingress-only.

PASSAGE-FRAGMENTATION BUG — RESOLVED July 20, 2026 (found July 19,
2026; was the blocking prerequisite for generating content for any
body beyond the Saturn/Mercury/Nodes dogfood three — founder ruling,
not a someday note). Full record of the finding is preserved below;
this paragraph records the fix and closes the bug.

THE PASSAGE MODEL (ratified, replaces the informal definition above): a
passage is a body's entire association with one sign, first ingress to
TRUE FINAL egress, any retrograde dips included. Four rulings govern
it:
- **(A) Event types.** Three symmetric ingress-type events: ingress
  (first-ever arrival), retro-ingress (backing retrograde into the
  previous sign — always a dip's departure leg, never a first
  arrival), re-ingress (a direct crossing back into a sign already
  entered earlier in the same passage — a dip's return leg). A plain
  ingress is retyped to re-ingress whenever it is not that passage's
  first entry; IDs regenerate accordingly.
- **(B) Passage identity.** Every row carries passage_id
  ({body}-{sign}-{first ingress date}, e.g. saturn-aries-2025-05-25 —
  the event-type word is omitted, unlike this table's own `id`
  column).
- **(C) Passage bounds on every row.** passage_first_ingress_date and
  sign_egress_date (repurposed to mean the passage's TRUE final
  egress, replacing the old per-leg meaning) are identical on every
  row sharing a passage_id, so any consumer knows a passage's full
  bounds from a single row.
- **(D) Entry counting.** Every ingress-type row (ingress,
  retro-ingress, re-ingress) carries entry_number and entry_count,
  independent counters in the same spirit as aspect_calendar's
  windows/passes. A retro-ingress counts as an entry into the sign it
  backs into.

MEMBERSHIP IS SIGN-CONSONANT, not shape-based (founder correction
during planning): every row belongs to the passage of the sign it is
actually IN. A dip's own rows (its retro-ingress landing in the
previous sign, any stations while dipped, and its return leg) belong
to the DIPPED-INTO sign's passage, not the sign dipped out of — e.g.
Pluto's 2023/2024 Capricorn dip rows carry a Capricorn passage_id
(passage_first_ingress_date NULL — see the leading-edge case below),
not pluto-aquarius.

ADJACENT PASSAGES INTERLEAVE IN TIME (explicit, load-bearing
consequence): because a passage stays open through any dip and only
closes at its true final egress, a body oscillating between two signs
keeps both signs' passages open simultaneously, and their date ranges
legitimately overlap. Confirmed on Saturn's real current passages:
Pisces (first ingress 2023-03-07, final egress 2026-02-14 — its own
2025 dip-return, per (D), is entry 2 of that Pisces passage) and Aries
(first ingress 2025-05-25, final egress 2028-04-13, entry 2 of 2 is
the 2026-02-14 return) overlap by the ~9 months Saturn spends
wobbling across that one boundary. Not a conflict; the model is
symmetric by design, and this SAME symmetric rule also extends Pluto's
current Aquarius passage's final egress to 2044-01-19 (its far-future
Pisces passage's own dip back into Aquarius) and gives that Aquarius
passage 4 entries, not 3 — a consequence outside the originally-cited
case, surfaced and founder-approved during planning, not silently
absorbed.

LEADING-EDGE (PRE-RANGE) PASSAGES: every body's data-start sign
(2023-01-01) is itself a passage whose true first ingress predates the
tracked range — confirmed to exist for all nine bodies once membership
went sign-consonant (Pluto's Capricorn passage among them). Handled
like any other passage except: passage_id uses the anchor-less
convention {body}-{sign}-pre-range; passage_first_ingress_date is
NULL; and — because the true total number of entries into that
passage is itself unknowable when its beginning is outside the data —
entry_number and entry_count are NULL on every row belonging to it,
not just the unrecorded first entry (a visible row cannot state an
ordinal against an unknowable total). Most bodies' pre-range passage
never gains a real row at all, if the body never dips back into its
data-start sign.

SHAPE (a Call 1 brief field, not a stored column) describes every
retrograde episode (a station-retrograde paired with its
immediately-following station-direct) whose full span falls inside a
passage's own [first ingress, final egress] bounds, regardless of
which passage's rows a given station is stamped with — membership
answers "whose passage is this row," shape answers "what happened
during this span," and an episode sitting in an interleave overlap
honestly counts toward both passages (Saturn's one 2025 loop is
"3 retrograde episodes, 1 of which carried the body out of the sign
and back" from BOTH its Aries and its Pisces passage's own point of
view). Implemented as `computeShape` in
scripts/engine/contact-engine.mjs.

Fixed in `scripts/generate-transit-calendar.mjs` (full regeneration,
July 20, 2026): 1,618 rows before and after (nothing added or removed
— retyping and passage identity relabel existing rows, they don't
create or destroy any); 375 rows touched across 8 bodies (68 retyped
to re-ingress with new ids, 307 more corrected to their true final
egress date on their existing id; Sun and Nodes unaffected — no dips
possible for either). The query-layer workaround
(`findTruePassageRows` in scripts/engine/contact-engine.mjs, and its
call sites in assemble-brief.mjs / print-itinerary.mjs) has been
removed; both engines now read passage identity and bounds directly
off clean data, verified by running both against Saturn, Mercury, and
Nodes post-fix. `scripts/validate-calendars.mjs` — which still
encoded the OLD per-leg sign_egress_date definition and the OLD
window-scoped aspect_calendar pass-numbering (predating the July 19
ruling too) — is RETIRED and DELETED (Step 4, July 20, 2026),
superseded by `scripts/certify-calendars.mjs`. The new script
re-expresses every check the old one performed against the ratified
passage definitions, adds passage-integrity checks (shared bounds
across a passage_id, entry_number/entry_count sequencing, pre-range
NULL rules), named spot-checks on the known dip cases (Pluto's
4-entry Aquarius passage, Saturn's interleaved Aries/Pisces passages,
Pluto's pre-range Capricorn passage), re-runs both standing structural
guards over a live recompute (not just stored rows), and re-assembles
all three current briefs as a completion check. Full report: 28
checks run, 28 passed, ALL CLEAR.

VALIDATED (Step 3, July 20, 2026): Pluto's Aquarius passage (one
passage_id, one shared first-ingress/final-egress pair across all 43
member rows, entries 1–4 correctly numbered); Saturn's Aries passage
(2025-05-25 → 2028-04-13 on all 7 rows, the 2026-02-14 row confirmed
re_ingress, entry 2/2) and Pisces passage (final egress confirmed
2026-02-14 by direct id lookup — the interleaving case); one clean
(no-dip) passage independently re-verified for Sun, Venus, Mars,
Jupiter, and Saturn. FINDING: no clean passage exists anywhere in the
2023–2046 range for Uranus, Neptune, or Pluto — every passage either
has, for all three bodies, at least one dip; a structural fact about
outer-planet speed vs. a 23-year window, not a fix defect.
phase_end_date chain integrity re-checked across all 1,618 rows, all
10 bodies (9 planets + Nodes) — zero errors. Brief re-assembly:
reconstructed the pre-fix query-layer workaround in memory (old
algorithm against live, unchanged sky_positions) and confirmed its
passage bounds match the new fixed data exactly for Saturn, Mercury,
and Nodes' current phases. SHAPE's displayed text differs from the old
workaround's raw station count by design (that redesign is this
build's own work, not something the comparison needed to reproduce) —
not a discrepancy.

Original finding, preserved for the record: confirmed with two
independent real cases before the fix — (1) Pluto's actual 2023
Aquarius → Capricorn (retrograde dip) → 2024 Aquarius return carried
sign_egress_date = 2023-06-11 on the pre-dip leg and 2024-09-02 on the
post-dip leg — two values for one passage. (2) Saturn's own Aries
passage: genuine ingress 2025-05-25, retro-ingress to Pisces
2025-09-01, re-ingress 2026-02-14 — three different stored
sign_egress_date values across one passage. Confirmed NOT to affect
Mercury's or the Nodes' passages active at the time (neither had a
mid-passage re-entry then), so the three dogfood bodies were
unaffected under the query-layer workaround — but Venus/Mars
retrograde dips back across a sign boundary are common, not rare,
which is why this was a blocking prerequisite for the ten-body
rollout, not a someday note.

### 11A.3 `aspect_calendar` (rebuilt July 17–18, 2026; IDs regenerated
July 19, 2026 for passage-scoped pass numbering — see below)

All dated sky-sky events, derived purely from sky_positions. 4,607
aspect rows across 4,507 distinct windows, plus 104 eclipse rows. (The
row count moved from the originally-documented 4,585 to 4,607 when the
conjunction/opposition exact-crossing fix — see the Phase 2 commit —
was regenerated; window count is unchanged and independently
verified. That row-count note was never updated at the time; corrected
here.)

PASSAGE-SCOPED PASS NUMBERING (DECIDED July 19, 2026 — replaces the
window-scoped p{n}of{m} originally described below): an ASPECT PASSAGE
is a run of consecutive windows of the SAME aspect between the SAME
pair, chained as long as neither body's sign changes in between — the
sign-consonance principle applied temporally, an aspect's story lasts
exactly as long as the sign pairing that licenses it. An actual sign
change by either body breaks the aspect passage, by rule, even if the
same aspect re-forms shortly after. WINDOW and PASS are independent
counters over the aspect passage: a pair that separates and
reapproaches without ever leaving orb can perfect twice in one window;
a pair that perfects, drops out of the sign pairing, and reforms the
same aspect later is two passes across two separate windows — neither
count is derivable from the other. pass_n/pass_m (and the -p{n}of{m}
ID suffix) now count across the whole aspect passage, never within one
window alone. Implemented in
scripts/generate-aspect-calendar.mjs (assignAspectPassages).

- Aspects: the five majors only (conjunction, sextile, square, trine,
  opposition) between the nine non-Moon bodies. Canonical pair order =
  fixed speed order (Sun, Mercury, Venus, Mars, Jupiter, Saturn,
  Uranus, Neptune, Pluto), faster body always body_1; each aspect
  stored once.
- Orbs (DECIDED — closes "execution tuning"): 3° active / 1° exact,
  FLAT for all bodies and for BOTH contact types (sky-sky here and
  transit-to-natal downstream). Sign-consonant only. Rationale
  ratified: flat is cleaner; fast movers self-regulate (window length
  = orb ÷ speed); tight transit orbs vs. wide natal orbs is the
  traditional structure (natal = standing relationships, transits =
  events; ~1° exactness zone per the Hand standard) — confirmed
  against tradition, defensible on the methodology page. The natal
  8/10/6 orb table governs natal-to-natal ONLY; the two regimes are
  deliberate and distinct.
- ROW STRUCTURE: one row per EXACT PERFECTION, carrying shared
  window_start/window_end (identical verbatim across all rows of one
  continuous orb window), exact_date, pass_n of pass_m (counted across
  the row's whole ASPECT PASSAGE — see above, not the window alone),
  each body's motion state on the exact date, and exact_degree (shared
  degree-within-sign — identical for both bodies by construction for
  the five majors). A window entered without perfecting = one row,
  exact_date NULL ("no exact" — valid, factual; ID suffix -noexact).
- DATA-MODEL LAW (documented in-schema and in the generation script;
  binding on every future consumer): ROWS ARE EVENTS; CONTENT UNITS
  ARE WINDOWS. All rows sharing one continuous window are ONE content
  story ("in orb X→Y, exacting m times"), grouped by the shared
  window dates. No static limit on exacts per window. Never group by
  row count.
- ID formats: {faster}-{aspect}-{slower}-{exactdate}-p{n}of{m};
  no-exact: {faster}-{aspect}-{slower}-{windowstart}-noexact;
  eclipses: solar-eclipse-{date} / lunar-eclipse-{date}. All IDs
  deterministic: regeneration from identical data mints identical IDs.
- EDGE-WINDOW RULE (DECIDED): windows already open on the range's
  first day or still open on its last are OMITTED ENTIRELY, never
  written with unknowable boundaries (partial windows would break the
  grouping key). Leading-edge omissions are pre-product history;
  trailing-edge windows appear complete when the range extends.
  Boundary-adjacent rows are provisional until the range extends past
  them (a still-open window can gain passes, changing pass_m and IDs —
  designed behavior, not drift).
- NO naming/label layer (DECIDED): no cazimi, combustion,
  under-the-beams, or Great Conjunction labels. Combustion-type
  standing CONDITIONS are out of calendar scope entirely (if ever
  wanted, they enter as Call 1 brief context, not calendar rows —
  deferred, additive). Declination-based events (out-of-bounds,
  heliacal) are outside the data model — known boundary.
- Defensive constraint: no Moon in either body column EXCEPT the two
  eclipse event types (which are exactly Sun–Moon) — eclipses are the
  only Sun–Moon rows.

### 11A.4 Dating convention (ALL tables — DECIDED July 17 after trial-run bug)

Every event is stamped with its ACTUAL UTC DATE: the calendar day
containing the true crossing/station/exactness moment, i.e. the earlier
of the two bracketing daily snapshots. Never "the first snapshot showing
the new state." Interpolation between snapshots assigns DATES only,
never times; the fractional position feeds continuous values
(exact_degree) only. Lookahead columns and window bounds inherit this
convention (they are lookups of already-corrected dates).

Record of the bug this closes: the first trial stamped every event +1
day (an off-by-one in dating detected changes). Caught ONLY by external
verification against Astro-Seek UT listings — every internal
consistency check passed on the uniformly-wrong data. Standing lesson,
reaffirming the spec's validation law: internal consistency cannot
detect being consistently wrong; deterministic tables validate against
external ground truth before anything downstream depends on them.

**Extension (July 21, 2026 — cusp-seam bug, full record in §16's July
21 entry):** the standing test-coverage rule required covering every
ASPECT type (conjunction/sextile/square/trine/opposition); the
cusp-seam crossing-detection bug was invisible to that rule because it
belongs to a different axis entirely — a GEOMETRIC class (how close a
receiving point sits to a sign boundary), orthogonal to which aspect is
involved. The validation law now reads: coverage must sweep every
independent axis a bug could hide along, not just the one a prior bug
happened to teach us to check. Standing enforcement:
`scripts/exercise-engine.mjs`'s charts now include five geometric-cusp
charts (every receiving point placed at 0.0°, 0.5°, 15.0° [mid-sign
control], 29.5°, and 29.9° of its sign), joining the existing dogfood
and aspect/rising-unknown/no-contact synthetic charts in the standing
exercise matrix — so this class of bug fails loudly if it ever
recurs, rather than waiting for another founder-directed investigation
to notice it.

### 11A.5 Eclipses (loaded & validated July 18, 2026)

- Source: NASA Five Millennium Canon (Espenak & Meeus). 104 events
  in-range (51 solar, 53 lunar; the 2046-08-02 solar falls after the
  range end — excluded until extension).
- PENUMBRAL lunar eclipses INCLUDED (DECIDED): astrological practice
  counts them (the significance is the lunation at the nodes, not
  shadow depth); with no kind field they are simply Lunar Eclipse
  rows; excluding them would break eclipse-season pairing.
- NO kind/subtype field (DECIDED — founder override of the earlier
  addendum line that listed "kind" in eclipse entries): that an
  eclipse strikes is the significance; totality nuance is excluded;
  re-derivable later if ever wanted.
- DEGREE/SIGN CONVENTION (DECIDED — deliberate exception to "read each
  body's own row," chosen for precision; documented in-schema so it is
  never "fixed" back): both eclipse types read the SUN's snapshot
  (Sun moves <1°/day → within ~½° of the eclipse-moment position; the
  Moon's snapshot can be 6°+ off and land the wrong sign). Solar:
  exact_degree = Sun's degree, both signs = Sun's sign. Lunar:
  exact_degree = Sun's degree, body_1_sign = Sun's sign, body_2_sign =
  the OPPOSITE sign, derived, never read from the Moon's row.
- BOUNDARY VERIFICATION PROTOCOL (run July 18): any eclipse row with
  sign_degree > 29.0 or < 1.0 is checked against NASA's published
  greatest-eclipse time to determine which side of a same-day sign
  crossing the eclipse moment falls on. Result: 9 flagged, 7 confirmed
  correct, 2 CORRECTED (2031-05-21 → Gemini 0.07°; 2039-06-21 →
  Cancer 0.21° — both had been stamped in the prior sign). The load
  script carries a verified-correction table so regeneration
  reproduces corrected values (confirmed by re-run).
- Validation: three-way — (a) USNO independent computation matches
  NASA exactly for its published window (2023–Aug 2026); (b) all 104
  dates verified against sky_positions (solar = Sun–Moon
  near-conjunction, lunar = near-opposition, all within one day's
  lunar motion; all within ~18° of the nodal axis); (c) founder
  spot-checks against Astro-Seek eclipse listings — 8-sample
  degree/sign check (all within 1°) plus all 9 boundary-flagged rows
  individually confirmed.
- **DISPLAY-ANCHOR RULING (BUILT July 29, 2026 — display-fix brief;
  see §11A.8 for the NATAL_CAUGHT relabel built in the same brief):**
  downstream, a lunar eclipse's PRESENTED position (degree/sign/house)
  is the eclipsed MOON's — opposite the Sun — never the Sun's; solar
  eclipses stay Sun-anchored. This governs display/rendering only; it
  does not change the DEGREE/SIGN CONVENTION above, which remains the
  precision-driven storage rule for aspect_calendar's own eclipse
  rows. Implemented via one shared pair of helpers in
  `scripts/engine/contact-engine.mjs` — `eclipseAnchorBody` (Moon for
  a Lunar Eclipse, Sun for a Solar Eclipse, keyed off the row's own
  stored `event` kind) and `eclipseAnchorSign` (reads `body_2_sign`
  for lunar, `body_1_sign` for solar) — used by every place an eclipse
  position is printed: the Nodes TYPE: ECLIPSE entry's POINT field,
  the planet-piece ECLIPSE_ACTIVATION entry's ECLIPSE line (both in
  `scripts/engine/assemble-brief.mjs`), and the debug tool
  `scripts/engine/print-itinerary.mjs`. One rule, one implementation,
  applied everywhere — never reimplemented per call site.
- **INSTANT, NOT WINDOW (confirmed, no code change needed):** an
  eclipse is a single instant with one frozen geometry, never a
  window — no orb-open/separation dates, no WINDOW/PASS counters, no
  applying/separating language, wherever an eclipse enters a brief in
  any role. Audited July 29, 2026 across every path an eclipse fact
  reaches a brief (the Nodes ECLIPSE entry, the ECLIPSE_ACTIVATION
  entry, print-itinerary.mjs): already instant-clean going in — the
  ECLIPSE_ACTIVATION entry's DATES line already read as a single-date
  spike ("eclipse falls within 3° of the piece's planet on {date}"),
  never blended with the planet's own transit's window language.
  Recorded here as the binding presentation rule so it stays true
  under future changes, not just as a one-time finding.

### 11A.6 Old `transit_calendar` — RETIRED (July 17, 2026)

Failed validation against sky_positions: node ingress dates carry
true-node lineage (~19–24 day divergence from the product's mean-node
convention); two corrupt rows (station date copied into ingress date,
self-flagged cacheable:NO by the old engine); systematic snapshot
drift. DECIDED: retired as a source with no fidelity owed; renamed
transit_calendar_archive (confirmed unreferenced by any deployed code
before rename); DELETED after the site relaunch is live. Nothing may
read it.

### 11A.7 Access & maintenance (all three tables)

- RLS enabled, zero policies (default-deny); all reads/writes via the
  service-role key server-side — the established pattern.
- Maintenance model: DETERMINISTIC REGENERATION. Annual-ish extension:
  extend sky_positions (pure append), regenerate both calendars in
  full (identical inputs → identical rows and IDs; corrections carried
  in-script). Trailing-edge NULLs and omitted trailing windows
  self-heal on extension.

### 11A.8 Brief assembly (Phase 3 — BUILT & VALIDATED)

`scripts/engine/assemble-brief.mjs` (with `scripts/engine/contact-engine.mjs`
as the shared math library) assembles the Call 1 USER MESSAGE FORMAT block
for one (chart, transiting body) pair. This section records the
architecture as built and validated across the July 2026 brief-assembly
sessions, superseding the informal sketch in §3 and the July 19
ACTIVATION note in §11.2 wherever they conflict — those stay as decision
history, not as the current contract.

**Templates are the source of truth.** `docs/brief-template-planet.md`
and `docs/brief-template-nodes.md` are the authoritative field/ID/
section-order contract. The assembler conforms to the templates; the
templates are never regenerated from the assembler. Any structural
mismatch between them is a bug in the assembler (or a gap in the
template's own illustrative coverage), never the reverse.

**Entry types.** A brief's TIMELINE has exactly four entry kinds:
NATAL_CONTACT, SKY_CONTACT, ECLIPSE_ACTIVATION (a non-Nodes piece's
own-planet eclipse hit), and ECLIPSE (Nodes variant only — the axis
piece owns the full eclipse itinerary). CONFIGURATION is REMOVED as an
entry type (superseded by ACTIVATION facts, per the July 19 ruling in
§11.2 — restated here as current, not historical).

**ACTIVATION facts.** A third body B activates a host entry when (leg
1) B reaches the 1° exact band with the piece's planet while the host's
own aspect/contact is in orb, AND (leg 2) B itself contacts the host's
shared target — the SAME natal point for a NATAL_CONTACT host
(NATAL_ASPECT leg), or the host pair's OTHER member for a SKY_CONTACT
host (PAIR_ASPECT leg; the sky-pair activation variant, distinct from
the natal one only in what leg 2 targets). Anchor date = day of closest
approach within the shared span, ties to the earlier day. Perfection
outside the host's own orb window is stated directionally ("perfects
{date}, before/after this contact begins/separates").

**Sky-contact placement, by pair speed class:** a SLOW pair (both
bodies Jupiter or slower) is ALWAYS its own SKY_CONTACT entry,
regardless of natal activity, plus activation facts wherever it also
intersects a natal point or is itself activated by a third body. A
FAST-INVOLVING pair (Sun/Mercury/Venus/Mars on at least one side)
becomes an activation fact only when it intersects a natal point (no
separate entry), and its own atmospheric entry (TETHER: atmospheric)
when it touches no natal point at all. Every computed sky aspect of the
focus body appears in its brief at least once — as an entry, as facts,
or both.

**WINDOW and PASS are two independent, always-shown counters,** no
exceptions anywhere (including the Nodes axis, always "1 of 1" since it
never stations). WINDOW counts distinct orb-engagement spans within a
passage; PASS counts only the ones that reached exact. For
NATAL_CONTACT, scoped to the transiting body's own PASSAGE (sign
residency). For SKY_CONTACT, scoped to the pair's own "aspect passage"
— a run of consecutive orb-engagement windows between the same two
bodies, unbroken by a sign change in EITHER body (mirrors how
aspect_calendar's pass_n/pass_m are scoped at the data layer; see
`skyWindowPassageIndex` in contact-engine.mjs). PASS reads "(none this
window)" when this row's own window never reached exact, same wording
in both variants.

**Phase membership is strict overlap:** a contact/entry belongs to the
current phase iff window_start < phase_end AND window_end >
phase_start — excluding only degenerate zero-duration boundary touches
(a window closing exactly on the phase's own opening date, or opening
exactly on its closing date). A window with any real duration overlap
is included, even one spanning a station and shared with an adjacent
phase. An exact/anchor date landing exactly ON a boundary date belongs
to the phase that OPENS on that date, never the one that closes on it
— consistent with the half-open current-phase lookup (date <= today <
phase_end_date) used throughout.

**PASSAGE_CONTACTS is removed entirely** (superseding §3.2's mention).
Passage-scoped totals live in each entry's own WINDOW/PASS fields; there
is no separate undated-summary field in either template.

**Out-of-phase exacts stay out of DATES.** When a SKY_CONTACT's own
exact_date falls outside the current phase (its window still overlaps
it), DATES states only what happens within the phase and STATUS reads
"no exact this phase" — the out-of-phase date is never added to DATES.
The entry's own ID still carries that date as PROVENANCE (the aspect's
own passage-scoped exact date and pass), not a phase claim; the date
isn't lost, and for a slow pair it also surfaces in whichever other
phase's own SKY_CONTACT entry it belongs to.

**COPRESENT_SKY is slow-bodies-only** (Jupiter or slower, and the
transiting Nodes — the sharing END is named, e.g. "South Node", the
other end necessarily opposite), dated span each, "(all phase)" when
present throughout. **COPRESENT_NATAL is all natal points**, any speed,
in the planet variant only — the Nodes variant has no COPRESENT_NATAL
line at all (the axis-to-natal relationship is carried entirely by
timeline contacts).

**SHAPE** is a structured per-segment timeline of the WHOLE passage
(first ingress to true final egress), not a summary sentence: each
segment names its own opening trigger and what closes it, in order,
including any out-of-sign retrograde dip. Segments while the body is
OUT of the piece's own sign are tagged `[out of sign]` — context for
why the passage dipped and returned, not events the piece interprets. A
clean (no-dip) passage collapses to one line. The Nodes variant's SHAPE
is always a single ingress-to-egress line (the axis never stations).

**Nodes conventions:** AXIS is always stated North Node first, then
South Node. NATAL_CAUGHT (both the Nodes piece's own ECLIPSE entries and
a planet piece's ECLIPSE_ACTIVATION) names HOW each point is caught —
"conjunct the eclipse degree" (within 3° of the eclipse point itself) or
"opposite the eclipse degree" (within 3° of the far end of the lunation
axis); an end with nothing caught is omitted, "none" if nothing at all.

**NATAL_CAUGHT re-anchor (BUILT July 29, 2026 — same display-fix
brief as §11A.5):** the conjunct/opposite label for a natal point
caught by an eclipse re-anchors to the eclipsed body — Moon for a
lunar eclipse, Sun for a solar eclipse — so a natal point sitting with
the eclipsed body itself reads "conjunct." Implemented by keying
`eclipseCatches` (contact-engine.mjs) off the shared `eclipseAnchorSign`
helper (§11A.5) instead of always reading the Sun's sign; since both
the Nodes ECLIPSE entry and the planet-piece ECLIPSE_ACTIVATION entry
call the same `eclipseCatches` function, the fix applies identically
in both places by construction. Verified against the dogfood chart's
2025-09-07 lunar eclipse: South Node (sitting with the eclipsed Moon)
now reads "conjunct the eclipse degree"; North Node (sitting with the
Sun) now reads "opposite" — reversed from the pre-fix output, as
ruled.

**Validation practice.** Two standing tools, both read-only, no writes,
no AI/API calls: `scripts/template-conformance.mjs`, a mechanical
structural differ that parses both template files and a live assembled
brief into pure structure (entry types, field names/order, fact-block
types) with the SAME parser for both sides, and asserts conformance —
run inside `scripts/certify-calendars.mjs`; and
`scripts/exercise-engine.mjs`, an engine-scale exercise running the
assembler across all ten tracked bodies, multiple charts (the real
dogfood chart, synthetic charts for RISING_SIGN_KNOWN: false and other
unusual cases, and five cusp-geometry charts per §11A.4's validation-law
extension), and multiple phases per body (prior/current/future) —
currently 271 briefs, asserted against the differ, no human reading the
output.

### 11A.9 `eclipse_aspects` (built July 26, 2026 — true-instant recompute applied July 26, 2026, §11A.10)

One row per (eclipse, other body) qualifying aspect: the ECLIPSED body's
own sign-consonant aspects to the other 8 tracked bodies (Mercury–Pluto),
at the eclipse instant.

- **Anchor:** Moon for a Lunar Eclipse, Sun for a Solar Eclipse — the
  eclipsed body, not always the Sun. Read from the eclipse's own
  aspect_calendar row, never re-derived from sky_positions.
- **Aspects:** the five majors, sign-consonant only, 3° active / 1°
  exact — the same standard as aspect_calendar (§11A.3).
- **The OTHER luminary is omitted:** Moon dropped on a solar eclipse,
  Sun dropped on a lunar eclipse — that pairing is the eclipse's own
  defining axis, not a configuration. The comparison set is the same 8
  bodies for every eclipse.
- Stores whether the aspecting planet was retrograde on the eclipse
  date.
- One row per qualifying aspect only — a body with no qualifying aspect
  gets no row.
- **Fixes:** replaces the Sun-only CONFIGURATION previously computed
  for eclipse entries, which was wrong for lunar eclipses (§9 gap 2).
  **RESOLVED (July 26, 2026):** the positions-flip-near-orb-edge-
  aspects issue this section originally flagged as pending is now
  closed by the §11A.10 true-instant recompute — this is no longer an
  open gap, it is the CURRENT, correct state of the table.
- **Status:** table recomputed at the true eclipse instant (§11A.10) —
  78 rows across 54 of 104 eclipses (was 79 rows / 55 eclipses on the
  00:00 UT snapshot basis; net -1 from 6 aspects newly qualifying and 7
  no longer qualifying at the true instant), verified against a fresh
  table read after write (row count, all 7 disappeared rows confirmed
  absent, all 6 appeared rows confirmed present with matching orb).
  Write model is delete-then-insert per eclipse (an upsert alone cannot
  remove a row for an aspect that stops qualifying). Externally
  validated against an independent ephemeris (sweph / Swiss Ephemeris,
  Moshier mode) across the full 104-eclipse x 10-body dataset — max
  discrepancy between the two engines 12.78 arcseconds, zero
  disagreements. **Display code now reads this table (BUILT July 29,
  2026, display-fix brief):** the Nodes TYPE: ECLIPSE entry's
  CONFIGURATION field is read directly from `eclipse_aspects`
  (`scripts/engine/assemble-brief.mjs`), replacing the old homemade
  computation that always queried the Sun's own aspect_calendar rows
  regardless of eclipse kind. Not wired into the ECLIPSE_ACTIVATION
  entry — that entry type has no CONFIGURATION field in
  `docs/brief-template-planet.md`, so there was nothing to fix there.
  Verified against the dogfood chart's 2025-03-14 lunar eclipse: now
  shows "opposition Saturn, trine Uranus" (both stored eclipse_aspects
  rows, Moon-anchored), replacing the old single, wrong "sextile
  Uranus" (Sun-anchored).

### 11A.10 True-instant recompute — BUILT (July 26, 2026)

Eclipse positions and aspects (both aspect_calendar's eclipse rows and
eclipse_aspects, §11A.9) are computed at the exact eclipse (syzygy)
instant — exact Sun-Moon conjunction for a solar eclipse, exact
opposition for a lunar eclipse — replacing the 00:00 UT daily-snapshot
basis for eclipses specifically. This is a deliberate, disclosed
exception to the 00:00 UT convention that governs sky_positions
generally (§11A.1): sky_positions itself is untouched by this task and
remains 00:00 UT throughout. Rationale: the midnight snapshot can sit
up to ~1° off the true eclipse instant, which is enough to flip a
near-orb-edge aspect or a boundary sign.

**Engines:** generation via `astronomy-engine` (npm, MIT license, pure
JS, no external data files, no network calls) — geocentric apparent
ecliptic longitude, true equinox of date, for all 10 tracked bodies
(Sun, Moon, Mercury-Pluto), computed uniformly via GeoVector + Ecliptic
conversion. The exact syzygy instant is found by bisection on the
signed Sun-Moon longitude difference, bracketed within +/-36 hours of
each eclipse's previously-stored date. Independent validation via
`sweph` (Swiss Ephemeris, Moshier analytic mode — also no external data
files, fully offline) — a separately written, separately maintained
codebase from a different theoretical lineage. Both engines run from
`scripts/lib/eclipse-true-instant.mjs` (the shared generation engine)
and `scripts/validate-eclipse-instants-sweph.mjs` (the validation
script) respectively; neither makes any API call. Cross-checked across
the full dataset (104 eclipses x 10 bodies = 1,040 position pairs, not
a sample): max discrepancy between the two engines 12.78 arcseconds
(Neptune, 2023-10-14 solar eclipse), zero disagreements above a
3-arcminute flag threshold, zero retrograde-direction mismatches.

External validation (Swiss Ephemeris / Moshier) had already found two
cases where a Sun-Neptune aspect flips between the snapshot-basis and
the true instant: 2027-08-02 and 2045-08-12. Both confirmed by this
build: in both cases the aspect (trine / square) drops from just inside
3° orb to just outside — the aspect disappears entirely at the true
instant, it does not change into a different aspect type. Across the
full recompute: 0 of 104 eclipses changed sign (the two historical
boundary corrections below were already right); 6 aspects newly
qualify, 7 stop qualifying, 0 change type, 72 keep the same type at a
different orb — every orb change is fully explained by the anchor's own
position shift plus the other body's own movement between the old
snapshot and the true instant (no unexplained changes).

**BOUNDARY_CORRECTIONS retired.** The two hand-verified overrides
carried in a prior version of `scripts/load-eclipses.mjs`
(2031-05-21 -> Gemini 0.0715°; 2039-06-21 -> Cancer 0.2085°, §11A.5)
are removed, not layered on top of the true-instant computation. The
true-instant recompute independently reproduces both signs (0.0731° and
0.2147° respectively, within arcseconds of the hand-verified values) —
three-way agreement (hand-check, astronomy-engine, sweph) is why the
override table was retired rather than kept as a second, competing
source of truth. `scripts/load-eclipses.mjs` now computes
body_1_sign/body_2_sign/exact_degree directly from the true-instant
engine for every eclipse, so this stays correct on any future
regeneration (e.g. a date-range extension) without needing a new
manual override pass.

**eclipse_aspects write model changed to delete-then-insert** (per
eclipse_id), superseding the prior upsert-only approach in
`scripts/generate-eclipse-aspects.mjs` — an upsert can only add or
update rows, so it could never remove a row for an aspect that stops
qualifying at the true instant. The 7 disappearing aspects
(§11A.9) required this fix to actually take effect.

**Certification extended to cover eclipse data.** Before this build,
`scripts/certify-calendars.mjs` excluded eclipse rows from every real
content check (only counted them) and never read `eclipse_aspects` at
all — a green run could not have caught a wrong eclipse position or
aspect. It now also checks: every eclipse anchor position matches a
fresh true-instant recompute; `eclipse_aspects` row count; FK integrity
(every row maps to a real eclipse); anchor body/sign/degree matches the
eclipsed body's own aspect_calendar row; the other luminary is never
present; sign-consonance and orb match the stored sign/degree on every
row; every row is within the 3° active orb; one row per (eclipse, other
body) pair. It does not re-run the two-engine cross-validation itself
(that stays a one-time independence check, in
`scripts/validate-eclipse-instants-sweph.mjs`) — the certifier is a
fast standing drift/corruption guard, not a from-scratch validation.

**Status: BUILT.** `eclipse_aspects` (§11A.9) and the eclipse rows in
aspect_calendar (§11A.5) are both current, true-instant data, verified
by fresh live-table reads after write and by a full
`scripts/certify-calendars.mjs` run (39/39 checks passed). The
DISPLAY-ANCHOR ruling and NATAL_CAUGHT re-anchor (§11A.5, §11A.8)
remain a separate, still-pending display-fix brief — this task changed
stored data only, no display/render code and no
`scripts/engine/assemble-brief.mjs`.

---

## 12. OPEN — FOUNDER RULINGS NEEDED (do not assume)

1. **Notification bundle** — tier line (which events email vs. calendar-only); guaranteed monthly email on batch publish or not; subscriber volume preference or not; pointers vs. content in email bodies. *Scheduling: closes before stage G, ideally after the founder has seen real calendar output.*
2. **Discount invitation mechanics** (Door B → subscribe). *Scheduling: closes at stage E planning, with Stripe's coupon/promotion options in view.*
3. **Final prices** — LAST, after cost structure and offer are fully settled.
4. **Refusals-in-methodology paragraph** — yes/no at page-writing time.
5. **Transit surface URL form** — `/reading/[slug]/transits` vs. a tab. *Ruled before any UI build; discussion scheduled.*
6. ~~Mean vs. true node~~ — **CLOSED: mean** (details in §11A.1). Still open: the Nodes background-asset decision (two node images → one).
7. **Shared-core maintenance** — build-time assembly of the universal block vs. discipline across four documents.
8. **Eclipse-specific orb** — OPEN, leaning wider. NATAL_CAUGHT
   currently uses the standard 3° orb. Because an eclipse is a
   far more significant event than an ordinary transit, a wider
   eclipse-specific orb is under consideration (e.g. an eclipse
   opposing natal Jupiter at 7.75° currently goes unnamed — the
   2026-08-12 case). To be decided during the content pass,
   looking at real eclipse output across the chart. If widened:
   touches eclipseCatches, surfaces more natal contacts per
   eclipse, and requires regenerate + validate (confirm what
   newly appears, nothing spurious). Founder leaning toward wider
   given eclipse significance; not yet ruled.

## 13. DEFERRED — DO NOT BUILD, DO NOT FORECLOSE

Sample chart subject (criteria in §2) · eclipse-day variant for the ambient layer · annual pricing · resubscribe history restoration · profection-weighted transit calendar emphasis · PWA · marketing/disclosure notes file (incl. "silence is the instrument working" copy) · notification email naming · dispositors (§4.8) · chart-level synthesis (§4.8) · Chiron and other bodies not currently in the input set.

## 14. BUILD SEQUENCE

A. (done) Decisions — this document.
B. Zero-dependency shippables, interleavable anytime: methodology page, natal parity, sample reading shell, favicon/location-entry/about backlog.
C. Deterministic core: sky event stream → `sky_positions` fill (after the node finding) → eclipse dataset → aspect itinerary engine + natal engine updates → validate all math against a professional ephemeris. No generation until this passes.
D. Content pipeline: transit prompt backlog (§10.5) → Nodes variant (done, pending read) → Moon blocks → founder QC on real charts.
E. Subscription lifecycle (parallelizable with C/D): Stripe subscription mode, webhooks, batch kickoff, lapse gating, portal. Discount mechanics ruled here.
F. Surfaces: Transiting Planets, Transit Calendar, Today's Texture + sky wheel, subscribe/resubscribe surfaces. URL form ruled before this starts.
G. Notifications (after the §12.1 bundle) → dogfood gate: the full product runs on the founder's chart through ≥1 full lunation cycle before any external subscriber.

Education layer follows transits (founder-decided order) so they can be built to work together.

**Two properties of this sequence, by design:** everything AI-generated sits downstream of everything deterministic; and the natal product is whole at every stage boundary — there is no valley where the thing is half-migrated.

## 15. TOOLING & EXECUTION

*Founder's call whether this section belongs in the spec at all — included pending that ruling.*

- **Claude Code adopted for repo execution.** Pro subscription auth verified — it draws from the subscription's shared usage pool, not API credits. (Watch: a globally exported `ANTHROPIC_API_KEY` would silently bill API rates; Texture's key belongs in the project `.env`.) Sonnet default; stronger model for hard engine work; plan-mode-first posture.
- **Standing instructions live in `AGENTS.md` at repo root** (`CLAUDE.md` imports it). Governing docs live in a `docs/` folder in the repo.
- **Division of labor:** chats for thinking and specs; Claude Code for execution against this document. Prompt content is drafted in chat and approved by the founder — never edited by an execution session without explicit instruction.
- Copy-review rule as ratified: user-facing copy is founder-approved before it ships.

## 16. DECISION LOG

**Display law (DECIDED July 16):** degrees display FLOORED/TRUNCATED (traditional ephemeris convention) wherever whole degrees are shown; data keeps full precision; a planet displays 29° exactly when anaretic — display and DEGREE_FLAG can never disagree.

**July 14–18, 2026:** uniform sky_positions range and 00:00 UTC convention; Chiron/Lilith excluded; mean node closed; Pluto boundary row corrected; floor display rounding; old transit_calendar retired/renamed; two-table calendar architecture with self-contained rows; flat 3°/1° transit orbs both contact types; five majors; ID system; actual-UTC-date convention; rows-vs-windows law; edge-window drop rule; no naming vocabulary; nodes as one axis row; penumbral included; no eclipse kind field; Sun-derived eclipse degrees; two eclipse sign corrections; spec authorship moves to the primary work chat (repo copy canonical; other chat stands down unless prompt work returns there).

**July 19, 2026 (Phase 3 brief-assembly fixes):** Saturn's
PASSAGE_CONTACTS bug traced to two stacked causes — a one-day dating-
boundary coincidence letting a prior-passage window leak in, and a
grouping key that merged different aspects to the same natal point —
both fixed; passage membership now requires date-range overlap AND
sign match, and grouping is keyed by (point, aspect). Two standing
structural guards added (sign-consonance, passage-consonance),
hard-failing rather than filtering. Windows and passes redefined as
independent, PASSAGE-scoped counters (never window-scoped) for both
the natal-contact engine and aspect_calendar; aspect_calendar IDs
regenerated accordingly (row count corrected from a stale 4,585 to
4,607 — window count unchanged and verified). New "aspect passage"
concept for aspect_calendar: consecutive same-aspect, same-pair
windows stay one passage unless either body's sign changes between
them. sign_egress_date confirmed to be stored per-leg rather than per
true passage (found via Pluto's real 2023–2024 case AND Saturn's own
current passage); fixed at the query layer only (findTruePassageRows)
for this build, with the data-layer fix and transit_calendar
regeneration scheduled as the next engine task and a blocking
prerequisite before generating content for any body beyond Saturn/
Mercury/Nodes. Activation qualification rule replaced: a sky aspect
now activates a host natal contact whenever it reaches the 1° exact
band during that contact's own orb window, dropping the older
three-way "both bodies touch the same natal point" test; the
CONFIGURATION entry type (§3) is superseded by this ACTIVATION model.
Boundary dates are now always stated in the brief format, even when
they precede phase open or extend past phase close.

**July 20, 2026 (passage-fragmentation fix — closes the July 19 KNOWN
BUG, §11A.2):** `generate-transit-calendar.mjs` rewritten around the
ratified passage model — sign-consonant membership (a dip's own rows
belong to the dipped-into sign's passage, not the sign dipped out of,
a founder correction during planning over an initial shape-based
draft), a new `re_ingress` event type (Ruling A), `passage_id` /
`passage_first_ingress_date` on every row (Ruling B/C), and
`entry_number` / `entry_count` on every ingress-type row including
retro-ingress (Ruling D). `sign_egress_date` repurposed in place to
mean the passage's TRUE final egress. ADJACENT PASSAGES INTERLEAVE IN
TIME is now explicit and verified (Saturn's Pisces/Aries passages
overlap ~9 months; the same symmetric rule also extends Pluto's
current Aquarius passage to 4 entries and a 2044-01-19 final egress —
a consequence outside the originally-cited case, surfaced and
approved before implementation, not silently absorbed). Every body has
exactly one pre-range (anchor-less) passage at the data's leading edge
under the corrected membership — confirmed to exist for all nine,
where the founder's initial read expected none; handled via the
`{body}-{sign}-pre-range` passage_id convention and a strengthened
NULL rule (entry_number AND entry_count NULL throughout a pre-range
passage, not just its unrecorded first entry, since the true total is
itself unknowable). Full regeneration: 1,618 rows before and after (68
retyped to re-ingress under new ids, 307 more corrected to their true
final egress on their existing id — 375 rows touched, 8 bodies; Sun
and Nodes unaffected). Schema migration
(`scripts/fix_transit_calendar_passages.sql`, run by the founder in
the Supabase SQL editor) added the four new columns and widened the
event_type CHECK constraint before regeneration. The query-layer
workaround (`findTruePassageRows`) is removed from
`contact-engine.mjs`; `assemble-brief.mjs` and `print-itinerary.mjs`
now read passage identity and bounds directly off clean data. SHAPE
(a brief field, not a stored column) is now computed from the body's
full station timeline within a passage's own bounds regardless of row
membership — a founder correction over an initial draft that used
`entry_count - 1` and lost real information (Saturn's Aries passage
has 3 retrograde episodes, only 1 of which is a dip; `entry_count - 1`
reported "1," erasing the two later in-sign loops) —
`computeShape` in `contact-engine.mjs`, shared by both engines.
`scripts/validate-calendars.mjs` (pre-existing, outside this fix's
file scope, not modified at the time) encoded the old per-leg
sign_egress_date definition and reported expected mismatches until
Step 4 (below) retired and deleted it.

**July 20, 2026 (Step 4 — standing certification script, retires
validate-calendars.mjs):** `scripts/certify-calendars.mjs` added,
`scripts/validate-calendars.mjs` deleted in the same commit. The new
script is read-only (no writes, no AI/API calls) and covers all four
tables (sky_positions, transit_calendar, aspect_calendar,
transit_pieces): sky_positions row counts, date-sequence gaps, and
sign/longitude self-consistency; transit_calendar's row-count
derivation (1,189 pre-fix ingress-type = 1,121 ingress/retro-ingress +
68 retyped re-ingress, plus 429 station-type = 1,618), phase_end_date
chain integrity, and the passage model itself (shared
passage_first_ingress_date/sign_egress_date across every passage_id,
entry_number/entry_count sequencing, the pre-range NULL rule), plus
named spot-checks on Pluto's 4-entry Aquarius passage, Saturn's
interleaved Aries/Pisces passages, and Pluto's pre-range Capricorn
passage; aspect_calendar's window/pass integrity re-expressed against
the July 19 passage-scoped pass-numbering ruling (independently
re-derived from sky_positions sign data, not trusted from
generate-aspect-calendar.mjs's own logic), sign-consonance, a
motion-state cross-check, and the fast-mover daily-resolution proof;
transit_pieces' existence/row-count as a status fact (0, as expected
pre-generation); and both standing structural guards
(assertSignConsonant, assertPassageConsonant) re-run over a live
recompute via assembleBrief() for Saturn, Mercury, and Nodes, which
doubles as the brief-assembly completion check. Found and fixed one
real bug in passing: assemble-brief.mjs's main() ran unconditionally
on module load, so importing assembleBrief() as a library function
(needed for the live-recompute check) also printed a full brief as a
side effect; added the same "only run when invoked directly" guard
already used elsewhere, with no change to its behavior when run
directly. First full run: 28 checks, 28 passed, ALL CLEAR.

**July 21, 2026 (cusp-seam crossing-detection bug — found via a
founder-directed investigation, not assumed):** a natal point (or, for
sky-sky pairs, a coincidental alignment) sitting near 0° or 30° of a
sign has its aspect target ALSO on a sign boundary for the transiting
body, so the exact crossing coincides with the transiting body's own
sign-ingress. The day just before that ingress is sign-consonant with
the OTHER sign, so the in-orb prefilter (correctly, per sign-
consonance) excludes it from the window — meaning the two days needed
to see the crossing (one on each side of exact) end up split across
two different, non-adjacent windows, and neither one alone contains
the flip. A real perfection was therefore silently reported as "no
exact." Surfaced by a live case (Ascendant/MC placed near a sign
boundary in a synthetic test chart producing NATAL_CONTACT STATUS: "no
exact this passage" for otherwise-complete, non-truncated passages —
structurally impossible per the founder's own reasoning that a
complete passage traverses every degree of its sign).

Fixed in both `computeContactWindows`/`finalizeContactWindow`
(`scripts/engine/contact-engine.mjs`) and `processPair`/`finalizeWindow`
(`scripts/generate-aspect-calendar.mjs`): the crossing detector now also
checks one sample immediately past each edge of a window — a day the
sign-consonance prefilter excluded from view — purely to test whether
the true crossing falls in the gap between it and the window's own
boundary day. DATE-CREDITING RULE: a crossing found this way is always
recorded on the window's OWN boundary day, never the excluded day
itself (which sign-consonance says was never truly in orb) — sign-
consonance's own definition of orb membership does not change.
Verified against a concrete case (Sun trine a point at Aries 0.0°): 0
of 22 real crossings detected before, 22 of 22 after, all at exactly
0.000°; a mid-sign control point was unaffected (22 of 22, byte-
identical before/after); the one genuine data-boundary case (day 1 of
tracked history, no earlier sample to check) correctly still reports
no exact.

Scope audited before any regeneration, proven rather than assumed:
`contact-engine.mjs` affected (fix site). `aspect_calendar` affected —
of 381 non-eclipse "no exact" rows, 178 (47%) had a real crossing
sitting in this blind spot, bigger than the founder's own prediction
(expected sky-sky collisions to be coincidental; found instead that
fast-slow pairs are structurally exposed — 159 of 242, 66% — because a
slow body's sign barely moves while a fast body sweeps through many of
its own signs during that stretch; fast-fast pairs 19 of 97; slow-slow
pairs unaffected, 0 of 42, confirming the founder's own prediction
there). `transit_calendar` confirmed NOT affected by reading (not
assuming) `detectBodyEvents` in `generate-transit-calendar.mjs`: it
finds ingresses via a direct day-over-day sign comparison and stations
via a direct retrograde-flag comparison, with no aspect classification
or sign-distance prefilter for any day to be excluded from — the bug's
mechanism has no equivalent there.

`aspect_calendar` regenerated with the fix: row count unchanged, 4,607
(the fix changes WHICH rows have an exact_date and their ids, not the
total window count). 189 ids changed (some are the 178 flips
themselves; the rest are pass-number ripple effects within aspect
passages where a sibling window's flip changed the passage's own total
pass count). The remaining 4,418 shared ids were diffed field-for-field
against the pre-fix table and reproduce identically — zero mismatches.
`generate-aspect-calendar.mjs` also gained a permanent stale-ID cleanup
step: its upsert-by-id could never remove a row whose id changed under
a logic fix, which would otherwise leave orphaned rows behind on any
future regeneration (caught during this same regeneration — a first
draft of the cleanup query itself had an unpaginated Supabase read
silently capped at the default 1,000-row limit, leaving 167 orphans
behind briefly before being caught and corrected).

**July 26, 2026 (governance):** adopted "spec is part of done" as a
standing rule in AGENTS.md — no task is complete until docs/SPEC.md
reflects every architecture/data-model/ruling/inventory change a task
made, included in the same commit, whether or not the task brief
itself calls for a SPEC update.

**July 26, 2026 (spec drift correction):** §7's node-convention line
still read "mean vs. true — OPEN (§12.6)" after the ruling had already
closed to mean node during the §11A.1 build; corrected to match
§11A.1 / §12 item 6.

**July 26, 2026 (eclipse true-instant recompute — closes §11A.10):**
both aspect_calendar's 104 eclipse rows and all 78 eclipse_aspects rows
recomputed at the exact Sun-Moon syzygy instant (conjunction for solar,
opposition for lunar), replacing the 00:00 UT daily-snapshot basis used
since the original July 18 load. Generation via `astronomy-engine`
(MIT, offline, no data files); independent validation via `sweph`
(Swiss Ephemeris, Moshier mode, also offline) across the full
104-eclipse x 10-body dataset — max discrepancy 12.78 arcsec, zero
disagreements. `BOUNDARY_CORRECTIONS` (the two hand-verified overrides
from the July 18 boundary-verification pass) retired entirely — the
true-instant computation independently reproduces both signs, and
`scripts/load-eclipses.mjs` now computes positions from the true-instant
engine directly rather than the Sun's 00:00 UT snapshot, so this stays
correct on any future regeneration. Zero sign changes found (the two
historical boundary cases were already right); 6 aspects newly qualify,
7 stop qualifying (net 79 -> 78 rows) — including the two previously-
flagged Sun-Neptune flips (2027-08-02, 2045-08-12), both confirmed.
`eclipse_aspects` write model changed from upsert-only to
delete-then-insert per eclipse, since upsert alone can't remove a row
for an aspect that stops qualifying. `scripts/certify-calendars.mjs`
extended (separate commit) to actually check eclipse content — true-
instant position match, eclipse_aspects rule set, FK integrity — since
it previously only counted eclipse rows and never read eclipse_aspects
at all; full 39-check run passes clean. Live-table state verified by
fresh reads after write, not by script logs. Display/render code and
`scripts/engine/assemble-brief.mjs` untouched — the DISPLAY-ANCHOR and
NATAL_CAUGHT re-anchor rulings (§11A.5, §11A.8) remain a separate,
still-pending brief.

**July 29, 2026 (eclipse presentation display-fix brief — closes the
pending DISPLAY-ANCHOR and NATAL_CAUGHT-re-anchor rulings, §11A.5 /
§11A.8; wires CONFIGURATION into display, §11A.9):** diagnosed every
path an eclipse fact reaches a brief in `scripts/engine/assemble-brief.mjs`
and `scripts/engine/print-itinerary.mjs` before any edit; confirmed no
window-vocabulary leak anywhere (an eclipse is a single instant, never
a window — no orb dates, no WINDOW/PASS, no applying/separating —
already true going in, now recorded as a binding rule in §11A.5). Three
real bugs found and fixed, all Sun-anchored regardless of eclipse kind:
(1) POSITION — a lunar eclipse's printed degree/sign/house was always
the Sun's, never the eclipsed Moon's; (2) NATAL_CAUGHT — the
conjunct/opposite label was always anchored to the Sun's sign, so a
natal point sitting with the eclipsed Moon on a lunar eclipse
misread as "opposite"; (3) CONFIGURATION (Nodes ECLIPSE entry only) —
computed live and always from the Sun's own aspect_calendar rows,
never reading the true-instant `eclipse_aspects` table (§11A.9) built
July 26. Fixed via one shared anchor rule — `eclipseAnchorBody` /
`eclipseAnchorSign` in `scripts/engine/contact-engine.mjs`, keyed off
each eclipse row's own stored `event` kind (Lunar Eclipse → Moon,
else → Sun), consumed identically by the Nodes TYPE: ECLIPSE entry,
the planet-piece ECLIPSE_ACTIVATION entry, and print-itinerary.mjs —
rather than three separate implementations. `eclipseCatches` now
reads this shared anchor instead of hand-deriving the Sun's sign, so
the NATAL_CAUGHT fix applies to both entry types by construction, not
by separate edits. CONFIGURATION wiring applies to the Nodes entry
only — ECLIPSE_ACTIVATION has no CONFIGURATION field in
`docs/brief-template-planet.md`. Verified on the dogfood chart's real
Supabase data (read-only assembly path, no writes, no AI/API calls):
the 2025-03-14 lunar eclipse now shows POINT Virgo/9th (was Pisces/
3rd) and CONFIGURATION "opposition Saturn, trine Uranus" (was the
single, wrong "sextile Uranus"); the 2025-09-07 lunar eclipse's
NATAL_CAUGHT now reads South Node conjunct / North Node opposite
(reversed from pre-fix). No ECLIPSE_ACTIVATION entry exists in either
tracked planet piece's (Saturn, Mercury) *current* live phase as of
today, so the entry type is unverified on the live brief; confirmed
instead against genuine historical hits found by scanning real
eclipse/sky_positions data (not fabricated) — Saturn's own
`assembleBrief({referenceDate})` output for both a real lunar hit
(2025-03-14, correctly Moon-anchored to Virgo/9th) and a real solar
hit (2025-09-21, correctly Sun-anchored to Virgo/9th, unchanged) —
confirming the fix engages correctly in ECLIPSE_ACTIVATION for both
eclipse kinds — independently corroborated by `scripts/exercise-
engine.mjs`'s own built-in extra case (`eclipse-hit-2025-09-21`),
which exercises this exact real ECLIPSE_ACTIVATION scenario and now
passes. Full `scripts/exercise-engine.mjs` run (271 briefs against the
structural differ): 271 passed, 0 failed, clean after the change.
Runtime note for future reference: this run took ~55 minutes
wall-clock (mostly sequential Supabase round-trips, not computation —
CPU time was only ~2.5 minutes) with no progress output until the
process exited, so a run in progress can look stalled when it isn't;
budget for it accordingly rather than assuming a hang.

**July 29, 2026 (Stage One security cleanup — DONE):** three fixes
landed, no database tables touched, no customer data moved (that's
stage two, separately authorized). (1) Live check before any change:
using the site's own public anon key, a no-filter query against
`readings` returned rows and a table-wide count with no slug named at
all, confirming what a migration-file comment had only asserted —
`readings` has no real row-level security; any visitor can currently
list the whole table, not just look up a reading they already have
the address for. `transit_pieces` behaved the same way, matching its
known-temporary anon-SELECT-all policy
(`scripts/add_transit_pieces_anon_select_policy.sql`). This is exactly
the gap stage two is scoped to close; nothing was changed by this
check. (2) `app/admin/page.tsx` — the manual reading-creation tool —
deleted. It held a plaintext password (`'tx-9k2mR#vQ'`, compared
client-side) and wrote to `readings` directly from the browser using
the public anon key; obsolete now that the Stripe webhook creates
readings automatically. Confirmed nothing else in the app imported or
linked to it before removal; the routes/helper it called (`/api/chart`,
`/api/generate`, `lib/supabase.ts`) are shared with the live purchase
flow and were left untouched. (3) `app/reading/[slug]/page.tsx`'s
Supabase query narrowed from `select('*')` to the 23 columns the page
actually renders, dropping `email` and `stripe_session_id` out of the
browser payload (they were fetched but never displayed). The 23 names
were checked against the live database's real columns, not just the
page's TypeScript type, before the change shipped — no mismatch found.
(4) The webhook's `generateSlug()` (the only copy left once the admin
tool was deleted — it had its own separate copy) switched from
`Math.random()` to Node's `crypto.randomInt`, same 36-character
alphabet and 12-character length, so the existing collision-check loop
and slug shape are unchanged. Existing slugs were left as issued, not
reissued. **KNOWN CLEANUP, logged but NOT fixed here (not a security
item, separate task):** `app/api/checkout/route.ts:27` hardcodes the
reading's price (`unit_amount: 2900`), which conflicts with the
project's own never-hardcode-prices rule — needs to move to a config
value. Noted in passing: that same line's comment says `// $30.00` but
the actual amount is $29.00 — a stale/incorrect comment, left as-is
since pricing is explicitly out of scope for this task.

**July 29, 2026 (Stage Two — the lock, DONE, deploy pending
separate authorization):** closes the exposure Stage One found.
Design finding: a plain RLS `USING(...)` policy cannot express
"a slug-filtered read succeeds, an unfiltered read returns
nothing" — RLS decides row-by-row visibility and has no way to see
whether the caller's request named a slug at all, so any policy
permissive enough to let a real slug through is equally permissive
to an unfiltered scan. Used instead: lock the tables outright
(`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `REVOKE SELECT ...
FROM anon`, and the transit_pieces temporary open policy
(`scripts/add_transit_pieces_anon_select_policy.sql`, `USING(true)`)
dropped) and expose two SECURITY DEFINER functions that require
the slug as an explicit argument: `get_reading_by_slug(p_slug)`
(the same 23 columns the reading page already used, `email` and
`stripe_session_id` excluded) and `get_transit_pieces_by_slug
(p_reading_slug)`. Migration: `scripts/lock_readings_and_transit_
pieces.sql`, run against Supabase's SQL editor (no direct DB/CLI
connection available to run it programmatically) and verified live
with the public anon key, both directions: a real slug returns the
correct row(s) through the functions; a missing/wrong slug returns
zero rows; a direct table read — filtered or not — is refused
outright (`permission denied for table readings` /
`transit_pieces`), closing the Stage One exposure. Code changed to
match: `app/reading/[slug]/page.tsx` and `app/reading/[slug]/
transits/page.tsx` now call the two functions instead of querying
the tables directly; no other code path reads either table with the
anon key (everything else — the Stripe webhook, session-lookup and
generation routes, all admin/dev scripts — uses the service-role
key, which bypasses RLS and is unaffected). The transits page still
reads a hardcoded dogfood slug rather than its own URL parameter;
this is pre-existing, unrelated to the lock, and left as-is (known
state, not a bug, pending the real per-slug wiring).
**Accurate Stage Three scope, recorded here so it isn't
mis-stated:** Stage Two does not split any table or move any data.
Stage Three moves `email` — the one sensitive field still in
`readings` — into a new locked table, and adds `full_name` there as
a NEW, currently-nonexistent, initially-empty column for future
billing/identity capture. `readings.name` is NOT part of Stage
Three: it's already the reader-facing display name (optional,
free-form, deliberately not the legal name, not what Stripe holds)
and correctly stays in `readings`, slug-gated, as-is.

**July 29, 2026 (Stage Three, Step 0 — join key confirmed):**
`readings.id` (uuid, primary key, default `gen_random_uuid()` —
confirmed against the live database's own schema description, not
inferred from a sample value) never reaches the browser: it is
absent from `get_reading_by_slug`'s return columns and from every
JSON response any route sends client-side. By contrast,
`readings.stripe_session_id` DOES reach the browser — Stripe's own
checkout session ID is stored there (`stripe-webhook/route.ts`) and
that same value rides in the post-checkout redirect
(`/success?session_id={CHECKOUT_SESSION_ID}`, `app/api/checkout/
route.ts`), landing in the address bar and browser history on every
purchase, and `app/api/reading-by-session/route.ts` accepts it as a
public lookup parameter. `id` is therefore the join key; founder
approved.

**July 29, 2026 (Stage Three, Step 1 — reading_contacts table
created, schema committed):** new table `reading_contacts`, 1:1
keyed on `reading_id uuid PRIMARY KEY REFERENCES readings(id) ON
DELETE CASCADE` (cascade is a founder privacy ruling: deleting a
reading should take its email with it, no orphaned contact data),
plus `email text NOT NULL` and `full_name text` (nullable, left
empty — new column, not backfilled from any prior data). RLS
enabled with zero policies and no exposing function of any kind —
stricter than `readings`/`transit_pieces` (which have one
slug-required function door): `reading_contacts` has no public path
in at all, direct or indirect; only the service-role key can reach
it. Migration: `scripts/create_reading_contacts.sql`, to be run
once against Supabase's SQL editor (no direct DB/CLI connection
available), same route as every prior migration. Live anon-key
verification of the lock is Step 1's closing requirement, pending
the founder running the migration.

**July 29–30, 2026 (Stage Three, Step 1 verified + Step 2, email
migration — DONE):** Step 1's lock verified live with the public
anon key after the founder ran the migration: a direct select on
`reading_contacts` is refused outright (`permission denied for
table reading_contacts`, code 42501) and the table doesn't appear
anywhere in the anon key's own view of the API surface — no path
in at all, stricter than `readings`/`transit_pieces`'s one
function door.

**Founder ruling (prelaunch data hygiene, folded into this step):**
no real customers exist yet — the `readings` table was ~15 rows of
test/founder data, not production data to protect. Ruling:
completeness, not who paid, decides what stays. A row is kept only
if `email`, `chart_data`, and all 14 interpretation columns
(`sun`..`pluto`, `asc_reading`, `mc`, `north_node`, `south_node`)
are populated; `birth_time`/`birth_time_known`/`birth_lat`/`birth_lng`
are explicitly exempt (a reading can legitimately lack a birth
time). Backup taken first and verified by reading it back (not
trusting the write log): `backups/readings_backup_2026-07-
30T03-52-57-715Z.json` (gitignored — real emails/birth data, never
committed), 15/15 rows, all 27 columns, byte-identical to a fresh
live re-read at verification time. Completeness scan found 7 fully
complete rows and 8 incomplete (6 missing only `email` — throwaway
test rows; 2 — `010kct0s3g2g`, `t6bklk2cq3b8` — had an email but no
chart_data/interpretations, i.e. purchases that never finished
generating). Founder confirmed the keep/delete list before any
delete ran. The 8 incomplete rows were deleted from `readings`
(re-matched by slug immediately before deleting, count checked
against the confirmed list before the delete executed). Verified
by fresh read after: exactly 7 rows remain, all 7 pass the same
completeness check with zero empty columns.

Email migration then ran on the 7 surviving rows: one
`reading_contacts` row per reading (upsert keyed on `reading_id`),
`full_name` left null. `readings.email` was NOT touched — it still
holds email in both places, per plan, until Step 4 drops it.
Verified by fresh read: `readings` count (7) == `reading_contacts`
count (7), zero orphans either direction, every row's email in
`reading_contacts` matches its `readings` row exactly, `full_name`
null on all 7.

Stage Three now stands at: locked table built and verified, live
row count in `readings` is 7 (down from 15, all test-quality rows
removed by founder ruling above, backup preserved), all 7 have a
matching `reading_contacts` row. Next: Step 3 (rewire the Stripe
webhook to write email into `reading_contacts` instead of
`readings`) and Step 4 (drop `readings.email` once nothing reads it
from there).

**July 30, 2026 (Stage Three, Step 3 — webhook rewired, DONE, not
tested against live Stripe):** `app/api/stripe-webhook/route.ts`'s
`readings` insert no longer writes `email`; it now selects the new
row's `id` back (`.select('id').single()`) immediately after
inserting. A second insert into `reading_contacts`
(`{reading_id: newReading.id, email: meta.email}`) follows,
`full_name` left unset (null) with a comment noting where a future
billing/identity capture flow would populate it. Write order is
load-bearing and enforced by the code shape, not just convention:
the `reading_contacts` insert is textually and causally after the
`readings` insert's `await`, since `newReading.id` doesn't exist
until that insert returns — a new purchase cannot produce a
`reading_contacts` row without first producing its parent `readings`
row. `npx tsc --noEmit` run clean, zero errors. Not exercised against
a real Stripe event (explicitly out of scope for this step); logic
reviewed instead of live-tested.

**July 30, 2026 (Stage Three, Step 4 — readings.email dropped,
VERIFIED):** audited every file touching `readings` before drafting
the migration: no code path read `email` from it any longer (the
reading page/functions excluded it since Stage One/Two; the webhook
was rewired off it in Step 3; `/api/generate` selects `readings.*`
but only ever reads `chart_data` and `birth_time_known`;
`/api/checkout` reads `email` only from the incoming request body,
never from the table). Migration `scripts/drop_readings_email.sql`
(`ALTER TABLE readings DROP COLUMN email`) run by the founder in the
Supabase SQL editor. Verified live afterward, not assumed: the
database's own schema description shows 22 columns on `readings`
with no `email` among them; all 7 live rows confirmed to have no
`email` key; `reading_contacts` independently confirmed unaffected
(still 7 rows, all with email intact); the actual public-facing
function the reading page calls, `get_reading_by_slug`, called live
with the anon key against a real slug, still returns correctly.
Email now lives exclusively in `reading_contacts`. Stage Three's
data-model work (Steps 1-4) is complete; only Step 5 (this SPEC
entry plus the changelog note, then the founder's explicit
go-ahead to deploy) remains.

**July 30, 2026 (Stage Three — CLOSED):** the security/data-separation
work opened at Stage One is complete. Summary for future reference:
- New table `reading_contacts` (`scripts/create_reading_contacts.sql`):
  `reading_id uuid PRIMARY KEY REFERENCES readings(id) ON DELETE
  CASCADE`, `email text NOT NULL`, `full_name text` (nullable, added
  empty, not backfilled — reserved for future billing/identity
  capture), `created_at timestamptz DEFAULT now()`. RLS enabled with
  zero policies and no exposing function of any kind — no public path
  in at all, stricter than `readings`/`transit_pieces` (which each
  have one slug-required function door). Verified live with the anon
  key both before and after the email-column drop.
- Join key: `readings.id` (uuid, internal primary key, never sent to
  the browser — confirmed against every route/page in the app).
  `stripe_session_id` was considered and ruled out: it rides in the
  post-checkout redirect URL and is therefore browser-visible.
- Founder ruling, folded into this stage: prelaunch data hygiene —
  `readings` held 15 test/founder rows, no real customers; kept only
  the 7 rows complete across `email` + `chart_data` + all 14
  interpretation columns (birth-time fields exempt). Backed up first
  (`backups/readings_backup_2026-07-30T03-52-57-715Z.json`,
  gitignored, verified by reading it back against a fresh live read)
  before deleting the 8 incomplete rows.
- Stripe webhook (`app/api/stripe-webhook/route.ts`) rewired: new
  purchases write email to `reading_contacts` keyed by the new
  reading's id, never to `readings`. Write order is enforced by the
  code shape (the id doesn't exist until the `readings` insert
  returns).
- `readings.email` column dropped entirely after confirming no
  remaining code path read it. Live-verified after the drop: schema
  has no `email` column, no live row has the key, `reading_contacts`
  unaffected, `get_reading_by_slug` still returns correctly through
  the anon key.
- `readings.name` (the reader-facing display name) was explicitly
  out of scope throughout and was not touched.
- Deploy: gated on the founder's explicit go-ahead, tracked
  separately below once pushed.

**July 30, 2026 (Stage Three — DEPLOYED):** founder gave the
go-ahead; pushed to `origin/main` (`1603963..9574b12`), triggering
Vercel's production build. Post-deploy verification against the live
site and the live database (not assumed from the push alone):
`https://gettexture.app` and `https://gettexture.app/reading/
hejkhjq1zns5` and its `/transits` page all resolve 200 (following the
apex→www redirect). Using the public anon key against production:
direct unfiltered reads on `readings`, `transit_pieces`, and
`reading_contacts` all refused outright (`permission denied for
table ...`, matching pre-deploy behavior) — all three locks hold
post-deploy. `get_reading_by_slug('hejkhjq1zns5')` returns correctly
with chart_data intact; `get_transit_pieces_by_slug('hejkhjq1zns5')`
returns its 3 rows; a bogus slug returns zero rows rather than an
error, as designed. Browser-rendered visual confirmation of the
reading page and transits page (the client-side data fetch/render,
which an API-level check can't see) was left to the founder to
eyeball directly, since no browser-automation tool was available
this session. Stage Three is closed.

**August 3, 2026 (Phase 1 — URL restructure, routing only, not
deployed):** established the URL map recorded in §5.1. The natal
reading page moved unchanged from `/reading/[slug]` to
`/reading/[slug]/natal` (`git mv`, no component changes); the two
post-purchase "here's your reading" links (`app/success/page.tsx` and
the Stripe webhook confirmation email in
`app/api/stripe-webhook/route.ts`) were updated to point at the new
`/natal` path so a paying customer still lands on their actual
reading rather than the new placeholder. New minimal placeholder
pages were added at `/reading/[slug]` (post-purchase home),
`/reading/[slug]/reference`, and `/reading/[slug]/settings` — shells
only, no layout or content; those are Phase 3 work.
`/reading/[slug]/transits` was already at its target path and needed
no file move; it was left exactly as-is, including its pre-existing
bug of ignoring the URL's slug and always rendering the hardcoded
dogfood chart (`DOGFOOD_READING_SLUG` in `lib/config.ts`) — flagged to
the founder during planning and explicitly deferred to whenever
transit generation is built for real, not fixed here. The founder
explicitly ruled out touching `/`: the live pre-purchase marketing
and Stripe checkout flow currently at the site root is not a
placeholder — it's the working purchase path — and stays untouched
this phase; the Phase 3 two-panel pre-purchase home redesign replaces
it later, separately. All six routes (`/`, `/reading/[slug]`,
`/natal`, `/transits`, `/reference`, `/settings`) verified resolving
200 locally after each step. Not pushed to `origin/main` — local
commits only, per the task's no-push instruction.

**August 3, 2026 (Phase 2 — reusable layout skeleton, no shader, no
API calls, not deployed):** built the shared frame every screen
inherits, per `docs/TEXTURE_LAYOUT_PROPORTIONS.md`, as four
components in `app/components/`: `NavBar.tsx` (permanent cream top
bar, TEXTURE wordmark pinned left, the 5 top-level links evenly
distributed to its right — flex-basis-by-content plus
`justify-content: space-evenly` so the active link's larger Anton
lettering never overlaps its neighbors, the whole row's spacing
rebalances instead), `HomeLayout.tsx` (the two-panel home template:
nav, then a full-bleed backdrop with two 44.5%-wide floating panels at
4% side margins / 3% center gutter, each with its cream sticker label
straddling the top edge and an open content slot for Phase 3),
`ReadingLayout.tsx` (the rail + reading-zone template: nav, an 8%
content margin split 23% rail / 3% gutter / 74% reading zone, with the
reading zone's cream rectangle built as shared chrome per founder
ruling — the ratified 6.5%/8% inset reused from the existing
`.card-inner` numbers — while its interior stays an open slot for
Phase 3; takes an `inset: 'normal' | 'full'` prop so the eventual
settings "no backdrop, cream rectangle fills more of the zone"
variant has a hook to build against, though the doc doesn't ratify
exact numbers for that case so `--full` ships as an explicitly-flagged
placeholder inset), and `Rail.tsx` (title, view-control cluster, rule
line, and the 2-line row shape — glyph/name/degree/optional-R then
sign-glyph/sign/house — with a red left bar on the active row;
structure only, row-click scroll-snap behavior is Phase 3). All
vertical math uses `dvh` units directly and horizontal math uses `%`
of the viewport-width stage, matching the doc's own arithmetic exactly
(e.g. rail `left:8%/width:19.32%`, zone `left:29.84%/width:62.16%` —
84% content width split 23/3/74) rather than nested percentages, which
would have compounded rounding error. New CSS is additive-only in
`app/globals.css`; none of the existing classes used by the natal,
transits, or (pre-existing) reference/settings placeholder markup were
touched.

Wired as a rendering proof only (not real screens): `/reading/[slug]`
now renders `<HomeLayout>` with filler panel text, and
`/reading/[slug]/reference` now renders `<ReadingLayout>` + `<Rail>`
with three dummy rows (Sun/Moon/Mercury, one marked active, one marked
retrograde) — `/natal`, `/transits`, and `/settings` are untouched.
`/reading/[slug]/reference`'s backdrop uses `/transits-background.png`
(teal, per the doc's reference-screen backdrop rule);
`/sky-background.png` (dark) is confirmed serving from `/public` but
has no call site yet since natal's reading page isn't touched this
phase. `HomeLayout`'s full-bleed background is
`MorphBackgroundPlaceholder.tsx`, an isolated one-file stand-in for
the future `<texture-morph-bg>` shader (`docs/texture-morph-bg.js`,
still unwired) using `/saturn-background.png`, so the later swap is a
one-file change.

**Discovered and fixed in passing:** `app/layout.tsx`'s
`viewport-fit: 'cover'` was nested inside the `metadata` export, which
this Next.js version silently ignores (logged a build warning,
confirmed by curling the rendered page: the `<meta name="viewport">`
tag was missing `viewport-fit=cover` entirely) — meaning every
`env(safe-area-inset-*)` reference anywhere in the app, including the
new `NavBar`'s top inset, was resolving to `0` regardless of device.
Moved to a separate `export const viewport: Viewport = {...}` per
Next's current API, verified by re-curling the rendered meta tag.
Pre-existing bug, not introduced by this phase, but a direct blocker
of this phase's explicit safe-area requirement, so fixed here rather
than filed for later.

Verification: `tsc --noEmit` clean; both demo routes confirmed 200 via
local dev server; all three `/public` background images
(`saturn-background.png`, `transits-background.png`,
`sky-background.png`) confirmed 200; rendered HTML checked directly
(nav links point at the correct slug-scoped URLs with the right item
marked `active`; rail rows render with the active bar and retrograde
marker). No browser-automation tool was available this session (the
user declined the Chrome extension) — visual confirmation of nav
spacing rebalancing and exact panel/rail proportions on screen was
left to the founder to eyeball directly, same limitation noted in the
Stage Three record above. One commit, not pushed, per the task's
no-push instruction. Hard stop for founder review before Phase 3, per
the task's instruction.

**August 3, 2026 (Phase 2 correction — match the reference mocks,
`docs/mocks/*.png`, no API calls, not deployed):** the Phase 2 skeleton
above was structurally correct per the doc but rendered differently
from the founder's mocks; this pass fixed the four components' CSS/
markup, leaving every ratified number in
`docs/TEXTURE_LAYOUT_PROPORTIONS.md` untouched. Changes:

- **Sticker-label clipping (home):** `.home-panel` had `overflow:
  hidden`, clipping the sticker label's top half (it straddles the
  panel's top edge via `translateY(-50%)`). Removed — `.home-panel-slot`
  already clips the scrolling body content on its own, so nothing else
  was relying on the panel-level clip.
- **Home panels shortened from the top:** `.home-panel` now insets
  `top: 6%` / `height: 94%` *inside* the unchanged, ratified 85dvh
  two-panel band (nav 8% / gap 3% / body 85% / bottom margin 4% are
  untouched) — bottom stays put, top moves down to leave clearance for
  the sticker, per `home.png`. Eyeballed value (not a doc-pinned
  number), flagged for the founder's visual sign-off.
- **Reference backgrounds:** `ReadingLayout` gained a second prop,
  `zoneBackground`, rendered as its own layer inside `.reading-zone`
  (`.reading-zone-bg`), behind `.reading-zone-card` only — never under
  the rail. `background` is now specifically the full-page backdrop.
  `/reading/[slug]/reference` updated to
  `background="/sky-background.png"` (full page, dark) +
  `zoneBackground="/transits-background.png"` (the reading rectangle's
  own backdrop) — previously a single `/transits-background.png` covered
  the whole stage, which put teal behind the rail too. **New general
  pattern, worth recording:** a screen's full-page backdrop and its
  reading-rectangle's own backdrop are two independent images; match
  each mock's pair, don't assume one image covers both.
- **Rail restructure (structural — the material change):** title and
  the view-control links (List/Chart/Calendar) moved OUT of the cream
  rectangle onto the screen's own background, per `natal-page.png` /
  `transits-page.png` — this changes the component `docs/SPEC.md` §5.1
  describes as "the reusable table-of-contents list." New markup:
  `.rail-header` (title + controls, cream color now that it's off the
  cream box, sits in normal document flow near the column's top) then
  `.rail-rect` (cream, rows only, no header inside it, the red
  `.rail-rule` separator removed — neither mock shows one once the
  header moved off the box). `.rail-rect`'s height is content-driven
  (never a fixed constant): it's bottom-anchored at `bottom: 6.5%` of
  the rail column — the same inset percentage `.reading-zone-card` uses
  for its own bottom, and since the rail column and the reading zone
  share an identical height, this lands the rectangle's bottom exactly
  on the reading pane's bottom edge with no separate magic number. Row
  height is a tuned `dvh` constant (`.rail-row { height: 5.3dvh }`,
  eyeballed against `natal-page.png` so 13 rows bring the rectangle's
  top up to just overlap the reading pane's top edge); the same row
  height applied to 11 rows (transits) naturally computes a shorter
  rectangle whose top sits lower and whose bottom sits a bit higher than
  the reading pane's bottom — matching `transits-page.png` — with no
  per-screen CSS branch. Kept the existing red/bold "active" treatment
  for view-control links (base color cream, matching the mocks) since
  neither mock shows one control toggled active; flagged for the
  founder to confirm that reading is correct.
- **Active nav item enlarged:** `.nav-link.active` font-size raised from
  `clamp(20px, 2.2vw, 30px)` to `clamp(26px, 5.2dvh, 46px)` — sized
  against the nav bar's own height rather than viewport width, per
  `home.png`'s "TRANSITS" scale. Eyeballed, not doc-pinned.
- **Checked, no change needed:** no placeholder titles were found
  rendered inside `.reading-zone-card` (fix item 7 in the task brief) —
  likely already addressed or a stale preview; and Anton/Questrial/Geist
  Mono were already wired correctly on every element checked (fix item
  8) — no wrong font-family assignment found.

Verification: both wired routes (`/reading/[slug]`,
`/reading/[slug]/reference`) confirmed 200 via local dev server (no
Supabase calls on either — consistent with the task's no-API-calls
instruction); rendered HTML confirmed the new class structure
(`rail-header`/`rail-rect` present, old `rail-rule` gone) and the two
distinct background URLs on Reference. No browser-automation tool was
available this session (same limitation as the original Phase 2 entry
above) — pixel-level fidelity against the mocks was not visually
confirmed; the founder should eyeball the actual render, particularly
the eyeballed spacing values called out above (home-panel top inset,
rail row height, active-nav size). Commits per fix, not pushed, per the
task's no-push instruction.

**August 3, 2026 (Phase 2 correction #2 — verified against the mocks with
actual screenshots, no API calls, not deployed):** the prior correction
above was still unverified (no browser tool was available that session);
this pass installed Playwright (`npx playwright install chromium`, browser
binary only — nothing added to `package.json`/`package-lock.json`), ran the
local dev server against `DOGFOOD_READING_SLUG`, and screenshotted both
routes that are actually wired to the new components before and after each
fix, comparing side by side against `docs/mocks/*.png`. Scope note: only
`/reading/[slug]` (`HomeLayout`) and `/reading/[slug]/reference`
(`ReadingLayout`+`Rail`) are wired — `/natal` and `/transits` remain the old
unwired pages (Phase 3 work, per §5.1 above), so `natal-page.png` and
`transits-page.png` couldn't be screenshotted against their own real page
yet; they were instead used as the source of truth for the *shared*
`Rail`/`ReadingLayout` behavior (title centering, rail-rectangle height
math), verified through `/reference` by temporarily swapping in 13 and then
11 dummy rows to confirm the rectangle's top position holds steady while
only its bottom moves, then reverting to the real 3-row demo data before
committing (not part of the commit).

Fixes (`app/globals.css`, `app/components/Rail.tsx`,
`app/reading/[slug]/reference/page.tsx`):

- **Home sticker labels (`.home-panel-sticker`):** were left-anchored at the
  panel's 5% content inset and small (`clamp(11px, 1vw, 13px)`, dark ink).
  Per `home.png`, the whole sticker (box + text) is centered horizontally
  over the panel and much larger, in the brand red already used elsewhere.
  Changed to `left: 50%; transform: translate(-50%, -50%)` (was
  `translateY(-50%)` at a fixed left offset), `color: var(--red-strong)`
  (the SAME token as `nav-link.active`/`rail-control.active` — no new color
  introduced, per founder instruction), `font-size: clamp(16px, 1.8vw,
  26px)` (up from 11–13px), `font-weight: 600`. Measured on a 1512px-wide
  render: left sticker center x = 396.875 vs. left panel center x =
  396.883; right sticker center x = 1115.078 vs. right panel center x =
  1115.086 — centered to sub-pixel precision. Rendered size at that width:
  26px (the clamp's ceiling). Size/padding are eyeballed against the mock's
  proportions, not doc-pinned; flagged for visual sign-off.
- **Rail rectangle height (`.rail`, `.rail-rect`, new `.rail-bottom-spacer`):**
  was `position: absolute; bottom: 6.5%` with no `top` — bottom-anchored, so
  it shrank FROM THE TOP as row count dropped, the opposite of both mocks.
  Restructured `.rail` as a column flexbox: `.rail-header` (unchanged,
  already normal flow) then `.rail-rect` as a normal-flow flex item
  (`flex: 0 1 auto; min-height: 0`) so it now starts immediately below the
  header and grows downward with its content, never moving its top. A new
  `.rail-bottom-spacer` (`flex: 0 0 6.5%`) reserves the same 6.5% inset
  `.reading-zone-card` uses for its own bottom, so a tall list still stops
  at the reading pane's bottom edge — percentage flex-basis in a column
  flex container resolves against the container's height (unlike margin/
  padding percentages, which always resolve against width regardless of
  flex direction), so this is exact, not a new magic number. Verified by
  temporarily rendering the Reference rail with 13 and 11 dummy rows: the
  rectangle's top stayed at the identical pixel position in both cases,
  only the bottom moved (13 rows reached to ~4dvh above the reading pane's
  bottom edge; 11 rows stopped further short) — matching the natal-vs-
  transits relationship shown in `natal-page.png`/`transits-page.png`.
- **Rail title (`.rail-title`):** added `text-align: center` (was left by
  flex default). Confirmed centered over the rail column via bounding-box
  measurement on the Reference render.
- **Rail view-controls alignment (`.rail-controls`) — discovered while
  comparing, not one of the task's 6 numbered items:** the control row
  ("READ >" / "CHART >") was left-clustered (default flex row, no
  `justify-content`), but both `natal-page.png` and `transits-page.png`
  show it spread edge-to-edge. Added `justify-content: space-between;
  width: 100%`. Flagged separately from the numbered fixes since it wasn't
  explicitly called out, but falls under the task's "match the mock's
  alignment for every element" global rule.
- **Reference view-controls (`app/reading/[slug]/reference/page.tsx`):**
  `controls={[{ label: 'List', active: true }]}` → `controls={[]}` —
  Reference has no List/Chart cluster per `reference.png` (it's a single
  page). `Rail.tsx` now skips rendering `.rail-controls` entirely when the
  array is empty, so Reference doesn't get a stray empty flex row under its
  title. Natal/Transits keep their controls once Phase 3 wires them to
  `Rail`.
- **Checked, no change needed:** Reference's backgrounds
  (`background="/sky-background.png"` + `zoneBackground=
  "/transits-background.png"`) were already correct from the prior pass —
  confirmed via screenshot, not re-edited. `.placeholder-text` (the
  Reference/Home slot filler copy) is small, muted, italic body text, not
  styled as a heading — no fake "placeholder title" found in the cream
  reading pane.

Verification: `tsc --noEmit` clean; both wired routes and the three
untouched routes (`/natal`, `/transits`, `/settings`) confirmed 200 via a
freshly rebuilt local dev server (`.next` cleared and restarted mid-session
after a stale-CSS false negative — the running dev server had not picked up
two of the six edits on first re-screenshot; a clean rebuild resolved it,
noted here in case it recurs); before/after screenshots taken for both
wired routes at 1512×982 and compared directly against `home.png` and
`reference.png`; computed-style/bounding-box checks (not just visual
eyeballing) confirmed sticker centering and color token. No screenshots
were committed (scratchpad only); no throwaway scripts committed. One
commit, not pushed, per the task's no-push instruction. Hard stop for
founder review.

**August 3, 2026 (terminology correction, ruled by the founder — Home
panel backgrounds):** "gradient" in `docs/TEXTURE_LAYOUT_PROPORTIONS.md`
("dark gradient", "teal gradient" — e.g. the HOME "Panels" section) does
NOT mean a literal CSS gradient. It names the two site-wide sky images
already used on Reference: `/sky-background.png` (the "dark gradient") and
`/transits-background.png` (the "teal gradient"). Two build passes
(the original Phase 2 skeleton and the Phase 2 correction #2 pass earlier
this same day) both read it literally and rendered the Home panels as flat
`linear-gradient()` color washes — visually close enough at a glance (a
dark navy panel, a teal panel) that it went unnoticed until the founder
looked directly at the rendered panels vs. the mocks. Fixed:
`.home-panel-left`/`.home-panel-right` in `app/globals.css` now use
`background-image: url('/sky-background.png')` /
`url('/transits-background.png')` (`background-size: cover`, matching the
pattern already used by `.reading-stage-bg`/`.reading-zone-bg`), replacing
the two `linear-gradient()` declarations entirely. Verified by screenshot:
both panels now show the images' actual soft radial-glow texture instead of
a flat wash. `docs/TEXTURE_LAYOUT_PROPORTIONS.md`'s HOME "Panels" section
annotated in place with this ruling so it isn't misread a third time.

**Chart wheel "RADIAL-GRADIENT circle" — CONFIRMED by the founder (same
day):** it's a real image, not a literal CSS gradient — `chart-radial-new`
(`public/chart-radial-new.png`, added to the repo this session), same
pattern as the sky/transits images above. Not wired into any component yet
(the chart wheel is Phase 3, not built) — this records the asset for
whoever builds it next.

**Still flagged, not resolved — do not assume:** the doc's mobile home CTA
zone ("Teal / CTA zone... Teal gradient with a cream rectangle") almost
certainly means `/transits-background.png`, by the same pattern as
desktop, but that's this session's inference, not a confirmed ruling —
confirm with the founder before building it.

**August 4, 2026 (Phase 3A — natal re-housed to the shell, desktop only;
nodes 14 -> 13; no API calls, not deployed):** re-housed the DESKTOP natal
reading into `<ReadingLayout>` + `<Rail>`, per
`docs/TEXTURE_LAYOUT_PROPORTIONS.md` and `docs/mocks/natal-page.png`.
Mobile's existing single-column page (`.reading-container`/
`.reading-section`) is unchanged in layout; two content-structure fixes
were applied to it as well, per explicit founder instruction (see
correction record below).

**Step 1 audit (findings, confirmed before any change):** the natal page
was ONE responsive structure for both mobile and desktop (fluid
percentage/`clamp()` sizing, zero `@media` queries, zero width-detection
JS anywhere in the app) — not two separate structures. The Phase 2 shared
components (`ReadingLayout`/`Rail`) had NO mobile handling at all (fixed
absolute-percentage desktop positioning only), so rendering them at all
widths would have broken mobile — confirming the entanglement risk the
task brief anticipated. 14 sections confirmed rendering today (10 planets
+ Ascendant + Midheaven + North Node + South Node, the two node sections
adjacent at the end of the list, just before Reference). Also flagged: the
mock shows Overview/Reference as two always-present labeled sections,
while the code at the time was a single-visible-at-a-time toggle — this
became the accordion correction below.

**Founder corrections received after the audit (binding on this build):**
(1) Cover/Birth Data/Intro splash screens do NOT appear on desktop — the
desktop reading pane opens directly on the rail + first placement (Sun),
matching the mock; they still play on mobile, untouched. (2) Accordion
behavior, corrected and applied to BOTH platforms (content-structure, not
layout): Overview and Reference are both always present/anchored (never
scroll away to reach Reference — the prior toggle-based hide was the
bug); Overview expanded by default, Reference collapsed by default,
directly below it; the two are MUTUALLY EXCLUSIVE (single-open); whichever
is expanded gets its own CONTAINED scroll (scoped to that section only),
not a scroll of the whole card. (3) The nodes 14->13 merge is also a
content-structure change and applies to both platforms, not just desktop.
(4) Mid-session: the founder had to step away before running the nodes
SQL migration; instructed to wire the existing `north_node` column as a
TEMPORARY stand-in for the merged Nodes section rather than block on the
migration, and still make the 14->13 structural change now — swap to the
real `nodes` column once the founder runs `scripts/add_nodes_column.sql`
(drafted this session, copied from `scripts/lock_readings_and_transit_pieces.sql`'s
`get_reading_by_slug` pattern with a `nodes` column added; not executed).

**Changes:**
- `app/reading/[slug]/natal/page.tsx`: the 14-entry planet list became a
  13-entry `PLACEMENTS` list (North Node + South Node merged into one
  `Nodes` entry, background `/nodes-background.png`, contentKey
  TEMPORARILY `north_node` — flagged inline). Section-index constants
  recomputed for 13 placements (Reference moved from index 18 to 17).
  `PlanetCard` split into `PlacementCardContent` (header + accordion +
  footer, no outer wrapper) and a thin `PlacementCard` (adds the mobile
  `.card-outer`/`.card-inner` wrapper) so the identical inner markup can be
  reused by both the mobile section and the new desktop pane — the layout
  doc explicitly carries the `.card-inner` inset numbers verbatim into
  `.reading-zone-card`, confirming this reuse is correct rather than
  coincidental. Added a `DesktopNatal` component (rendered only at
  `>=1024px`, detected via `matchMedia` in a `useEffect` to avoid a
  hydration mismatch) that wires `<ReadingLayout>` + `<Rail>`: an
  `IntersectionObserver` over 13 stacked `.reading-pane-section` divs
  drives `activeIndex`, which drives both the rail's active red bar and
  the reading-zone's own per-placement backdrop (`zoneBackground`); rail
  row clicks call `scrollIntoView` on the matching section. The intro
  copy's "fourteen placements" line was corrected to "thirteen" (mobile
  Intro screen, still shown there).
- `app/components/Rail.tsx`: added an optional `onRowClick(id)` prop —
  Phase 2 shipped row markup only ("row-click scroll-snap behavior is
  Phase 3," per that entry above); this wires it. Backward compatible —
  Reference's existing demo usage passes nothing and is unaffected.
- `app/components/ChartSection.tsx`: the mobile Chart-state "List" toggle
  had its own separate 14-row planet order; merged North/South Node into
  one row (key `mean_north_lunar_node`, label "Nodes") to stay consistent
  with the page-level merge — flagged inline as the same one-line
  simplification as the meta line below (shows the North Node's own
  sign/house/degree, not a true combined-axis line).
- `app/globals.css`: `.card-content` changed from a single scrolling
  region to a flex column (`overflow: hidden`); `.section-body` now
  `flex: 1 1 0; min-height: 0; overflow-y: auto` so whichever accordion
  body is open claims the remaining card height and scrolls internally,
  while the row after it stays anchored rather than scrolling away
  (verified: expanding Reference on both a mobile and a desktop card
  correctly keeps Overview's row pinned above and Reference's own content
  scrolling in place). Added a new desktop-only block (`.reading-pane-scroll`,
  `.reading-pane-section`) for the inner snap-scroll viewport living inside
  the shared `.reading-zone-card` — additive only, nothing existing
  changed for mobile.
- `scripts/add_nodes_column.sql` (new, NOT run): `ALTER TABLE readings ADD
  COLUMN nodes text` + `CREATE OR REPLACE FUNCTION get_reading_by_slug`
  with `nodes` added to its return columns, copied from `scripts/
  lock_readings_and_transit_pieces.sql`. Old `north_node`/`south_node`
  columns are left in place (dropping them is a separate, unauthorized
  decision) — the function now returns both old columns and the new one.

**Judgment calls flagged, not silently resolved (need founder review):**
(1) The merged Nodes section's meta line, rail row, and the mobile Chart
List row all show the North Node's own sign/house/degree as a stand-in for
a true combined-axis display (e.g. "Aries / Libra") — SPEC §4.1 treats the
axis as one subject, but building the real combined display is separate
UI work not attempted here. (2) The reading-zone-card's footer identity
band (customer name, red top border) is rendered on every desktop
placement card per the layout doc's "carry verbatim" rule for `.card-inner`
internals, even though the mock's Venus crop doesn't show one — flagged in
case the mock's omission was deliberate rather than a crop limit. (3) The
rail's "CHART >" control is shown (per the doc's "always show the full
set") but not wired to a working chart view on desktop — the chart wheel
itself is separate, not-yet-built work (recorded above as "Phase 3, not
built"), so this pass only re-houses the reading/list pane. (4) Copy
change: "Your {Planet}" section label renamed to "Overview" to match
`natal-page.png` literally — trivial and matches the mock exactly, but per
the copy-approval rule this is flagged rather than assumed final.

**Verification:** `tsc --noEmit` and `npm run build` both clean. Local dev
server + Playwright screenshots (chromium, not committed, scratchpad only)
against `DOGFOOD_READING_SLUG`, desktop at 1512×982 and mobile at
390×844:

| Element | Mock/doc | Rendered | Match |
|---|---|---|---|
| Full-page backdrop (dark, natal) | dark background | `/sky-background.png` | Yes |
| Rail title "Planets" (Anton, cream, centered) | centered | centered | Yes |
| Rail controls "READ >" / "CHART >" | shown, active red | shown, active red | Yes (fixed mid-verification — first pass used "Read"/"Chart" without the mock's literal caps+arrow) |
| Rail rows: 13, 2-line format, active red bar | 13 placements | 13 rows, Sun...Nodes, active bar tracks scroll | Yes |
| Rail click -> pane scroll-snap (two-way sync) | doc-specified | verified: clicking Moon and Nodes rows both scrolled the pane and moved the active bar | Yes |
| Reading-zone card inset (6.5%/8%, carried from `.card-inner`) | doc-specified | matches | Yes |
| Card title (Anton) + meta subheader | "Venus" / "20 libra 10th House Retrograde" | e.g. "Sun" / "Libra · 10th House · 25°" | Structurally yes; separator punctuation is the pre-existing app format, not altered |
| Overview expanded / Reference collapsed by default | shown | matches | Yes |
| Reference contained scroll on expand, Overview stays anchored above | founder instruction (not in static mock) | verified via screenshot on both a mobile and desktop card | Yes |
| Nodes section: 13 not 14, merged content + combined reference | SPEC §4.1 | verified both platforms: single "Nodes" row/section, Reference accordion shows both North Node and South Node reference blocks stacked | Yes |
| Desktop opens directly on rail + first placement, no intro screens | founder ruling this session | verified: first paint is the Sun card, no Cover/Birth Data/Intro | Yes |

**Mobile-untouched verification:** confirmed via screenshot the mobile
Cover/intro flow renders exactly as before (name splash, "LOOK CLOSELY"
tagline, constellation belt); confirmed a placement card (Venus) and the
merged Nodes card both render in the existing single-column style with
the existing per-planet background bleed in the margins; confirmed the
Chart section's "List" toggle shows exactly 13 rows including one merged
"Nodes" row; confirmed total section count in the DOM is 18 (3 intro
screens + Chart + 13 placements + Reference), matching the recomputed
index math; zero browser console errors during the mobile pass. The only
mobile-visible changes are the two founder-approved content-structure
fixes (13 sections instead of 14; the accordion contained-scroll fix) —
no mobile layout, sizing, or navigation code was touched.

One commit, not pushed, per the task's no-push instruction. Hard stop for
founder review, per the task's instruction — including founder sign-off
on the SQL migration (not run this session) and the flagged judgment
calls above.

**August 4, 2026 (Phase 3A follow-up — nodes column wired for real):** the
founder ran `scripts/add_nodes_column.sql`; first attempt failed with
Postgres 42P13 (`CREATE OR REPLACE FUNCTION` can't add a column to a
`RETURNS TABLE` function's shape), fixed by adding an explicit `DROP
FUNCTION IF EXISTS get_reading_by_slug(text)` before recreating it —
table/data untouched, function definition only. Second attempt
succeeded. Before touching any app code, verified live via a read-only
anon-key RPC call (`get_reading_by_slug` against the dogfood slug) that
the function now actually returns a `nodes` key — confirmed present,
value `null` — rather than trusting the founder's report of success
alone. Swapped `app/reading/[slug]/natal/page.tsx`'s Nodes placement
`contentKey` from the temporary `north_node` to the real `nodes` column
and updated the `Reading` interface accordingly; the separate, still-
open "meta line shows only the North Node's own sign/house/degree, not
a true combined-axis line" simplification is unrelated to this swap and
was left flagged as-is. Verified by screenshot: the Nodes card now
renders the "This interpretation is being prepared" placeholder (since
`nodes` is genuinely empty) instead of the old dogfood `north_node`
prose. `tsc --noEmit` and `npm run build` both clean. One commit, not
pushed.

**August 5, 2026 (Phase 3A follow-up — desktop natal visual/interaction
tweaks from live founder feedback):** Avery ran the desktop shell locally
and sent back a punch list after seeing it rendered for real; all
changes below are desktop-only (>=1024px) and scoped so nothing shared
with mobile changed — verified by screenshot that a mobile placement
card is pixel-identical to before.

- **Reading-zone card widened:** `.reading-zone-card`'s left/right inset
  reduced from the doc's original 8% to **4%** each side — this is
  shared chrome (also used by Reference/Settings/Transits), so the
  widening applies everywhere that box appears, not just natal.
- **Placement title shrunk (desktop only):** new selector
  `.reading-pane-section .planet-name { font-size: clamp(22px, 3vw,
  30px) }` overrides the shared `.planet-name` rule (`clamp(36px, 10vw,
  52px)`, unchanged) only inside the desktop reading pane — mobile's
  title size is untouched.
- **Rail box: guaranteed no-scroll, all 13 rows visible, bottom flush
  with the reading card.** Root cause of the founder's cutoff: `.rail-
  row`'s fixed `5.3dvh` height was eyeballed against one viewport height
  and fell back to an internal scroll on shorter screens. Fix: a new
  opt-in "fill" mode on `Rail` (`fillHeight` prop, natal only) —
  `.rail-rect--fill`/`.rail-list--fill`/`.rail-row--fill` make the box
  and its rows `flex: 1`, dividing the exact space available (header to
  the existing 6.5% bottom spacer) evenly across however many rows exist,
  so all 13 always fit with zero scroll on any screen height. Because the
  rail column and reading zone share the same 6.5dvh top/bottom
  placement, the unchanged 6.5% bottom spacer now lines up pixel-for-
  pixel with the reading card's own bottom inset (verified: both measured
  671.6px on a 760px-tall test viewport). Deliberately opt-in rather than
  the new default — Reference (3 demo rows) and future Transits (11 rows)
  are tuned so a shorter list produces a shorter box, by design (Phase 2
  history above); stretching those to fill would be an unreviewed change
  to screens not part of this feedback pass.
- **Rail header spacing:** `.rail-header` top padding trimmed (2% -> 0.5%)
  to reclaim vertical space for the now-taller fill-mode box, per the
  founder's own suggestion; a new `margin-bottom: 14px` adds breathing
  room between the READ/CHART controls and the cream box below.
- **Rail controls redesigned:** no more red on the active state — 
  `.rail-control.active` now bold + larger + full-opacity cream
  (`rgba(253,245,237,1)`), inactive dimmed to `rgba(253,245,237,0.45)`,
  reusing the same active/inactive convention already used for mobile nav
  links elsewhere in the app rather than inventing a new color rule. The
  `>` chevron is gone (labels are now plain "READ"/"CHART"); a hairline
  `border-left` divider sits between the two; `.rail-controls` changed
  from `justify-content: space-between` (spread edge-to-edge) to
  `flex-end` (clustered together, right-aligned to the rail's edge).
- **Nested scroll -> resistance -> advance to next placement:** root
  cause was `overscroll-behavior: contain` on `.card-content`/
  `.section-body`, which blocks scroll-chaining outright. Added a
  desktop-scoped override (`.reading-pane-section .card-content,
  .reading-pane-section .section-body { overscroll-behavior: auto }`) —
  mobile keeps `contain`, untouched. Verified via direct scrollTop
  inspection (not just visual screenshots): a wheel gesture scrolls the
  open accordion body to its max first; the next gesture or two land at
  that boundary with no movement (the "little resistance"); the
  following gesture then advances `.reading-pane-scroll` (already
  `scroll-snap-type: y mandatory`) to the next section — confirmed this
  is native browser scroll-chaining, no custom JS involved.
- **Scroll disambiguation wired (the layout doc's own rule, written but
  never wired for natal):** a `wheel` listener in `DesktopNatal`
  (window-level, mounted once) checks whether `event.target` is inside
  `.reading-zone-card`; if so it does nothing (native scroll/chaining
  above handles it); otherwise it advances/retreats one placement per
  gesture (by `deltaY` sign) with a ~700ms cooldown so one gesture can't
  fire multiple jumps. Verified this fires correctly both over the rail
  and over the page background.
- **Debugging note worth recording:** mid-verification, wheel-based
  navigation intermittently failed to fire in fresh Playwright test runs
  even after code was correct — traced to the exact stale-Turbopack-cache
  issue this project's history already flagged once before (Phase 2
  correction #2 entry above, "the running dev server had not picked up
  two of the six edits"). A full `rm -rf .next` + dev-server restart
  resolved it each time. A separate, unrelated false negative also
  appeared from a Playwright test script that opened two pages in one
  browser instance — isolating each interaction test to its own
  single-page script showed the app was working correctly the whole time.
  Recorded here so a future session doesn't waste time re-diagnosing the
  same two false leads.

Files touched: `app/globals.css`, `app/components/Rail.tsx`,
`app/reading/[slug]/natal/page.tsx`. `tsc --noEmit` and `npm run build`
both clean. One commit, not pushed.

**August 5, 2026 (Phase 3A follow-up, round 2 — rail bottom, background
flash architecture fix, scroll-momentum bug):** four more issues from
Avery running the shell live. Desktop-only; mobile re-verified
untouched (screenshot).

- **Rail bottom now reaches toward the true zone edge, not the cream
  card's inset bottom.** Avery clarified "the planet outline" means the
  OUTER background/zone bound (the same bottom `.reading-rail-slot`/
  `.reading-zone` already share), not `.reading-zone-card`'s own smaller
  6.5%-inset bottom, which is what the rail was aligned to before.
  `.rail-bottom-spacer` reduced from `flex: 0 0 6.5%` to `2%`; verified
  the rail box's bottom moved from 867.8px (matching the card) to
  902.7px (much closer to the true outer edge at 918.2px), with the
  remaining ~2% read as intentional breathing room, not a cutoff.
  `.rail-list` vertical padding increased (4px -> 14px) so the first/last
  rows don't start flush against the box edges ("abrupt start").
- **Background flash fixed by architecture change, not a CSS tweak.**
  Root cause: `DesktopNatal` was swapping a single static
  `zoneBackground` image via React state (`activeIndex`) every time the
  active section changed — an instant, un-animatable cut by
  construction. Avery's own diagnosis was correct and pointed at an
  already-working pattern in this codebase: mobile's natal page already
  bakes each placement's background into that placement's own scrolling
  `.reading-section` (`.section-bg`), so the background moves with its
  card as one unit, with no swap logic at all. Ported that model to
  desktop instead of inventing a new mechanism:
  - `ReadingLayout` gained an opt-in `bareZone?: boolean` prop (default
    false, zero effect on Reference/Settings/Transits, which don't pass
    it). When true, it skips its own `zoneBackground`/`.reading-zone-card`
    wrapper and renders `children` directly filling `.reading-zone`.
  - `DesktopNatal` now passes `bareZone` and builds each
    `.reading-pane-section` as its own composite: a full-bleed
    `.section-bg` (reused from mobile, unmodified) behind a
    `.reading-zone-card` (reused, now per-section instead of static
    chrome) holding that placement's card content. The `zoneBackground`/
    `activeIndex`-driven background prop is gone entirely.
  - `.reading-pane-section` reworked from a flex column to
    `position: relative` (children are now absolutely positioned:
    background layer + inset card layer, matching mobile's
    `.reading-section`/`.section-bg`/`.card-inner` shape exactly).
  - **Regression caught and fixed before shipping:** reusing
    `.reading-zone-card` as a per-section flex-column host broke on
    first render — it never had `display: flex; flex-direction: column`
    (previously it only ever wrapped one opaque `{children}` blob, never
    needed to arrange header/content/footer itself), so the middle
    `.card-content` couldn't claim remaining height via `flex: 1` and
    the Overview text was silently clipped to one line. Caught by
    screenshot before considering this done, not shipped broken. Fixed
    by adding `display: flex; flex-direction: column` to
    `.reading-zone-card` itself — safe for Reference's/Settings' current
    single-child usage (a lone flex item in a column still just stacks
    normally). Re-verified: full Overview paragraph renders again on
    both natal and (unaffected) Reference.
  - Verified via DOM inspection (not just visual screenshots) that
    `.reading-zone-bg` (the old shared swap layer) no longer exists in
    the page and that separate sections carry distinct baked-in
    `background-image` URLs.
- **Outside-card wheel scroll "double scrolling" fixed.** Root cause: the
  round-1 handler fired on the first wheel event then blocked for a flat
  700ms — trackpad momentum scrolling routinely keeps emitting wheel
  events well past 700ms, so the lock expired mid-gesture and a second
  jump fired from the same physical scroll ("goes down 2," per founder
  report). Replaced with an accumulated-delta threshold (60px) before
  the first jump commits (the requested "little more substantial"
  resistance) plus a rolling 180ms "quiet period" lock that re-arms on
  every wheel event, locked or not, so it only releases after genuine
  silence rather than a fixed duration — correct regardless of how long
  a momentum tail runs. Verified with a simulated 16-event, ~1-second
  accelerate/decelerate gesture (mimicking real trackpad momentum, not
  just Playwright's single-event `mouse.wheel()`): advanced exactly one
  section, not two.

Files touched: `app/components/ReadingLayout.tsx`, `app/globals.css`,
`app/reading/[slug]/natal/page.tsx`. `tsc --noEmit` and `npm run build`
both clean. One commit, not pushed.

**August 5, 2026 (Phase 3A follow-up, round 3 — intermittent scroll fix,
rail title, background confirmation):**

- **Diagnosed and fixed the intermittent "sometimes the outside-card
  scroll just doesn't work" report.** Root cause: the wheel handler
  computed its navigation target from `activeIndexRef.current`, which
  only updates when the `IntersectionObserver` actually fires — and that
  only happens once scroll has settled past the 50% threshold.
  `scrollIntoView({behavior:'smooth'})` animations routinely take longer
  than the round-2 fix's 180ms quiet-period unlock, so a second
  deliberate gesture could legally fire while the observer was still
  catching up from the first jump: `next` would then compute from the
  STALE pre-jump index, landing back on the section already being
  animated to — a silent no-op from the user's perspective, and only
  reproducible when gestures land in that specific timing window
  (matching the "mostly works" report exactly). Fixed by reading the
  live `scrollTop` directly off the DOM at the moment of the wheel event
  instead of any cached/derived React state, so the target is always
  correct regardless of whether an animation or the observer's catch-up
  is still in flight. Verified by specifically reproducing the failure
  pattern: 5 deliberate gestures fired 200ms apart (faster than a typical
  smooth-scroll settle, the exact condition that used to fail) each
  advanced exactly one section with no repeats or skips
  (Sun->Moon->Mercury->Venus->Mars->Jupiter).
- **Rail title enlarged and left-aligned** (`clamp(14px,1.4vw,19px)` ->
  `clamp(20px,2vw,26px)`, `text-align: center` -> `left`), with a new
  cream `.rail-title-rule` divider spanning the rail's width underneath
  it. `.rail-header`'s `margin-bottom` trimmed (14px -> 2px) so the
  larger title + new rule are absorbed from existing whitespace rather
  than pushing `.rail-rect`'s top down — per founder instruction ("the
  space should be eaten up vertically... shouldn't crowd anything
  below").
- **Confirmed the natal full-page background is the real
  `/sky-background.png` image, not a CSS color wash** — checked both the
  file itself (a genuine soft radial-glow gradient, just low-contrast,
  which is presumably why it read as a flat wash at a glance) and the
  CSS (`.reading-stage-bg` uses `background-image: url(...)`, no
  competing `background-color`/`linear-gradient` anywhere). No code
  change needed.

Files touched: `app/components/Rail.tsx`, `app/globals.css`,
`app/reading/[slug]/natal/page.tsx`. `tsc --noEmit` and `npm run build`
both clean. One commit, not pushed.

**August 5, 2026 (Phase 3A follow-up, round 4 — scroll redesigned again
after a regression, spacing corrected the intended way):**

- **Round 3's scroll fix was itself broken — diagnosed and replaced.**
  Founder report: scrolling down worked intermittently, scrolling up
  didn't work at all. Root cause: round 3 read `container.scrollTop`
  live and used `Math.round(scrollTop / sectionHeight)` to infer the
  current section. This is fragile precisely because it's inferring
  position from a value that's still animating — scroll-snap plus a JS
  `scrollIntoView` don't settle at a perfectly predictable pixel offset
  or moment, so mid-flight reads can round to the wrong section, and
  round 3's testing happened to mostly exercise the forward direction.
  Replaced the whole approach: rather than inferring "where are we" from
  any observed scroll signal (timer-based or position-based), the
  natal page now tracks a single authoritative `targetIndexRef` that
  only ever moves by exactly +/-1 per committed gesture, updated
  synchronously the instant a jump is triggered (not when it visually
  finishes). New jumps are blocked by a `navigatingRef` that's cleared
  by the existing `IntersectionObserver` actually confirming arrival at
  the target section (with a 700ms timeout fallback in case the
  observer doesn't fire, e.g. the target was already partially visible).
  This ties the block duration to the real animation instead of a
  guessed constant, and never depends on reading intermediate scroll
  position at all. Verified with the specific pattern that broke before:
  4 rapid down-gestures then 4 rapid up-gestures, 250ms apart (faster
  than a comfortable pause) — landed exactly on
  Moon->Mercury->Venus->Mars->Venus->Mercury->Moon->Sun, symmetric in
  both directions, no stalls or skips.
- **Rail spacing: founder correction on where the extra title height
  should come from.** Round 3 took it from the margin BELOW the header
  (squeezing the READ/CHART-to-rail-box gap to nothing); the founder
  wanted it taken from ABOVE the title instead, with the below-title
  breathing room restored — "it should slip above the height of the
  reading card if necessary." Fixed: `.rail-header`'s top padding
  removed (0.5% -> 0) so the larger title uses the (ample) headroom
  above it — the rail column starts well above where the reading card's
  own 6.5%-inset top begins, so there's real room to give up here — and
  `margin-bottom` restored past its original value (2px -> 16px).
  Combined with pushing `.rail-bottom-spacer` down further (2% -> 0.3%,
  per the founder's own suggested mechanism — "move the cream rectangle
  down" — increasing the gap before `.rail-rect` while shrinking the one
  after it shifts the whole box down as a unit, satisfying both asks
  from one change), the rail box's bottom now sits 2.3px from the true
  outer edge (down from round 2/3's ~15.5px "hovering" gap) while the
  gap above it measures 16px (up from round 3's near-zero squeeze).

Files touched: `app/globals.css`, `app/reading/[slug]/natal/page.tsx`.
`tsc --noEmit` and `npm run build` both clean. One commit, not pushed.

**August 5, 2026 (Phase 3A follow-up, round 5 — second scroll regression
fixed with a more rigorous test; rail controls recentered):**

- **Round 4's scroll fix had its own bug: momentum tails could still
  slip in extra jumps.** Founder report this time: scrolling down went
  3 sections per swipe; up worked fine. Root cause: round 4 unlocked new
  navigation as soon as the `IntersectionObserver` confirmed the jump's
  animation had visually finished. But a single physical trackpad swipe
  routinely keeps emitting wheel events (decaying in size) for a second
  or more — well past when one jump's ~300ms animation completes — so
  the SAME swipe could cross the threshold again once unlocked, and
  again. Round 4's own verification used evenly-spaced discrete
  synthetic gestures, which never exercises this — it doesn't reproduce
  a real decaying momentum tail. Fixed by adding a second, independent
  gate: a `blockedUntil` timestamp that every wheel event (whether it's
  a trigger or one arriving while already blocked) pushes
  POST_JUMP_QUIET_MS (320ms) further into the future — so as long as a
  momentum tail keeps producing events, the block keeps re-arming and
  only opens once there's genuine silence, regardless of whether the
  animation itself already finished. Round 4's `targetIndexRef`
  direction-accuracy fix is unchanged (that part was correct — it's the
  unlock timing that was too eager). **Verification changed to match the
  failure mode this time:** rather than only re-testing evenly-spaced
  discrete gestures (which round 4 already passed and STILL shipped
  broken), added a realistic simulation — an initial burst plus a
  decaying-magnitude tail of ~40 events over ~1.8s, mimicking actual
  trackpad momentum — for both directions. One realistic down-swipe now
  lands on exactly Moon (not Mercury/Venus); one up-swipe returns to
  exactly Sun. Round 4's original discrete-gesture test was also re-run
  to confirm the new, stricter gate doesn't make deliberate rapid
  section-hopping feel sluggish (400ms-apart gestures still each
  register distinctly).
- **Rail controls recentered.** Founder feedback: after round 4 restored
  the breathing room below the header, the READ/CHART controls still sat
  hugging the rule right under the title, leaving all the new whitespace
  unused below them — "aligning them more to the top... or centering"
  read as awkward either way without redistributing the space itself.
  Wrapped the controls in a new fixed-height `.rail-controls-slot`
  (`display:flex; align-items:center`) sized to match the old rule-gap +
  controls-row + header-margin total, so `.rail-rect`'s top position is
  unaffected (measured 225.4px vs round 4's 224.4px — effectively
  unchanged) while the controls now sit vertically centered within the
  gap (measured 8.0px of space above and below, i.e. truly centered, not
  pinned to either edge). Font size also nudged up slightly per the
  founder's "barely increasing" note (inactive
  `clamp(10px,0.85vw,12px)` -> `clamp(11px,0.9vw,13px)`, active
  `clamp(11px,0.95vw,13px)` -> `clamp(12px,1vw,14px)`).

Files touched: `app/components/Rail.tsx`, `app/globals.css`,
`app/reading/[slug]/natal/page.tsx`. `tsc --noEmit` and `npm run build`
both clean. One commit, not pushed.

**August 5, 2026 (Phase 3A follow-up, round 6 — scroll inconsistency
traced to a specific hover region, structural fix):**

- **Founder pinpointed the trigger precisely this time:** scrolling
  worked for a while, then became inconsistent specifically once the
  cursor had hovered over "the planet outline" — the visible background
  margin around the cream card — as opposed to the rail or anywhere else
  on the page. That specificity matters: unlike the rail or the dark
  page background (neither of which is inside any natively-scrollable
  element), the background margin (`.section-bg`) is a sibling of
  `.reading-zone-card` *inside* `.reading-pane-scroll` — the same
  element that provides the inside-card native scroll-chaining from
  round 2. Likely mechanism: once a wheel gesture begins over any
  descendant of a natively-scrollable element, some browsers can hand
  the gesture's momentum continuation to their own native scroll/
  compositor path instead of continuing to dispatch cancelable `wheel`
  events to JS for the rest of it — so `e.preventDefault()` on the
  opening event(s) doesn't reliably cover a whole real-world swipe that
  started there, while it does over non-scrollable regions where no
  native target exists to hand off to. This is consistent with the
  reported pattern (worked initially, then intermittent) and with why
  every round-2-through-5 fix, which only ever changed timing/state
  logic, couldn't resolve it — the browser was bypassing the JS
  entirely for part of the gesture, not misinterpreting it.
- **Fix: remove the background margin from hit-testing altogether**,
  rather than trying to out-time or out-guess the browser's native
  capture. `.reading-pane-scroll` gained `pointer-events: none`;
  `.reading-zone-card` gained an explicit `pointer-events: auto` to
  restore normal interaction for the card and everything inside it
  (inheritance is per-subtree, so this only re-enables the card, not the
  background). With this, a wheel gesture starting over the background
  margin now hit-tests to `.reading-zone` (confirmed via
  `document.elementFromPoint`) — a plain, non-scrollable div with no
  scrollable ancestor for the browser to ever hand off to — so the
  window-level JS listener is structurally the ONLY thing that can ever
  handle those events, eliminating the failure mode by construction
  rather than by timing. Verified: `elementFromPoint` at a background-
  margin coordinate resolves outside `.reading-pane-scroll`; at the
  card's center it still resolves inside `.reading-zone-card`; three
  consecutive realistic momentum swipes (the same decaying-tail
  simulation from round 5) fired with the cursor specifically over the
  background margin each produced exactly one section change, in both
  directions; and the card's own accordion click-to-expand still works
  (pointer-events restored correctly).

Files touched: `app/globals.css`. `tsc --noEmit` and `npm run build`
both clean. One commit, not pushed.

**August 5, 2026 (Phase 3A follow-up, round 7 — architecture rebuilt per
founder direction: layered frame + native full-page scroll):**

Founder feedback after round 6: still badly broken ("took like 2
scrolls for it to stop working... mostly just not working"), and a
concrete architectural suggestion — stop trying to make a small,
JS-mediated scroll region coexist with hijacked "outside card" wheel
logic; instead treat the page like a static frame (nav + rail) with a
"reading pane hole," and ONE real full-page native scroll underneath —
the same model mobile's natal page already uses successfully. Correct
diagnosis: rounds 2-6 all narrowed a failure window (timing, direction
accuracy, momentum tails, hit-testing) without removing the underlying
conflict — custom JS trying to detect and override what would otherwise
be native browser scroll handling. This round removes the conflict
instead of refereeing it.

**Rebuilt:**
- `DesktopNatal` no longer uses `<ReadingLayout>` (its rail-slot/zone-
  column contract doesn't fit this model) — it builds its own
  `.app-shell`/`.app-stage` directly, reusing `NavBar` and `Rail`
  unchanged. `ReadingLayout`'s `bareZone` prop (added round 2 for the
  now-abandoned approach) was reverted — dead code, no other caller.
- `.natal-scroll`: ONE native `scroll-snap-type: y mandatory` container
  spanning the ENTIRE `.app-stage` (not just the zone column). Each
  `.natal-section` (`height:100%`) contains a `.natal-zone` wrapper that
  reproduces the OLD static `.reading-zone`'s exact geometry (top/bottom
  6.5dvh, left 29.84%/width 62.16%) — so `.section-bg` and
  `.reading-zone-card` inside it are completely unchanged, just
  repeated per-section instead of rendered once as static chrome.
- `.reading-rail-slot` (unchanged CSS) renders AFTER `.natal-scroll` in
  DOM order, so it naturally stacks on top with no z-index needed — a
  true overlay frame with a hole where the native scroll shows through.
- Scrolling over the card OR the background margin now needs ZERO JS —
  both are inside `.natal-scroll`, 100% native, nothing left to race
  against. The only remaining custom JS is a rail-forwarding handler
  (the rail is a genuinely separate, non-scrolling overlay with nothing
  native to scroll on its own).

**A real bug in the first draft of that rail forwarding, caught before
shipping:** initially just piped raw `e.deltaY` into
`container.scrollBy()` per event — wrong, since a real multi-event
gesture's forwarded total has nothing capping it against one section's
height (confirmed: one test gesture forwarded straight through to the
last section). Fixed by not forwarding raw pixels at all — accumulate +
require a threshold (resistance) then move exactly one section via
`scrollToIndex` (native scroll-snap handles the actual motion), reusing
round 5's proven "quiet period that re-arms on every event" lock so a
gesture can't trigger more than one jump. Verified: 6 consecutive
realistic swipes over the rail advanced exactly Moon->Mercury->Venus->
Mars->Jupiter->Saturn, no overshoot, no skips; rail click-to-jump and
the inside-card accordion click both still work correctly.

**Testing-methodology finding, worth recording for future sessions:**
while verifying native scroll over the background margin, repeated
bursts of many small synthetic wheel events (mimicking real trackpad
momentum) appeared to fail entirely — scrollTop stayed at 0 across
several such bursts, even ones summing well past the scroll-snap
midpoint. Isolating the variables: a SINGLE sufficiently large wheel
event (crossing the ~50% snap threshold) reliably worked, repeatably
(three separate single-events in a row each correctly advanced one
section: 0->903->1807->2710); direct programmatic `scrollBy` respected
the snap correctly; and — critically — the same "many small events in
a tight burst" pattern accumulated perfectly normally on a REGULAR
(non-snap) scrollable element (the reading text itself, verified: a
15-event/600px burst landed exactly at that element's true max
scrollTop). The failure is therefore specific to `scroll-snap-type:
mandatory` containers receiving synthetic (Playwright-dispatched)
wheel events in rapid succession — Chromium headless does not appear to
recognize a train of individually-dispatched synthetic wheel events as
one continuous user gesture for snap purposes the way it does for
genuine OS-level trackpad input, so each small event gets evaluated
against the snap point independently and reverts. This is a known-shape
limitation of automated wheel testing against scroll-snap, not
something the app can fix — and not evidence of a bug, given every
other angle (single large native events, programmatic scroll, and the
non-snap reading-text scroll) all behaved correctly and repeatably.
Recorded so a future session doesn't misread the same test artifact as
a regression. Given this, real-device verification by the founder is
the authoritative check for the specific case of continuous momentum
scrolling directly over the background margin; rail-forwarding (which
does not depend on this native gesture-recognition behavior, since it's
plain JS accumulation) was fully verified by automation.

Files touched: `app/components/ReadingLayout.tsx`, `app/globals.css`,
`app/reading/[slug]/natal/page.tsx`. `tsc --noEmit` and `npm run build`
both clean. One commit, not pushed.

**August 5, 2026 (Phase 3A follow-up, round 7 — founder confirmation):**
founder tested the round 7 rebuild directly and confirmed it's working,
including the one case automation couldn't fully close the loop on
(continuous scrolling over the background margin). Desktop natal
scroll behavior considered resolved as of this commit.
