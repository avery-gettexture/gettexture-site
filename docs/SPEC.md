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
- Natal prompts (current revisions): `SYNTHESIS_CALL_1_v11.md`, `SYNTHESIS_CALL_2_v1.md` (formerly Call 3 — see §10.1)
- Transit prompts (current revisions): `TRANSIT_C_CALL_1_v2.md`, `TRANSIT_CALL_2_v1.md`
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

- **Length:** the 200–350 word target governs the **synthesis prose block only**; timeline entries scale with the sky (§10.2). Slow planets sit at the top of the prose range, inner planets at the bottom.
- **Piece shape:** synthesis prose + timeline entries (the two-register output — §10.2). This supersedes the earlier uniform-prose skeleton.
- **Itinerary-anchored, not degree-anchored:** the piece references dated events, never "current position," so it stays accurate for its whole lifespan.
- **Regeneration triggers (the ONLY triggers):** sign ingress (incl. retrograde re-ingress), station retrograde, station direct. Every trigger = FULL rewrite. Nodes piece regenerates only on nodal sign change (~18 months).
- **Eclipses:** NO eclipse-triggered generation. The Nodes piece bakes in the full eclipse itinerary for its lifespan at write time (dates, degrees, houses, configurations, any natal contacts within orb). Eclipse-day touch = notification + link into the eclipse's timeline entry by ID.

### 3.2 The temporal model (governs all transit content)
- A piece covers one **motion phase** — the stretch between the significant change that opened it and the next one coming (ingress→station, station→station, station→egress).
- **Vantage rule:** the piece knows and states the full passage as fact; it interprets the current phase only. Past and future crossings are referenced as astronomical events, never as experiences. The phase names its own dated boundaries — what opened it, what closes it.
- **Editions stand alone.** A subscriber may arrive mid-passage; every edition is a complete account of where the passage stands now, legible with nothing read before it.
- **The sign passage is the story; motion is the lens.** Tradition-grounded hierarchy: retrogradation is a condition of movement, not a headline event. The pop inversion (Mercury retrograde as subject, the sign as footnote) is a quality failure.
- **Out-of-phase contacts:** undated pass summaries only (the `PASSAGE_CONTACTS` field). No out-of-phase dates ever appear in content.
- **Long passages:** the phase's boundaries are the only dated events named. The larger passage's shape is characterized, never enumerated (this is what keeps a Pluto piece from becoming a date ledger).
- **The next territory is out of scope.** A piece never names, assumes, or gestures at which sign or house the planet enters next. Nothing about the next territory is in the input, so it does not exist for that piece. (This covers nodal backward motion without a special case.)

### 3.3 The contact model
Two relationship categories:
- **Copresence** — a standing, sign-level relationship, on both the natal side (natal points sharing the transited sign) and the sky side (other transiting planets sharing it). It exists **whether or not any aspect perfects**, and is interpreted regardless — including when the phase's motion means a co-present point's degree is never crossed.
- **Contacts** — dated aspect events.

Three contact-event types:
- **NATAL_CONTACT** — the planet in focus aspects one natal point.
- **SKY_CONTACT** — the planet in focus aspects another transiting planet. (Moon and ordinary lunations excluded; eclipses are homed in the Nodes piece.)
- **CONFIGURATION** — a sky aspect that also catches a natal point both transiting bodies contact in overlapping windows. **The engine merges these into one entry** with each component's dates as fields. The model never splits a configuration back into contacts and never merges what the input did not merge. Composite weight is greater than either component alone.

Event standard:
- A contact appears on the timeline whenever its **orb window intersects the phase**, dated by what actually happens in-phase (orb open, exact, separate — whichever fall inside).
- A contact that applies without perfecting in-phase is one entry, interpreted as an **approach**: "no exact this phase," dated at orb entry, completion acknowledged by pass reference without out-of-phase dates.
- One contact event is always one entry. Entering orb and perfecting are dates of the same event, never separate entries.

### 3.4 Aspect policy — transits
- All **14 natal points receive** transits: Sun–Pluto, ASC, MC, North Node, South Node. (The natal *reading* consolidates the nodes into one piece; the nodes remain two receiving points for transit math, delivered as axis-shaped contacts — §4.1.)
- Orbs: **~3° active / 1° exact**, tighter for fast movers (exact values: execution tuning).
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
- Natal reading: `/reading/[slug]` — permanent, shareable, unchanged.
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
- **Transit aspects and orbs:** ~3° active / 1° exact, tighter for fast movers; applying weighted over separating; sign-consonant only; all 14 natal points receive.
- **Decans:** Chaldean order. **Degree flags:** 29° anaretic, 0° ingress; no other per-degree meaning.
- **Sect:** day/night, with the traditional team and benefic/malefic weighting.
- **Node convention:** mean vs. true — OPEN (§12.6); whichever stands is disclosed here.
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
- `readings` table: birth data, chart_data jsonb, 14 interpretation columns, slug, stripe_session_id. (Interpretation columns become 13 with the nodes consolidation — migration note, §9.)
- `transit_calendar` table (app-era, Supabase): rows = (planet, sign, transit_type [DIRECT_INGRESS | RETROGRADE_INGRESS | RE_INGRESS_DIRECT], ingress_date, egress_date, entering_degree, station_retrograde_{sign,degree,date}, station_direct_{sign,degree,date}, cacheable). **RETIRED** → renamed `transit_calendar_archive`, superseded by the rebuilt `transit_calendar` and new `aspect_calendar` (§11A). ~~Adaptation needed: stations are fields on ingress rows, not first-class events — normalize into an event stream (ingress/station events with dates) for triggers and calendar.~~ Obsolete — resolved as a full rebuild, not an adaptation.
- `sky_positions` table (NEW — created in Supabase; see §11.1).
- App-era transit prompts (`transit-prompts.json`): transit_a (collective — **archived, ignore**), transit_c (chart-grounded — the base of the current revision), transit_c_sunmoon (**superseded, retired**: the Sun gets full standing treatment, the Moon went ambient).
- App UI patterns: transits list screen, detail screen — translate to web, don't reinvent.
- Stripe (checkout mode today), Resend, Vercel, astrology-proxy for natal charts.

---

## 9. NEW BUILD — THE GAPS

1. **Aspect itinerary engine (largest genuinely new piece).** Per-chart computation of transit-to-natal contacts across all 14 receiving points — sign-consonant pre-filter, windows (3° applying → exact → separating), exactness dates, pass n-of-m across retrograde loops, plus sky-sky aspects, natal intersections, and configuration merging (§3.3). Deterministic math with ground truth: validate against a professional ephemeris before any generation depends on it. Feeds: timelines in standing pieces, Transit Calendar, notification triggers, Nodes eclipse itinerary.
2. **Eclipse dataset.** Precomputable years ahead: dates, kind, degree/sign, plus per-eclipse configuration (transiting planets aspecting the eclipse degree) and natal points caught. Feeds the Nodes piece + notifications.
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
- Documents: `SYNTHESIS_CALL_1_v11.md`, `SYNTHESIS_CALL_2_v1.md` (renamed from `SYNTHESIS_CALL_3_v3.md`), `TRANSIT_C_CALL_1_v2.md`, `TRANSIT_CALL_2_v1.md`.
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
- **Two registers:** synthesis prose (the phase read whole) + entries (one dated event each, read closely). Same voice, different altitude.
- **Source discipline:** prose ← [TERRITORY] + [QUALITY] + [THROUGHLINE] + [INTEGRATION]; each entry ← its own [TIMELINE] entry and nothing else. The prose never re-reports timeline events — they reach it only through [THROUGHLINE]'s synthesis, named generally. The prose is not a second timeline.
- **Delimiters:** opening tags only; each entry ends where the next tag begins (fewer failure modes than paired tags). Prose block = everything between `[START]` and the first `[ENTRY:]`, or `[END]` when the phase has no entries. A quiet phase is prose-only and complete.
- **Entry IDs** originate at the engine, ride through the Call 1 brief, and are echoed verbatim by Call 2 — never composed. The UI renders engine data joined by ID (always correct by construction); a programmatic gate verifies prose-stated dates against the engine record for that ID.
- **Anchor sentence:** each entry's first sentence states the event as fact (aspect, dates, pass position); interpretation begins in sentence two. Two example constructions (active-through / approaching-separating), plain sentences, pass phrasing "the first of three passes while [planet] is transiting [sign]." Interrupted windows: "no exact this phase."
- **Length:** synthesis prose 200–350 words (floor 170, ceiling 400 — hard stop, cut for compliance). Entries scale with the sky; minimum three sentences each.
- **Timeline ≠ brevity.** The timeline is a structure for completeness and chronology, never a license for thin treatment. Honest weight is expressed as length and register together.

### 10.3 The transit brief (Call 1) — five sections
`[TERRITORY]` 4–5 observations (orientation facts: phase + dated boundaries, house, natal copresences + event inventory, transiting copresences, sign contribution) · `[QUALITY]` 4–5 (the standing condition; each co-present natal and transiting point its own treatment; retrograde motion colors the whole section) · `[TIMELINE]` one entry per contact event, date order, 3–5 observations each, **minimum 3** ("no event is too light for three true things") · `[THROUGHLINE]` 3–4 (what the phase's activity amounts to; "disparate is a finding" — never manufacture a theme) · `[INTEGRATION]` 3–4 (what becomes available).
- Priority order governs all sections except [TIMELINE], which runs in date order with weight inside entries.
- Sections exist so Call 2's movements have research to draw from: three movements (Arrival ← [TERRITORY], Development ← [QUALITY] + [THROUGHLINE], Close ← [INTEGRATION]), with entries ← [TIMELINE]. Every brief section has exactly one home in the output.
- **The arrival is factual.** Interpretation begins in Movement 2; no compressed reading of the planet or sign in the opening, no aphorism, no planet-as-agent framing (the planet wanting, asking, teaching, demanding).

### 10.4 Named transits — DECIDED
When the itinerary contains a contact carrying a traditional name, the content names it plainly: a planet conjunct its own natal position is a return (Saturn return, solar return, Jupiter return); the transiting axis aligning with the natal nodes is a nodal return. For a solar return, acknowledge that it falls near the birthday without claiming the dates align exactly. **The name comes from the contact in the input — never from cycle arithmetic** — and a named transit follows every register rule an unnamed one does (no drama, no urgency).

### 10.5 Prompt work status and backlog
**Done (draft, pending founder's batch read):** transit Call 1 fully revised (product orientation, role/scope, component scope, TEMPORAL STRUCTURE replacing the transit-type matrix, personalization principle, five-section format + content requirements, transit register, transit-specific hard bans, quality checks, user message format, Nodes axis handling); transit Call 2 fully built (governing philosophy, role/scope, system parameters, opening lines, brief-is-research, safety, final check, content-type specific with the two-register contract, Nodes rendering); natal Call 1 v11 and natal Call 2 (nodes axis, angles, decans, degree flags, sect, copresence guarantee, widened orbs, orb-weight law, residue cleanups).

**Backlog — approved, to execute:**
1. Remove Temperature from all four headers (no temp param on Opus).
2. Canonical section order, all four documents: Header + OUTPUT RULE → PRODUCT ORIENTATION / GOVERNING PHILOSOPHY → the universal core as one contiguous block → ROLE AND SCOPE (opens the content-specific half) → WHAT THIS COMPONENT COVERS / CONTENT-TYPE SPECIFIC (the intention, before the craft it introduces) → craft sections → NODES / ANGLES handling → content-specific register and bans → QUALITY CHECKS / FINAL CHECK → **USER MESSAGE FORMAT last** (adjacent to the arriving input). Renumber sequentially; convert all cross-references to section **names**. Call 2's User Message Format subsection extracts to the standalone final section.
3. Next-destination rule (§3.2 last bullet) — TEMPORAL STRUCTURE + Invented Astronomy ban + Call 2 close rule + check lines.
4. Named-transits rule (§10.4) — transit register.
5. 29° urgency clarification (§4.4) — both natal documents' degree-flag parameter.
6. Section 10 (TEMPORAL REGISTER) formatting: the "Transiting planets belong to the collective sky…" paragraph has no bold header in the pristine source — add one for parity with the surrounding paragraphs.
7. Luminary-orb line in both natal documents: the extension applies to the 8° aspects only; the sextile stays 6°.

**Not yet drafted:** Moon blocks (12+12).

**Founder reading notes on the natal pair (captured, unapplied):** see items 1, 5, 6, 7 above — these came from the natal read. Additional natal notes may follow the batch read.

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
- **Transit side:** sign-consonant pre-filter (in Whole Sign, sign-to-sign relationships are fixed, so a planet's candidate receiving points are known before any degree math); contact windows (3° applying → exact → separating) via threshold crossings + interpolation; pass n-of-m (free — `ORDER BY date` on the crossings); natal copresence (points where sign = transited sign); sky copresence with spans; sky-sky aspects (chart-independent, computed once, shared by all subscribers); natal intersections; **configuration merge** (a sky aspect absorbs a natal contact when the natal point appears in its intersection set AND the windows overlap in time — never merge across non-overlapping windows; never merge two independent natal contacts that merely coincide, which is [THROUGHLINE]'s job, not the timeline's); stable **entry IDs**; the `PASSAGE_CONTACTS` undated summaries; eclipse dataset (base data loaded — §11A.5; per-eclipse configurations and natal points caught remain downstream per-user work); phase detection (ingress/station boundaries) and the regeneration schedule.
- **Natal side (new):** decan index + Chaldean ruler (`floor(sign_degree / 10)` + lookup); degree flags (29°, 0°); sect (Sun altitude at birth → day/night); MC whole-sign house; axis-merged nodal aspects (including inside other placements' ASPECTS lists); widened sign-consonant orbs per §4.7.
- **Shared:** the sky event stream (normalized ingresses, stations, eclipses) feeding triggers, calendar, notifications, and Today's Texture.

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
cross-checked against a pre-code census of the raw data).

- Event types (and ID slugs, identically worded — DECIDED, no
  abbreviations): ingress, retro-ingress, station-retrograde,
  station-direct. No Moon rows (ambient layer reads sky_positions
  directly). ID format: {body}-{event}-{sign}-{date}, e.g.
  saturn-ingress-aries-2026-02-14.
- NODES: one row per axis change (one trigger = one content block);
  body = "Nodes"; row carries north_sign and south_sign (ID:
  nodes-ingress-{north_sign}-{south_sign}-{date}). No node station
  rows ever (mean node). Houses are per-chart facts and are JOINED AT
  GENERATION TIME, never stored in this global table.
- Self-contained rows (DECIDED): each row carries phase_end_date (this
  body's next trigger of any kind — defines the motion phase the row
  begins) and sign_egress_date (when the body finally leaves the
  sign). Both NULL when the answer falls outside the data range
  (documented in-schema; trailing NULLs self-heal on range extension;
  leading-edge gaps are permanent and harmless).
- Station rows carry the station's sign and degree. Ingress rows store
  no degree (direct ingress enters at 0°, retro-ingress at ~29°59' —
  fixed by the boundary, redundant to store).
- Defensive constraints: body never Moon; Nodes rows are ingress-only.

### 11A.3 `aspect_calendar` (rebuilt July 17–18, 2026)

All dated sky-sky events, derived purely from sky_positions. 4,585
aspect rows across 4,507 distinct windows, plus 104 eclipse rows.

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
  the window's full sequence), each body's motion state on the exact
  date, and exact_degree (shared degree-within-sign — identical for
  both bodies by construction for the five majors). A window entered
  without perfecting = one row, exact_date NULL ("no exact" — valid,
  factual; ID suffix -noexact).
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

---

## 12. OPEN — FOUNDER RULINGS NEEDED (do not assume)

1. **Notification bundle** — tier line (which events email vs. calendar-only); guaranteed monthly email on batch publish or not; subscriber volume preference or not; pointers vs. content in email bodies. *Scheduling: closes before stage G, ideally after the founder has seen real calendar output.*
2. **Discount invitation mechanics** (Door B → subscribe). *Scheduling: closes at stage E planning, with Stripe's coupon/promotion options in view.*
3. **Final prices** — LAST, after cost structure and offer are fully settled.
4. **Refusals-in-methodology paragraph** — yes/no at page-writing time.
5. **Transit surface URL form** — `/reading/[slug]/transits` vs. a tab. *Ruled before any UI build; discussion scheduled.*
6. ~~Mean vs. true node~~ — **CLOSED: mean** (details in §11A.1). Still open: the Nodes background-asset decision (two node images → one).
7. **Shared-core maintenance** — build-time assembly of the universal block vs. discipline across four documents.

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
