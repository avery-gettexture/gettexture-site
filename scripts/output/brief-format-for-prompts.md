# Call 1 user-message format — combined reference for prompt editing

This file bundles the two authoritative format templates that define
EXACTLY what the assembler (`scripts/engine/assemble-brief.mjs`) sends as
the Call 1 user message, for every field name, entry type, and ordering
rule. It is generated for handoff to a separate chat where the Call 1/2
prompts are being edited, so the prompt-writer can see the full contract
without needing this repository open.

Two things to know before reading either template below:

1. **Values are illustrative; structure is binding.** Every date, sign,
   degree, and body name in these templates is a fictional example chosen
   to demonstrate the format. The field names, entry types, ordering,
   nesting, and boundary-phrasing rules are exactly what the assembler
   produces — do not treat any example VALUE as a real astrological fact,
   but do treat every field name and structural rule as load-bearing.
2. **Parenthetical annotations are commentary, not output.** Every `(...)`
   note explains the reasoning behind a field or rule. These annotations
   are never emitted in a real assembled brief — a real brief contains only
   the field lines themselves (plus `#`-prefixed section comments in these
   template files, which are likewise never emitted).

There are two variants, chosen by which body the brief is about:

- **Planet variant** (`brief-template-planet.md`) — used for Sun, Mercury,
  Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.
- **Nodes variant** (`brief-template-nodes.md`) — used for the lunar nodes
  axis (North Node / South Node together), which is structurally distinct
  from a single-body transit: it has no retrograde motion or stations, one
  steady phase per passage, owns the full eclipse itinerary, and has no
  COPRESENT_NATAL field.

Both templates are reproduced below in full, verbatim, exactly as they
stand in this repository as of this handoff.

---

## PLANET VARIANT

```
# BRIEF TEMPLATE — PLANET VARIANT (authoritative format contract)
# Fake/illustrative data. Every field name, ID format, entry type, fact-block
# structure, boundary phrasing, and section order below is EXACTLY as the
# assembler must emit. The assembler conforms to THIS FILE; this file is not
# generated from the assembler. Values illustrative; structure binding.
# Annotations in (parentheses) explain intent and are NOT emitted.

PLANET: Saturn
SIGN: Taurus
HOUSE: 5th House
RISING_SIGN_KNOWN: true
# (HOUSE omitted entirely when RISING_SIGN_KNOWN: false — see note at end.)

PASSAGE:
  INGRESS: 2027-04-12
  EGRESS: 2029-06-30
  SHAPE:
    - ingress direct 2027-04-12, closed by station retrograde at 9.2° on 2027-09-05
    - station retrograde 2027-09-05, closed by egress to Aries on 2027-11-14
    - retro-ingress to Aries [out of sign] 2027-11-14, closed by station direct at 27.8° Aries on 2028-01-20
    - station direct in Aries [out of sign] 2028-01-20, closed by re-ingress to Taurus on 2028-02-10
    - re-ingress direct 2028-02-10, closed by station retrograde at 12.4° on 2028-08-15
    - station retrograde 2028-08-15, closed by station direct at 6.1° on 2028-12-28
    - station direct 2028-12-28, closed by egress to Gemini on 2029-06-30
  # (SHAPE walks every motion segment of the WHOLE passage in order — including
  #  the out-of-sign dip, so the re-ingress has a visible cause. Segments while
  #  the body is OUT of the piece's sign are tagged [out of sign]: they are
  #  context (why the passage dipped and returned), not events the piece
  #  interprets. Each line: "[event] [motion] {date}[ tag], closed by [next
  #  event] ({date})". Segment events: ingress | re-ingress | retro-ingress |
  #  station retrograde | station direct | egress; stations carry degree. A
  #  clean passage collapses to one line: "ingress direct {date}, closed by
  #  egress to {sign} on {date}".)

PHASE:
  MOTION: FORWARD
  OPENED_BY: re-ingress on 2028-02-10
  CLOSES: station retrograde at 12.4° on 2028-08-15
  # (OPENED_BY: which trigger opened THIS phase — ingress | re-ingress |
  #  station retrograde | station direct, " on {date}". CLOSES: next trigger;
  #  stations carry degree; an egress reads "egress to Gemini on {date}".
  #  MOTION: FORWARD | RETROGRADE.)

COPRESENT_NATAL: Venus 18.2° (5th House), Mars 24.9° (5th House)
  # (Natal points in the transited sign — ALL natal points, any speed.
  #  "none" if empty.)
COPRESENT_SKY: Neptune (all phase), Uranus (2028-02-10 – 2028-05-03), South Node (all phase)
  # (Only SLOW transiting bodies — Jupiter, Saturn, Uranus, Neptune, Pluto,
  #  and the transiting Nodes — sharing the sign during the phase, dated span
  #  each; "(all phase)" if present throughout. Fast bodies excluded to keep
  #  the field sharp. For the Nodes, the END sharing the sign is named (e.g.
  #  "South Node") — the other end is necessarily opposite. "none" if empty.)

TIMELINE:

  # --- NATAL_CONTACT, normal perfecting, with activations (both legs) ---
  # (Timeline natal-contact IDs are HOST-aspect-natal: the piece's one fixed
  #  host planet first, then the natal target. This differs from activation IDs
  #  below, which embed a sky-sky aspect id in faster-slower order — intentional,
  #  do not "normalize" the two to match.)
  - ID: saturn-trine-natal-venus-2028-03-22-p2of3
    TYPE: NATAL_CONTACT
    ASPECT: trine natal Venus (18.2° Capricorn, 1st House)
    DATES: orb opens 2028-03-01, exact 2028-03-22, separates 2028-04-14
    WINDOW: 1 of 2 this passage
    PASS: 2 of 3 this passage
    STATUS: perfects this phase
    ACTIVATIONS:
      # (An activation = another body B that reached the 1° band with the
      #  piece's planet WHILE this host contact was in orb, AND itself contacts
      #  the same natal point. BOTH legs shown (SKY_ASPECT + NATAL_ASPECT).
      #  Anchor DATE = closest-approach day within the host window. ID:
      #  {full-sky-aspect-id}-activates-natal-{point}; the sky-aspect-id carries
      #  both bodies faster-first with its own date and pass.)
      - ID: sun-conjunction-saturn-2028-03-20-p1of1-activates-natal-venus
        BODY: Sun
        SKY_ASPECT: Sun conjunction the piece's planet, within 1° on 2028-03-20; perfects 2028-03-20 (Sun direct, Saturn direct)
        NATAL_ASPECT: Sun trine natal Venus, exact 2028-03-21 (Sun direct)
        DATE: 2028-03-20
      # (Out-of-host activation, AFTER separation — perfection follows host close.)
      - ID: mars-square-saturn-2028-04-20-p1of1-activates-natal-venus
        BODY: Mars
        SKY_ASPECT: Mars square the piece's planet, within 1° on 2028-04-13; perfects 2028-04-20, after this contact separates (Mars direct, Saturn direct)
        NATAL_ASPECT: Mars square natal Venus, no exact (Mars direct)
        DATE: 2028-04-13
      # (Out-of-host activation, BEFORE the host begins — perfection precedes open.)
      - ID: mercury-conjunction-saturn-2028-02-25-p1of1-activates-natal-venus
        BODY: Mercury
        SKY_ASPECT: Mercury conjunction the piece's planet, within 1° on 2028-02-28; perfects 2028-02-25, before this contact begins (Mercury direct, Saturn direct)
        NATAL_ASPECT: Mercury trine natal Venus, exact 2028-02-26 (Mercury direct)
        DATE: 2028-02-28

  # --- NATAL_CONTACT, in orb at phase open (since-date precedes the phase) ---
  - ID: saturn-sextile-natal-moon-2028-02-18-p1of1
    TYPE: NATAL_CONTACT
    ASPECT: sextile natal Moon (3.1° Cancer, 7th House)
    DATES: in orb at phase open (since 2028-01-05), exact 2028-02-18, separates 2028-03-09
    WINDOW: 1 of 1 this passage
    PASS: 1 of 1 this passage
    STATUS: perfects this phase

  # --- NATAL_CONTACT, no exact this phase, remains in orb at close ---
  - ID: saturn-conjunction-natal-saturn-2028-08-01-noexact
    TYPE: NATAL_CONTACT
    ASPECT: conjunction natal Saturn (12.4° Taurus, 5th House)
    DATES: orb opens 2028-08-01, no exact this phase -- phase closes mid-window, remains in orb at phase close
    WINDOW: 1 of 2 this passage
    PASS: (none this window)
    STATUS: no exact this phase -- perfects on a later pass
    # (In orb but no perfection in-phase: PASS shows "(none this window)";
    #  ID carries "-noexact" suffix, no pXofY.)

  # --- SKY_CONTACT, slow pair (both Jupiter or slower) — always its own entry,
  #     shown here carrying an ACTIVATION (a third body touching both members) ---
  - ID: saturn-conjunction-neptune-2028-05-11-p1of1
    TYPE: SKY_CONTACT
    ASPECT: conjunct transiting Neptune
    DATES: orb opens 2028-04-19, exact 2028-05-11, separates 2028-06-02
    WINDOW: 1 of 1 this passage
    PASS: 1 of 1 this passage
    STATUS: perfects this phase
    ACTIVATIONS:
      # (A sky-pair activation = a third body B that reached the 1° band with
      #  the PIECE'S PLANET while this pair's aspect was in orb, AND itself
      #  aspects the pair's OTHER member. Same two-leg structure as
      #  natal-contact activations, with the second leg swapped: PAIR_ASPECT
      #  (B to the pair's other member) instead of NATAL_ASPECT.
      #  ID anchors on B's aspect to the PIECE'S PLANET, then names the host
      #  pair's sky-contact id: {B-to-piece's-planet sky id}-activates-{host
      #  pair sky id}. B's aspect to the other member lives in PAIR_ASPECT
      #  only, never in the ID.)
      - ID: jupiter-sextile-saturn-2028-05-09-p1of1-activates-saturn-conjunction-neptune-2028-05-11-p1of1
        BODY: Jupiter
        SKY_ASPECT: Jupiter sextile the piece's planet, within 1° on 2028-05-08; perfects 2028-05-09 (Jupiter direct, Saturn direct)
        PAIR_ASPECT: Jupiter sextile Neptune, exact 2028-05-12 (Jupiter direct, Neptune retrograde)
        DATE: 2028-05-08
      # (Out-of-host direction phrasing applies here identically: "perfects
      #  {date}, before this pair's aspect begins" / "...after this pair's
      #  aspect separates" when B's perfection falls outside the host window.)
    # (Slow-pair sky aspects are headline mundane events; always entries. They
    #  may also carry ACTIVATIONS when a third body contacts both members —
    #  same fact structure as natal-contact activations.)

  # (RULING — WINDOW and PASS are ALWAYS shown on every SKY_CONTACT entry,
  #  including "1 of 1" — never conditionally displayed, symmetric with
  #  NATAL_CONTACT: absence must never require interpretation. Scoped to
  #  this aspect's own "aspect passage" — a run of consecutive orb-
  #  engagement windows between the same two bodies, unbroken by a sign
  #  change in EITHER body — distinct from a transit_calendar PASSAGE.
  #  WINDOW counts every such span (exact or not); PASS counts only the
  #  ones that reached exact, "(none this window)" when this row's own
  #  window never did, same phrasing as NATAL_CONTACT.)

  # (RULING — a SKY_CONTACT's ID is PROVENANCE, not a phase claim: it always
  #  carries the underlying aspect's own passage-scoped exact date and pass
  #  [e.g. "-2028-11-29-p2of5"], which may fall OUTSIDE the phase this entry
  #  is rendered in — the entry is included because its WINDOW overlaps the
  #  phase, per the phase-membership rule, even when its exact perfection
  #  doesn't. When that happens, DATES states only what happens WITHIN this
  #  phase [never adds the out-of-phase exact date] and STATUS reads "no
  #  exact this phase" — explicit decision, keeping already date-heavy
  #  briefs from repeating a date that belongs to a different phase's
  #  story. The exact date is not lost: it lives in the ID and, if the pair
  #  is a slow one, in that other phase's own SKY_CONTACT entry.)

  # --- SKY_CONTACT, atmospheric (fast-involving, no natal point touched) ---
  - ID: saturn-square-mars-2028-06-18-p1of1
    TYPE: SKY_CONTACT
    ASPECT: square transiting Mars
    DATES: orb opens 2028-06-16, exact 2028-06-18, separates 2028-06-20
    WINDOW: 1 of 1 this passage
    PASS: 1 of 1 this passage
    STATUS: perfects this phase
    TETHER: atmospheric -- no natal point caught
    # (Atmospheric = collective weather touching nothing in the chart. Marked
    #  TETHER: atmospheric. Carried at honest atmospheric weight in prose.)

  # --- SKY_CONTACT, in orb during the phase but its own perfection falls
  #     outside it (STATUS: no exact this phase) ---
  - ID: mercury-square-saturn-2028-05-30-p1of1
    TYPE: SKY_CONTACT
    ASPECT: square transiting Mercury
    DATES: orb opens 2028-05-28, no exact this phase -- phase closes mid-window, remains in orb at phase close
    WINDOW: 1 of 1 this passage
    PASS: 1 of 1 this passage
    STATUS: no exact this phase
    TETHER: atmospheric -- no natal point caught
    # (This aspect's own exact date (2028-05-30) falls after this phase
    #  closes -- DATES states only what happens within the phase (see the
    #  ID-is-provenance RULING above), and STATUS names the plain fact:
    #  no exact THIS phase. PASS still reports the real pass this window
    #  belongs to (1 of 1) — a row can have its own exact date and still
    #  read "no exact this phase" if that date isn't in THIS phase.)

  # --- Eclipse-to-transit activation (eclipse within 3° of the piece's planet) ---
  - ID: solar-eclipse-2028-07-22-activates-transiting-saturn
    TYPE: ECLIPSE_ACTIVATION
    ECLIPSE: Solar Eclipse, 2028-07-22, 14.9° Taurus, 5th House
    DATES: eclipse falls within 3° of the piece's planet on 2028-07-22
    NATAL_CAUGHT: none
    # (Non-Nodes pieces receive an eclipse only when it lands within 3° of
    #  their planet on eclipse day. The Nodes piece owns the FULL eclipse
    #  itinerary; this is only the piece-planet-adjacent case.)

[counts] entries: 7 (4 NATAL_CONTACT, 3 SKY_CONTACT); activation facts: 4; eclipse-to-transit facts: 1

# NOTE — RISING_SIGN_KNOWN: false variant: HOUSE header line omitted; all
# "(Nth House)" suffixes omitted from natal points and contacts; natal Moon
# contacts excluded entirely (unreliable degree without birth time);
# everything else identical.
```

---

## NODES VARIANT

```
# BRIEF TEMPLATE — NODES VARIANT (authoritative format contract)
# Fake/illustrative data. Structure binding, values illustrative. Annotations
# in (parentheses) NOT emitted. The Nodes variant is structurally distinct:
# axis instead of a single body; single steady phase (no stations, no motion);
# owns the full eclipse itinerary; "retrograde" never appears in nodes content;
# no COPRESENT_NATAL (axis-to-natal relationship is carried by timeline
# contacts); no PASSAGE_CONTACTS.

PLANET: Nodes
AXIS: North Node Aries — South Node Libra
HOUSES: North Node 4th House, South Node 10th House
RISING_SIGN_KNOWN: true
# (AXIS always stated North Node first, then South Node, for consistent
#  orientation.)

PASSAGE:
  INGRESS: 2029-07-04
  EGRESS: 2031-01-20
  SHAPE:
    - ingress 2029-07-04, closed by egress to North Node Pisces / South Node Virgo on 2031-01-20
  # (The axis moves steadily backward and does not station, so SHAPE is always
  #  a single ingress-to-egress segment. Egress names the incoming axis
  #  North-first. No retrograde/station lines ever.)

PHASE:
  INGRESS: 2029-07-04
  EGRESS: 2031-01-20
  # (No MOTION, no OPENED_BY/CLOSES triggers — phase == passage.)

COPRESENT_SKY: Neptune in Aries, North Node end, 4th House (2029-07-04 – 2029-11-30); Saturn in Libra, South Node end, 10th House (2030-03-01 – 2031-01-20)
  # (Only SLOW transiting bodies sharing EITHER axis sign during the passage
  #  — a "planet on the nodes" condition, same slow-only rule as the planet
  #  variant. Grouped by body: sign, which end, and house stated once per
  #  body — house is derivable from the end label plus the HOUSES header,
  #  stated anyway per the always-show principle used throughout this brief
  #  — then every dated span for that body, comma-separated, inside one set
  #  of parens; "(all phase)" replaces a span that covers the entire phase,
  #  same convention as the planet variant. Multiple bodies are joined with
  #  "; " (commas now live inside each body's own entry). A slow body can
  #  only ever be copresent with ONE end of the axis during a single nodal
  #  passage — reaching the other end would mean crossing six signs in ~18
  #  months, impossible at Jupiter's speed or slower — so multiple spans for
  #  one body just mean it dipped in and out of the same sign; they never
  #  split across ends. "none" if empty. No COPRESENT_NATAL line exists in
  #  this variant.)

TIMELINE:

  # --- Axis conjunction (one-event merge: conj one end = opp the other) ---
  - ID: nodes-conjunct-node-north-axis-2029-11-08-p1of1
    TYPE: NATAL_CONTACT
    ASPECT: transiting North Node conjunct natal North Node = opposite natal South Node (one event)
    DATES: orb opens 2029-09-14, exact 2029-11-08, separates 2029-12-30
    WINDOW: 1 of 1 this passage
    PASS: 1 of 1 this passage
    STATUS: perfects this phase
    # (Only conjunctions-to-either-end and squares-to-the-axis are computed for
    #  the axis. A conjunction to one end is phrased as the merged one-event
    #  statement. WINDOW/PASS are always shown, same as everywhere else — always
    #  "1 of 1" here, since the axis never stations and crosses each degree
    #  once. Uninformative but consistent: there are no exceptions to
    #  always-show anywhere in either variant.)

  # --- Square to the axis (a natal planet at the bend) ---
  - ID: nodes-square-node-axis-mars-2030-05-19-p1of1
    TYPE: NATAL_CONTACT
    ASPECT: Natal Mars squares the nodal axis
    DATES: orb opens 2030-03-25, exact 2030-05-19, separates 2030-07-12
    WINDOW: 1 of 1 this passage
    PASS: 1 of 1 this passage
    STATUS: perfects this phase

  # --- Eclipse entries (the Nodes piece owns the FULL itinerary) ---
  - TYPE: ECLIPSE
    ID: solar-eclipse-2029-07-11
    KIND: solar
    DATE: 2029-07-11
    POINT: 19.6° Cancer, 7th House
    CONFIGURATION: conjunct Mercury
    NATAL_CAUGHT: none
    # (KIND: solar = New Moon (Sun–Moon conjunction); lunar = Full Moon
    #  (opposition). CONFIGURATION: any sky aspect to the eclipse degree, or
    #  "none". NATAL_CAUGHT: natal points within 3° of the eclipse axis, at
    #  EITHER end — see phrasing in the next entry — or "none".)
  - TYPE: ECLIPSE
    ID: lunar-eclipse-2029-12-20
    KIND: lunar
    DATE: 2029-12-20
    POINT: 28.9° Gemini, 6th House
    CONFIGURATION: none
    NATAL_CAUGHT: Ascendant (0.4° Gemini, 6th House) conjunct the eclipse degree; Descendant point — none opposite
    # (NATAL_CAUGHT names HOW each point is caught: "conjunct the eclipse degree"
    #  (within 3° of the eclipse point itself) or "opposite the eclipse degree"
    #  (within 3° of the far end of the lunation axis). Both are significant and
    #  both are reported. If nothing is caught at an end, that end is omitted;
    #  if nothing at all, the field is "none". Example above shows a conjunction
    #  catch with nothing opposite.)

# (No PASSAGE_CONTACTS field in either variant — passage-scoped totals live in
#  each timeline entry's own PASS/WINDOW fields. Documented here so the removal
#  is intentional, not accidental.)

[counts] entries: 4 (2 NATAL_CONTACT, 0 SKY_CONTACT, 2 ECLIPSE); activation facts: 0; eclipse-to-transit facts: 0
```
