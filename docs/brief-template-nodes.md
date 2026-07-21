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

COPRESENT_SKY: Neptune (2029-07-04 – 2029-11-30), Saturn (2030-03-01 – 2031-01-20)
  # (Only SLOW transiting bodies sharing EITHER axis sign during the passage,
  #  dated span each — a "planet on the nodes" condition. Same slow-only rule
  #  as the planet variant. "none" if empty. No COPRESENT_NATAL line exists in
  #  this variant.)

TIMELINE:

  # --- Axis conjunction (one-event merge: conj one end = opp the other) ---
  - ID: nodes-conjunct-node-north-axis-2029-11-08-p1of1
    TYPE: NATAL_CONTACT
    ASPECT: transiting North Node conjunct natal North Node = opposite natal South Node (one event)
    DATES: orb opens 2029-09-14, exact 2029-11-08, separates 2029-12-30
    STATUS: perfects this phase
    # (Only conjunctions-to-either-end and squares-to-the-axis are computed for
    #  the axis. A conjunction to one end is phrased as the merged one-event
    #  statement. No WINDOW/PASS lines — the single non-stationing passage makes
    #  every axis contact a single pass.)

  # --- Square to the axis (a natal planet at the bend) ---
  - ID: nodes-square-node-axis-mars-2030-05-19-p1of1
    TYPE: NATAL_CONTACT
    ASPECT: Natal Mars squares the nodal axis
    DATES: orb opens 2030-03-25, exact 2030-05-19, separates 2030-07-12
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
