# Texture — Layout Proportions Spec

Reference spec for building the Texture web screens in Claude Code. These
proportions are ratified — do not relitigate them at build time; implement to
these numbers. All values are viewport-relative so they hold across screen
sizes until the mobile breakpoint.

Screens covered so far:
1. HOME (two-block desktop / single-column mobile)
2. READING PAGE (natal + transits) — desktop two-column, mobile single-column
3. CHART VIEW (natal + transits) — the wheel state of the reading page
4. LIST / RAIL (natal + transits) — the placements/sky list

Not yet covered (separate, later): Chart 101 / Transits 101 content, the
coming-soon marketing page, upsell/locked-state visuals, and the mobile menu's
own visual design (its behavior is specced below; its styling is not).

---

## UNIVERSAL NAVIGATION & INTERACTION MODEL (read this first)

Every content screen follows ONE pattern. Build the template once; each screen
fills its slots.

### The model: URL = a scroll document, rail = its table of contents, reading pane = the viewport

- Each top-level URL — `/natal` (My Chart), `/transits`, `/reference`,
  `/settings` — loads ALL of its content into ONE long scroll document inside
  the reading pane.
- The **rail is a table of contents**. Clicking a rail item **scroll-snaps the
  pane to that section** — it does NOT navigate. The user can also just keep
  scrolling the pane (Sun → Moon → Mercury …) and move through sections
  manually.
- This is the existing reading page's mechanic (`scroll-snap-type: y mandatory`,
  `scroll-snap-align: start`, `scroll-snap-stop: always` per section) with a
  rail driving it. Not new tech.
- **The top nav bar is the ONLY thing that changes the URL** (Home / My Chart /
  Transits / Reference / Settings).

### Rail ↔ scroll two-way sync + active state

- **Two-way sync:** clicking a rail item snaps the pane to that section AND
  scrolling the pane updates which rail item is marked active. The rail always
  reflects the section currently in view.
- **Active rail item:** a **vertical red bar** to the LEFT of the active item
  (red = `rgba(185,18,18,·)`). Carried from app.
- **Active view toggle** (the List / Chart / Calendar cluster above the rail):
  the active one is **red, slightly bolder / larger**; inactive ones use normal
  Geist Mono nav treatment. Same "active = emphasized" logic as the top nav bar,
  expressed in red for this cluster.

### Chart / List / Calendar are STATES of one screen (not separate screens)

"Two sides of the same coin." The toggle changes the pane's state; nothing
navigates.
- **My Chart:** List ↔ Chart. Persistent bottom identity zone = **name / birth
  data** in BOTH states (tappable: expands to birth data, collapses to
  centered name).
- **Transits:** List ↔ Chart ↔ Calendar. Persistent bottom zone = **date** in
  all states. **Chart** state additionally shows the **Today / Transiting**
  wheel toggle.
- The bottom identity zone is a CONSTANT footer for that URL — it does not come
  and go between states.

### Chart / Calendar as overlays (pane-state), with ONE navigation exception

- Chart view and Calendar view are STATE CHANGES of the reading pane, not
  navigations.
- **The one exception:** **Chart 101 / Transits 101** links DO navigate — they
  route to `/reference` with "How to read a chart" open. This is the only
  cross-URL jump inside the reading experience.

### The scroll disambiguation rule (nested scroll)

Some sections have their own inner contained scroll (e.g. Reference "Houses" =
12 collapsed rows inside one pane section). Rule for which scroll responds:
- **Mouse cursor over the cream pane → scroll the pane's inner content.**
- **Cursor anywhere else on the page → snap to the next/prev section.**
This cleanly separates inner scroll from section-snap. Implement exactly this.

### REFERENCE structure

- Each **main rail item = one reading-pane section** (one snap target):
  Planets, Signs, Houses, How to read a chart.
- **Sub-items = collapsed line-items WITHIN that section.** e.g. "Houses" is one
  pane view holding all 12 houses as collapsed rows; tapping a row expands it.
  If the collapsed rows exceed the pane height, they get a **contained scroll
  between the two red bars** (inside the reading rectangle).
- **"How to read a chart" is the exception:** NOT collapsed sections — it's a
  **visual vs. description toggle** (two states/pages, not an expand list).
  Details TBD.

### SETTINGS structure

- Same two-column template and same rail (Anton title, cream rectangle behind
  the list). Rail items load their content into the pane in place (same model).
- The Settings reading zone: the cream rectangle **flexes to fill more of the
  zone** — same internal proportions as any reading rectangle (title the same
  relative distance from the rectangle's top, footer rule the same relative
  distance from its bottom). Internals are RELATIVE TO THE RECTANGLE'S SIZE, so
  when it grows, the contents scale with it — the title is not pinned to a fixed
  offset. (No special-case internals; just a larger rectangle.)
- Settings content: methodology disclosures, the AI-and-astrology section,
  manage-subscription link, data-deletion request, etc.

### MOBILE equivalent (rail-less)

- No side rail. Each URL is ONE long scroll (as the site works now on mobile).
- The **menu** does the rail's cross-section job: open menu → jump to My Chart
  list, Transits list, Reference, Settings, etc. Each is its own scroll page.
  (Menu visual design TBD — behavior only here.)
- **My Chart mobile:** the **List page is the landing**. List / Chart toggle at
  top (active = red) switches views (as the app does). The list navigates within
  the scroll, or the user keeps scrolling.
- **Transits mobile:** List / Chart / Calendar toggle at top; date persistent at
  bottom; Chart adds Today / Transiting.
- Same **name/birthdata behavior everywhere**: tappable name expands to birth
  data, collapses to centered name.
- **Mobile Settings is the lone simplification:** ONE page with expandable
  sections — it does NOT use the table-of-contents architecture the other
  screens use.

---

## SCREEN LIST (all share the universal model above)

Global note on the reading surface: NATAL and TRANSITS share the SAME layout
and proportions. They differ only in backdrop and a few labels:
- NATAL: dark background; reading rectangle / list on dark; chart wheel sits on
  a RADIAL-GRADIENT circle over the dark background.
- TRANSITS: teal/sky background with a cream rectangle (like the home right
  panel); chart wheel sits on the DARK GRADIENT (no radial-gradient circle);
  transits adds a Calendar control and a timeline section, and the chart view
  adds a Today/Transiting wheel toggle + a date.

---

## GLOBAL RULES (both desktop and mobile)

- **No page scroll.** The page always fits the viewport exactly. Only
  designated inner regions scroll (contained scroll). Nothing causes the whole
  page to scroll.
- **Build on `dvh`, not `vh`.** All full-height math uses `100dvh` (dynamic
  viewport height) so the no-scroll page fills the screen correctly under
  mobile browser chrome. Do not use `vh` for the page height.
- **Safe-area handling (device notch / home indicator).**
  - Set the viewport meta tag to include `viewport-fit=cover`. Without it the
    browser will not expose the device inset values.
  - Use the CSS environment variables `env(safe-area-inset-top)` and
    `env(safe-area-inset-bottom)` (and left/right where relevant) for the
    physical device insets. These are the web equivalent of the app's native
    safe-area insets (the app used a bottom inset of 34pt on modern iPhones
    plus dynamic top inset; on web these come from `env()` per device).
  - Background layers bleed to the physical screen edges (full bleed under the
    notch and under the home indicator). Only *content* is inset off the safe
    areas — see the per-platform frame rules below.

---

## DESKTOP — HOME

Two equal "sheet of paper" panels floating on a full-bleed animated background
(the `texture-morph-bg` WebGL graphic — see BACKGROUND GRAPHIC section).

### Vertical budget (percent of viewport height, top to bottom)

| Band | Height | Notes |
|---|---|---|
| Top nav bar (cream) | **8%** | Permanent, full width, never disappears. Wordmark + nav items vertically centered. |
| Gap (nav bottom → panel top) | **3%** | |
| Two-panel body | **85%** | The two floating panels. Flexible region. |
| Bottom margin (panel bottom → screen bottom) | **4%** | |

Sum: 8 + 3 + 85 + 4 = 100.

- **Derivation of panel height:** 100 − 8 (nav) − 3 (gap) − 4 (bottom) = **85%**
  of viewport height.

### Horizontal budget (percent of viewport width)

| Element | Value |
|---|---|
| Side margin (screen edge → outer edge of each panel), both sides | **4%** |
| Center gutter (between the two panels) | **3%** |
| Each panel width | **44.5%** |

- **Derivation of panel width:** (100 − 4 − 4 − 3) ÷ 2 = **44.5%** of viewport
  width each.
- Rationale: side margin (4%) > center gutter (3%) so the two panels read as one
  grouped pair, not two drifting objects. Outer breathing room ≥ inner.

### Full-bleed background (desktop)

- The `texture-morph-bg` graphic sits behind everything, full-bleed to all four
  screen edges **except** it starts below the bottom of the top nav bar (the nav
  bar is cream and sits on top). The two panels float on top of the graphic.

### Panels

- The two panels are **equal size** (same width, same height). The symmetry is
  the concept: static self (left) vs. moving sky (right).
- **Left panel:** dark gradient (natal). Holds the person's placements.
- **Right panel:** teal gradient with a cream rectangle on top of the teal (the
  cream rectangle holds the current-sky content). The teal is the immersive/sky
  surface; it is a considered surface, not a plain gradient — it frames the sky
  content the way the dark gradient frames the natal content.
- Each panel has a **cream "sticker label"** straddling its top edge (like a
  label stuck on a sheet of paper), title in **Geist Mono**. Left label: "My
  Chart". Right label: "Today's Sky".

### Inside each panel (percent of panel height, top to bottom)

| Region | Height | Notes |
|---|---|---|
| Sticker label overlap clearance | start content ~**2%** below top edge | The label straddles the top edge and consumes ~0 internal height; content starts ~2% down to clear it. |
| Header zone | **14%** | Left: name (Anton/display) + birth metadata (Geist Mono). Right: date. |
| Body (contained scroll) | **flex — fills remainder** | The scrolling region. Absorbs screen height: shorter screen → fewer rows visible, same row height. |
| Footer button bar | **13%** | Bottom-anchored. 3 buttons, vertically centered, evenly distributed. |

- **Content inset (left/right) inside each panel:** **5%** of panel width, both
  panels identical, so text never touches the panel edge.

### Left panel body — the placements list

- Contained scroll, **looping** (never-ending loop scroll). Full list of the
  person's placements.
- **Row height:** fixed per row at ~**9–10%** of the body region height. Rows do
  NOT resize with the viewport — the visible count changes instead (~8–10 rows
  visible on a standard laptop; fewer on short screens).
- Top and bottom rule-lines mark the scroll boundaries.

### Right panel body — current sky + aspects

- Two stacked contained scrolls inside the cream rectangle:
  - **Current sky box:** ~**40%** of the body region. Contained scroll, looping.
  - **Aspects & Events box:** ~**60%** of the body region. Contained scroll.
    Denser / more-used list, so it earns the larger share.
- Aspects list content: dated timeline entries by name only (no text preview),
  ordered most-recently-active → oldest-still-active (started today on top,
  started a month ago on bottom). Filter for upcoming (soonest on top, farthest
  out on bottom). Filter section: by aspects-to-my-chart, aspects-to-the-sky, and
  by each planet. (Filter/sort behavior built out later; layout budget defined
  here.)

### Footer buttons (both panels)

- 3 buttons each: **Read**, **Chart**, and **Birth Charts 101** (left) /
  **Transits 101** (right).
- Read / 101 buttons navigate to the natal or transits page (URL change), opened
  to that screen state.
- The top-right **List / Chart** links change the current screen state in place
  (swap the relevant half to its chart view): left "Chart" → natal chart view;
  right "Chart" → transit chart view (two variants: current sky / transiting sky
  — built later).

### Desktop safe-area / frame

- Standard desktop: no device notch handling required. The cream nav bar reaches
  the top edge; the background graphic and panels sit within the vertical budget
  above.

---

## MOBILE — HOME

Single no-scroll column. This is a **reduction** of desktop, not a redesign:
same elements (name, bodies, sky/interactive split, moving graphic), fewer of
them (3 bodies not the full list, no chart buttons, no aspects list, stacked CTAs
instead of the two-panel spread).

Carried over verbatim from the existing app home (`index.tsx`) — these are
already-tuned values, do not change:
- **Name/cream zone** height and **ticker** height stay as in the app.
- **Orb sizing rule** (below) stays exactly.

### Layer stack (bottom to top)

- **Cream** background bleeds to the physical top of the screen (under the
  notch).
- **Dark/sky background** (the `texture-morph-bg` graphic / sky image) is the
  bottom layer; it bleeds to the physical bottom of the screen (under the home
  indicator).
- Content layers sit on top of these.

### Vertical structure (top to bottom)

1. **Top cream section** — wordmark + date row, then name (Anton). Name is the
   hero. (Height per existing app name/cream zone — unchanged.)
2. **Flex zone** (everything below the name, above the ticker) — see FLEX ZONE
   BUDGET below.
3. **Ticker** — stock-ticker-style horizontal scroll of current planet
   positions, pinned bottom, full width. (Height per existing app ticker —
   unchanged.)

### FLEX ZONE BUDGET (percent of the flex zone, top to bottom) — RATIFIED

The flex zone is the region below the name and above the ticker. Its children
sum to 100:

| Element | Flex weight | Notes |
|---|---|---|
| Orb belt (3 orbs: Sun, Moon, rising-sign ruler) | **35** | **UNTOUCHED** from app. Orbs + their labels live here. |
| Birth-data section | **12** | **NEW.** Inserted between the orb belt and the planet sliver (where the app had a 0-height gap). Holds up to **2 lines** of birth data (e.g. date+time line, location line). Has a collapsed state showing just the name (data specifics defined later). |
| Planet image sliver | **6** | Down from 11 in the app. A thin horizontal window onto the full-bleed morph graphic. |
| Gap below sliver | **3** | Down from 5 in the app. |
| Teal / CTA zone | **44** | Down from 49 in the app. Teal gradient with a cream rectangle on top holding 2 stacked CTAs: "My Chart" and "Today's Sky". |

Sum: 35 + 12 + 6 + 3 + 44 = 100.

- **This is a redistribution of the existing app flex zone.** App baseline was:
  orb belt 35, gap-above-sliver 0, sliver 11, gap-below-sliver 5, teal 49
  (= 100). The change inserts a 12-weight birth-data section funded by: sliver
  −5, gap-below −2, teal −5 (total −12).
- **Visual stack within these zones:** orbs → orb labels → **birth data** →
  sliver → teal(cream CTA rectangle). Give the birth-data section a little top
  padding so its first line does not crowd the orb labels above it.

### ORB SIZING RULE (carried from app — do NOT change)

The 3 orbs are sized relative to the region below the name, NOT the full page and
NOT the orb-belt slot alone. Exact chain from the app:

```
FLEX_ZONE_TOP = SCREEN_H * (FLEX_TOP / FLEX_TOTAL)      // the name/cream zone height
FLEX_ZONE_H   = SCREEN_H - FLEX_ZONE_TOP - TAB_BAR_HEIGHT - FLEX_TICK
BELT_ACTUAL_H = FLEX_ZONE_H * 0.44
ORB_LARGE     = BELT_ACTUAL_H * 0.48                    // large/center orb diameter
ORB_SMALL     = BELT_ACTUAL_H * 0.34                    // small orb diameter
```

- The orb size depends ONLY on: screen height, name-zone height, tab-bar height,
  ticker height. It does NOT depend on the belt/sliver/teal split.
- **Because the name and ticker heights are unchanged, the orbs stay pixel-
  identical after the flex-zone redistribution above.** The redistribution only
  moves elements underneath the fixed-size orbs.
- The orbs are intentionally sized to ~44% of the whole below-name region, so
  they slightly overflow their 35-weight slot by design. Keep the 0.48 / 0.34
  large/small ratio exactly.
- App reference constants (from `index.tsx`): `H_PAD = 20`; flex weights derived
  from Figma — Top 183, Belt 215, Gradient 345, Ticker 43 (total 786). On web,
  translate the fixed native constants (`TAB_BAR_HEIGHT = 80`, bottom inset 34)
  to their web equivalents (see mobile frame rules).

### Horizontal (mobile)

- Content side margins per the existing app home (`H_PAD = 20` reference) — do
  not relitigate; already accounted for in the app design.
- The planet sliver and the ticker go **full-bleed edge to edge** (they are the
  moving graphic elements).
- The cream CTA rectangle inside the teal insets from the teal's edges so it
  reads as a placed object (per existing app CTA treatment).

### Mobile CTAs

- 2 CTAs stacked: **My Chart** and **Today's Sky**, in the cream rectangle on the
  teal. Each CTA gets real height (comfortable tap target) with generous spacing
  between the two.

### Mobile safe-area / frame (web translation of the app's native insets)

- **Cream** (top) full-bleeds to the physical top; the name/cream zone content
  gets top padding = `env(safe-area-inset-top)` to clear the notch / Dynamic
  Island.
- **Dark/sky background** (bottom) full-bleeds to the physical bottom under the
  home indicator; the **ticker** content gets bottom padding =
  `env(safe-area-inset-bottom)` so it clears the indicator, while the dark
  background still runs to the physical bottom edge.
- The middle flex-zone zones (35 / 12 / 6 / 3 / 44) divide only the space left
  after the top and bottom insets — the insets are absorbed by the name zone
  (top) and ticker zone (bottom), never by the middle zones.

---

## DESKTOP — READING PAGE (natal + transits)

Two-column layout: a planet/sky list rail (left) + the reading zone (right).
Same outer frame as home. Natal and transits are identical in proportion;
only backdrop and labels differ (see global note at top).

### Standardized buffer system (one buffer unit, repeated at every level)

Derived from the existing reading page's cream-rectangle inset
(`.card-inner`: top/bottom 6.5%, left/right 8%). Reuse these two numbers as the
project's buffer unit everywhere:
- **Horizontal buffer: 8%** — screen edge → content, AND background → cream
  rectangle.
- **Vertical buffer: 6.5%** — screen edge → content, AND background → cream
  rectangle.

### Outer frame (percent of viewport)

| Band | Value |
|---|---|
| Top nav bar (cream, permanent) | **8%** of viewport height |
| Side margins (both) | **8%** of viewport width |
| Top/bottom margin of the reading area (below nav) | **6.5%** of viewport height |

### Column split (percent of content width, after the 8% side margins)

| Column | Value |
|---|---|
| List rail (left) | **23%** |
| Gutter | **3%** |
| Reading zone (right) | **74%** |

Sum: 23 + 3 + 74 = 100. (Same 23/3/74 + 8% margins as any other two-column
Texture screen — keep consistent.)

### Reading zone interior (CARRY VERBATIM from existing reading page — do not tinker)

From `app/globals.css` `.card-inner` and friends. Inside the reading zone, the
cream reading rectangle is inset from its (planet/sky) background by:
- **top/bottom: 6.5%**, **left/right: 8%** (keep all four insets within the
  zone — the rectangle stays an even "sheet"; the rail is a separate element to
  its left).
- Rectangle is therefore ~**84% of the zone width**, ~**87% of the zone
  height** (a tight, framed inset — NOT golden-ratio-loose; this was explicitly
  chosen over a larger margin).
- Header: `flex-shrink: 0`, padding `14px 8px 12px`, `gap: 4px`. Placement name
  in Anton `clamp(36px, 10vw, 52px)`.
- Body: `flex: 1`, contained inner scroll (`overflow-y: auto`,
  `overscroll-behavior: contain`), padding `0 4px`.
- Section body padding: `4px 4px 24px`.
- Footer: `flex-shrink: 0`, height `54px`, red top border
  `1.5px solid rgba(185,18,18,0.50)`.
- Section is `100dvh`, no margins (no-scroll page; inner scroll only).

### Reading zone backdrop

- NATAL: reading rectangle sits on the placement's planet background (dark
  page). The reading-view rectangle IS the cream card (as today).
- TRANSITS: cream rectangle sits on the teal/sky background (like home right
  panel). Transits reading view additionally includes a **timeline section**
  within the reading viewport (layout budget TBD when we spec the timeline;
  it lives inside the reading zone).

### Aspects & Events (transits, and any aspects list)

- Plain cream list. Dated timeline entries by NAME ONLY (no text preview).
- Order: most-recently-active → oldest-still-active (started today on top).
- "Upcoming" filter: soonest on top → farthest out on bottom.
- Filters: aspects-to-my-chart, aspects-to-the-sky, by each planet.
- (Behavior built later; this is the content/ordering rule.)

---

## DESKTOP — CHART VIEW (natal + transits)

The chart view is a STATE of the reading page (toggled by the rail's
Read/Chart control). Same outer shell, same 8% / 6.5% buffers, same rail —
only the reading zone's CONTENTS swap from the cream rectangle to the wheel.
The frame never moves between states.

### Chart zone contents (percent of the reading zone)

- **No cream rectangle.** The wheel sits directly on the backdrop.
  - NATAL: a RADIAL-GRADIENT circle behind the wheel (over the dark page);
    wheel painted on top, rendered last.
  - TRANSITS: wheel sits on the DARK GRADIENT (no radial-gradient circle).
- **Wheel diameter: ~62% of the zone width** (circle; height = width). Carried
  from app where the wheel is centered on the gradient circle.
- **Vertical placement: slightly above center** — wheel center at **~44% of
  the zone height** (top of wheel ~13%, bottom ~75%), leaving the lower band
  for name/birthdata.
- **Chart 101 link:** top-right corner of the zone, 8% inset (mirrors "Read >"
  position on the list view).

### Name / birth-data band (carried behavior from app chart screen)

Sits in the lower band of the zone (below the wheel). Geist Mono (this is a
technical page — not Anton). Two states, tap to toggle:
- **Collapsed (name only):** name is CENTERED horizontally in the band.
- **Expanded (on tap):** name SHIFTS LEFT and birth data appears below it,
  left-aligned (8% inset). Date+time on one line, location right-aligned on the
  same row; STACKS to two lines only when the single line is too long.
- **Name:** `clamp(20px, 2vw, 30px)` Geist Mono (30px = Figma target ceiling).
- **Birth data:** `clamp(13px, 1.4vw, 20px)` Geist Mono (20px = Figma ceiling).
- App reference sizes were 18px (collapsed name) / 16px (expanded name) / 12px
  (birth data); the clamps above scale these up for desktop.

### Wheel interaction (carry from app)

- Zoom + pan KEPT on both natal and transits. Scale bounds **1× to 3×**
  (`MIN_SCALE 1`, `MAX_SCALE 3`). Pan is bounded to
  `(wheelSize * (scale - 1)) / 2` on each axis.
- Desktop input mapping: scroll-to-zoom, drag-to-pan (app used pinch + one-
  finger pan; translate to mouse/trackpad).

### Transits chart view extras

- **Date** shown bottom-left of the zone (e.g. "July 26, 2026").
- **Wheel toggle** bottom-right: **Today** (current-day sky wheel) ·
  **Transiting** (transits-against-natal wheel). Active one marked (same
  active/inactive treatment as nav). Two wheel modes.

---

## THE LIST RAIL (natal + transits)

The left rail on the reading/chart pages. Width **23%** of content width (see
column split). Contains a header (title + view controls) and the contained,
looping planet/sky list.

### Rail header

Two distinct jobs, kept visually separated:
1. **Title** (a label): **Anton, on every screen** (matches the mobile list
   title — corrected from an earlier Geist-Mono note). NATAL: "Planets".
   TRANSITS: "Sky". REFERENCE: "Reference". SETTINGS: "Settings".
2. **View controls** (the List/Chart[/Calendar] cluster): **always show the FULL
   set with the active view marked** — active = **red, slightly bolder/larger**;
   inactive = normal Geist Mono. Do NOT conditionally hide the active control.
   - NATAL controls: **Read/List · Chart** (2).
   - TRANSITS controls: **Read/List · Chart · Calendar** (3).
- Layout: title + controls on ONE line where they fit; STACK to two lines if
  needed (transits with Calendar). Header heights may differ slightly across
  screens for this reason — content-driven, acceptable.
- A rule line separates the header from the list (top scroll boundary).

### The rail is the navigation spine (clickable nav)

- EVERY rail item is a clickable nav element that **scroll-snaps the reading
  pane to that item's section** (in-place; never navigates — see the universal
  model). The active section shows the **red vertical bar** on its left.
- Reference rail is a **nested / indented outline** (main items + indented
  sub-items), unlike the flat planet list.

### The list itself

- NATAL: **13 placements** (nodes are ONE combined reading now, not split N/S
  Node). List: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
  Neptune, Pluto, Ascendant, Midheaven, Nodes (Asc/MC shown only when birth time
  known).
- TRANSITS: **11 bodies** (Sun–Pluto = 10, plus Nodes as one = 11) — the current
  sky.
- Sized to fit the full count with **NO scroll** (the 2-line row below makes 13 /
  11 fit a 23%-width rail comfortably at the Figma 14pt reference); contained
  loop-scroll only as a fallback on short viewports.

### Rail row = TWO lines (from mock, fits no-scroll at 13/11)

- **Line 1:** planet glyph · planet name · degree · retrograde "R" (if present;
  R in red `rgba(185,18,18,0.75)`).
- **Line 2:** sign glyph · sign · house.
- Body text Questrial; glyphs `rgba(22,22,18,0.55)`. Row text sized so 13/11 fit
  no-scroll (Figma reference 14pt → web `clamp`; tune on screen).
- Rows separated by a thin bottom border. Whole row is the clickable snap target.

---

### Reading zone backdrop VARIES by screen (rail is identical on all)

The rail is always the same (Anton title + cream rectangle behind the list).
Only the READING ZONE's backdrop differs:
- **NATAL:** dark background; the reading rectangle sits on the placement's
  planet background.
- **TRANSITS:** teal/sky background; cream rectangle inset over it.
- **REFERENCE:** teal background; cream rectangle inset over it (normal inset).
- **SETTINGS:** NO backdrop — the cream rectangle flexes to fill the zone (same
  internal proportions, just larger; internals scale with the rectangle).

### Timeline sub-section (transits reading zone)

Inside the transits reading pane, the body stacks:
header (placement name + red rule) → **Overview** (scroll body) → **"Timeline"**
divider + dated timeline entries → **"Reference"** footer. Timeline is a labeled
sub-section WITHIN the reading body, not a separate zone.

### Aspects & Events / Calendar panel

Same reading-zone frame (cream rectangle, 6.5/8 inset over the backdrop) with
this internal layout:
- **Date** top-left; **"Aspects and Events"** title.
- **Current / Upcoming** toggle (upper-left of body).
- **Filter** control upper-right, with options: Aspects to My Chart, Sky
  Aspects, and per-planet (e.g. Moon).
- **Vertical timeline axis** down the body: top = Newest (Current) / Soonest
  (Upcoming); bottom = Oldest (Current) / Latest (Upcoming).
- Entries are dated timeline items by NAME ONLY (no text preview).

---

## PRE-PURCHASE HOME (desktop)

Uses the SAME two-block home template (sizing, spacing, proportions identical to
the post-purchase home — see HOME section). Differences are content and function
only:
- Backgrounds flipped vs. post-purchase home.
- LEFT block: info + choice selection.
- RIGHT block: data-entry, **grayed out until a choice is selected on the left**
  (selecting a left choice activates the right entry form).
This is the home template with different slot content, not a new layout.

---



Mobile reading, chart, and list pages mirror the EXISTING APP screens almost
exactly. Carry the app's structure; the web changes are minimal and listed
below. All app values below are the tuned source of truth.

### Shared mobile frame (from app)

- Wordmark: `insets.top + 4` from top, left `20`.
- Nav row: chart screen `wordmarkTop + 50`; list screen `wordmarkTop + 47`.
- Nav items: Geist Mono, inactive `16px rgba(253,245,237,0.45)`, active
  `18px rgba(253,245,237,1)`, letter-spacing 1.
- `H_PAD` / side inset: **20px**.
- On web: apply the safe-area rules from the GLOBAL RULES section
  (`viewport-fit=cover`, `env(safe-area-inset-*)`, `100dvh`); the app's native
  `insets.top` / `TAB_BAR_HEIGHT (80)` translate to those.

### Mobile CHART view (from app `index.tsx`)

- Circle (radial gradient, NATAL only): diameter `540` (native); `circleTop =
  navTop + 52`, horizontally centered (`(W - 540)/2`). On web, express as a %
  of viewport width rather than fixed 540.
- Wheel: `wheelSize = W - 32` (near full width), centered on the circle center.
- Zoom/pan: scale `1×–3×`, same as desktop.
- Name/birth-data band: between circle bottom and tab bar.
  - Collapsed: centered, name only, `fontSize 18`.
  - Expanded: left-aligned (`left/right: 20`), name `16` + birth data `12`
    (Geist Mono), date+time / location, stacking when too long.
- TRANSITS mobile chart adds: the **Today / Transiting** wheel toggle and a
  **date** replacing the name (per app config + the two mocks).

### Mobile LIST view (from app `planet-list.tsx` / `transits.tsx`)

- Cream rectangle, full width. NATAL: `rectTop = navTop + 33`,
  `rectBottom = H - 100` (bottom 100px reserved for name/birth data). TRANSITS
  list: `rectTop = wordmarkTop + 40`, `rectBottom = H - TAB_BAR_HEIGHT`.
- Header: `paddingTop 16`, `paddingHorizontal 20`, `gap 8`. Title in **Anton**
  (mobile list title is Anton, unlike the desktop rail's Geist Mono title):
  natal `fontSize W*0.08` ("Placements"), transits `fontSize W*0.10`
  ("Transits"). Red rule under it: `height 2, rgba(185,18,18,0.60)`.
- Rows: `justify-content: space-evenly`, `paddingHorizontal 20` (natal) / `28`
  (transits), `paddingBottom 8`. Row: `paddingVertical 4` (natal) / `6`
  (transits), bottom border `0.5px rgba(22,22,18,0.10)`. Row text Questrial
  `fontSize W*0.038` (natal) / `W*0.040` (transits).
- Name/birth-data bottom zone (natal list): collapsed centered `top H-72`
  `fontSize 18`; expanded `top H-84` `left/right 20`.

### Mobile bottom label (the one web change to the reading page)

- On the bottom of the mobile reading page where the app shows the user name:
  - NATAL pages: show the person's NAME.
  - TRANSITS pages: show **"Transits"**.

---

## CHART WHEEL — COLOR SYSTEM

The wheel must read as Texture: stark, clean, OPAQUE (zero translucency
anywhere), high-contrast — not the soft/washed astrology-app default. It sits on
BOTH the dark background (natal) and the teal/dark-gradient (transits), so
nothing is translucent — the wheel looks identical on any backdrop.

### Face and structure
- **Wheel face (the inner disc):** solid cream `#FDF5ED`, 100% opacity. This is
  what makes it read as a "sheet of paper" like the reading rectangles, and what
  lets it sit identically on any background.
- **Structure lines** (outer ring, inner circle, house cusps, spokes): solid
  dark ink `#0e0c1a`. Two weights only, same ink family: primary structure at
  full `#0e0c1a`; secondary/minor spokes at a warm gray = the same ink mixed
  toward cream (~`#8a857f`). Structure is INK, never color — this is what keeps
  the color intentional.
- **Outside the sign ring:** transparent (no soft halo/gradient bleed). The
  wheel is just the cream disc + the metallic sign ring, floating on the
  backdrop.

### Sign ring — literal planet backgrounds as "metallic slices"
- The 12 sign arcs (the outer colored band) are each filled with the actual
  ruling-planet BACKGROUND image, clipped to the 30° donut-wedge arc. Do NOT
  pre-cut arcs in Figma — clip the live background image to the arc geometry at
  render time (SVG `clipPath` per segment), so it scales and stays maintainable.
- **Sampling method (uniform across all 12):** sample a thin VERTICAL slice from
  the HORIZONTAL CENTER of each background, taken UPRIGHT, then map that upright
  strip radially across the arc's angular span. Every sign is sampled the same
  way (center vertical strip, upright) before being warped into position — so
  they read as consistent cuts even though they spoke outward once placed. The
  center vertical strip captures each background's full top-to-bottom gradient.
- **Sign → ruling-planet background mapping (MODERN rulerships):**
  Aries→Mars, Taurus→Venus, Gemini→Mercury, Cancer→Moon, Leo→Sun,
  Virgo→Mercury, Libra→Venus, Scorpio→**Pluto** (modern), Sagittarius→Jupiter,
  Capricorn→Saturn, Aquarius→**Uranus** (modern), Pisces→**Neptune** (modern).
- Note: a few of these deviate from the sign's traditional COLOR — that's a
  deliberate choice; the ring subtly highlights each sign's ruling planet.
- **Sign glyphs (on the ring arcs):** cream `#FDF5ED`, with a hairline dark
  drop-shadow for legibility (some metallic backgrounds have light patches where
  a plain cream glyph would lose contrast — the subtle shadow is a legibility
  tool, not softness). Sign glyphs are always cream (they sit on busy metal, so
  they stay neutral).

### Planet glyphs (inside the cream disc) — traditional planet colors, muted to brand
These sit on the opaque cream face, so colored glyphs read cleanly. SHAPE is the
primary identifier; color is reinforcement — muted/muddy versions are correct,
and same-family greens/blues are fine (no need to force max distinction). Do NOT
sample these from the planet backgrounds (that would give pink-Venus,
beige-Saturn). Use these defined muted-brand hexes (starting values; tune for
legibility on cream `#FDF5ED`):
- **Sun** — muted amber/ochre (deep, not bright yellow) ~`#b8862e`
- **Moon** — cool mid gray, slight blue lean ~`#7a8290`
- **Mercury** — muted ochre-brown / tan ~`#9a7b4f`
- **Venus** — muted sage/olive green ~`#6f7a4a`
- **Mars** — brand red `#b81212` (Mars = red = brand red; clean overlap)
- **Jupiter** — deep muted royal indigo ~`#3a3f7a`
- **Saturn** — near-black lead = brand dark `#0e0c1a` (or a hair lighter ~`#1e1c2a`)
- **Uranus** — muted steel/electric blue (cooler, grayer than Jupiter) ~`#4a6a80`
- **Neptune** — muted sea-green/teal ~`#3f7a70`
- **Pluto** — deep maroon/oxblood (darker, browner than Mars) ~`#6a2828`
- **Degree/sign/minute text** next to glyphs: solid dark ink `#0e0c1a`.
- **Retrograde ℞ marker:** brand red `#b81212` (matches red = attention/presence
  elsewhere; the one red accent inside the disc besides the Mars glyph).

### Aspect lines (across the center) — traditional convention, brand-tuned
Major aspects ONLY (no minor/quincunx lines). Solid, full opacity, clean, weight
heavier than the current translucent threads so they read as structure.
- **Hard aspects (square, opposition, and conjunction):** brand red `#b81212`
  (traditional aspect-red = brand red; clean overlap).
- **Soft aspects (trine, sextile):** brand-range indigo ~`#2d3a6a` — sits in the
  traditional soft-aspect blue while feeling like the brand's blue.
- (Optional, later: weight lines subtly by aspect exactness/orb — tighter =
  heavier. Traditional and nice, not required now.)

### Summary
Opaque cream face · dark-ink structure and degree text · sign ring = literal
planet backgrounds clipped to arcs (center-vertical-slice sampled) with cream
sign glyphs · planet glyphs in muted-traditional-brand colors on the cream face ·
major aspect lines red (hard) / indigo (soft) · transparent outside the ring ·
zero translucency anywhere.

---

## TRANSIT CHART CONSTRUCTION (the two "Chart" states on Transits)

The transits Chart view has two toggle states: **Today** and **Transiting**.
Both reuse the existing `NatalChartWheel` component's angle math
(`longitudeToScreenAngle(longitude, house1Cusp)`) and color system; they differ
in what data and how many planet rings.

### "Today" wheel (current sky) — reuses the no-birth-time logic

- Uses the SAME logic already built for no-birth-time natal charts: **no house
  labels, no MC, no ASC, Aries locked to the 1st-house position (unlabeled).**
  Signs + planets only, no personal houses.
- Fed today's planetary positions (10–11 bodies: Sun–Pluto + nodes) instead of
  birth positions. ~No structural change to the wheel — it's the existing wheel
  with current-sky data and the no-birth-time frame.
- **Single ring** (one set of planets) — keeps the richer natal-style label
  treatment since it has the room.

### "Transiting" wheel — a BI-WHEEL (natal inner + transits outer)

Standard transit bi-wheel: two concentric planet rings sharing ONE house frame.
- **Inner ring = natal planets** (birth chart, fixed).
- **Outer ring = transiting planets** (today's sky, moving).
- **Houses = NATAL only** (the shared stage). Transiting planets are placed by
  their current longitude into the natal house framework — reuse
  `longitudeToScreenAngle` with the NATAL `house1Cusp` on the transit planet set.
- **Aspects = transit-to-natal ONLY** (drawn between the two rings; this is the
  engine's transit-contact data). No transit-to-transit lines (those live on the
  Today wheel).

### Radial budget for the bi-wheel (fractions of wheel radius R, outside→in)

The natal single-wheel gives one planet ring ~0.86R to breathe. The bi-wheel
must fit TWO planet rings + sign ring + aspect hub. Standard 5-band split:
- **Sign ring:** `R` → ~`0.88R` (~12%) — the metallic sign ring, unchanged.
- **Transiting planet ring:** ~`0.88R` → ~`0.70R` (~18%).
- **Dividing ring / house band:** ~`0.70R` → ~`0.66R` (~4%) — the hairline
  divider between the two planet rings (carries the natal/transit distinction).
- **Natal planet ring:** ~`0.66R` → ~`0.48R` (~18%).
- **Aspect hub:** ~`0.48R` → center (~48%) — transit-to-natal aspect lines draw
  from the natal ring inward into this hub.

### Bi-wheel label compression (the key change)

Because each ring gets only ~18% of the radius (vs. ~86% in the single wheel),
the on-wheel label MUST compress:
- **Bi-wheel planets show: glyph + degree + retrograde marker ONLY.** DROP the
  arcminutes and the sign name (sign is obvious from ring position; full
  detail — sign, minute, house, retrograde — lives in the rail's 2-line rows).
- **Both rings use the SAME planet size** (balanced). The dividing ring, not
  size, distinguishes natal from transit.
- **The natal single-wheel ("My Chart" Chart view) STAYS RICHER** — one ring,
  more room, keeps its fuller labels. The two chart views deliberately differ in
  density (natal detailed, transit lean); this is intentional, not
  inconsistent.

### Ring distinction

- Position carries the meaning (outer = sky, inner = you), plus the hairline
  dividing ring between the two bands. No heavy color-coding; both rings use the
  same muted-traditional planet-glyph colors from the color system. Minimal by
  design.

### Once-daily calculation note (REQUIRED on transit wheels)

Transit charts are calculated ONCE PER DAY (no live generation). The Moon moves
~13°/day (fastest body), so its position may be slightly off intraday. Show a
note on transit wheels: charts are calculated once daily and the Moon's position
may drift within the day.

### Component delta summary (`NatalChartWheel`)

- **Today:** feed current-sky data + no-birth-time frame into the existing wheel.
  Minimal change.
- **Transiting (bi-wheel):** (1) add an outer planet ring with its own radii
  (~0.88→0.70R); (2) accept two planet sets sharing natal houses; (3) run the
  existing `resolveCollisions` per ring (currently assumes one set); (4) compress
  bi-wheel labels to glyph+degree+R; (5) draw transit-to-natal aspect lines from
  the natal ring into the aspect hub. Prop shape changes from
  `chart: { planets, houses, aspects }` to
  `{ natal: {planets}, transits: {planets}, houses (natal), crossAspects }`.

---

## MOBILE MENU (drawer)

- The mobile "Menu" position shows a **hamburger (three lines)** — consistent on
  EVERY mobile screen (replaces the "Menu" text label).
- Tapping opens a **simple drawer** (slides over) with ONLY the five top-level
  links: **Home · My Chart · Transits · Reference · Settings.**
- **No sub-navigation inside the drawer** — the rail's table-of-contents job
  stays on the page (scroll); the menu only switches top-level URL.
- (Drawer visual styling beyond this — TBD.)

---



- A WebGL shader that morphs continuously through the 10 planet gradient
  backgrounds (classical planet order, looping). Tuned defaults baked in
  (pace 20.5, flow 1.5, scale 1.4, depth 0.5, warp 1.02, drift 0.08). Ships as a
  custom element: `<texture-morph-bg>`.
- **Desktop:** used full-bleed behind the two panels (its intended use —
  `position: fixed; inset: 0; z-index: -1`), starting below the cream nav bar.
- **Mobile sliver:** render the element at full size and **clip it to the sliver
  height** with `overflow: hidden` (a horizontal window onto the same full-bleed
  field). Do NOT squish the element into a short wide box — the shader is
  aspect-corrected and squishing distorts the blobs. Window, not squish.
- The mobile sliver height floor is ~6–7% of the flex zone; below that it stops
  reading as the graphic and becomes a colored bar. Current spec (sliver weight
  6) is at that floor — acceptable.
- Performance flags (verify on a real phone, not blockers): it runs an always-on
  `requestAnimationFrame` WebGL loop (draws every frame) and loads 10 PNGs.
  Confirm no battery drain / scroll stutter on mobile.

### Asset locations (recorded August 3, 2026, Phase 1 routing pass)

- The static full-page backgrounds and all planet-background PNGs (sun,
  moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto,
  asc, mc, nodes, sky, transits) now live in `/public` in this repo,
  referenced as root-relative paths (`/sky-background.png`,
  `/transits-background.png`, `/sun-background.png`, etc.) — not in
  Supabase storage. (Note: as of this writing the live natal reading
  page still points at the old Supabase storage URLs; repointing it at
  the `/public` copies is not part of this routing phase and is
  untouched here.)
- The `texture-morph-bg` graphic file currently lives in `/docs`
  (`docs/texture-morph-bg.js`). It is not yet wired into the app.
  Phase 2 integrates it as a component; this project's existing
  convention for screen-level components is a flat, PascalCase file
  under `app/components/` (e.g. `ChartSection.tsx`, `CoverSection.tsx`),
  so it should land as `app/components/TextureMorphBg.tsx` (or
  equivalent name) when that happens — confirm against the convention
  at build time rather than assuming this note is still current.

---

## NOT YET DEFINED (deferred, do not invent at build time)

- The mobile teal/CTA section's internal proportions beyond "2 stacked CTAs in a
  cream rectangle" — new vs. the app, internal spacing not yet ratified.
- Filter/sort BEHAVIOR for the aspects/calendar list (ordering rules are
  defined; interaction is not).
- The transits reading zone's **timeline section** internal layout budget
  (it lives inside the reading zone; sizing TBD).
- The **Calendar view** (transits) full layout — the mobile mock exists
  (title "CALENDAR", current/upcoming/filter, dated entries) but proportions
  are not yet ratified.
- **Chart 101 / Transits 101** screens (how-to-read-a-chart).
- **Reference** (mostly the existing dictionary page) and **Settings**
  (methodology disclosures, AI-and-astrology section, manage-subscription link,
  data-deletion requests) — layout not yet specced.
- **Coming-soon homepage** and **upsell/locked states** (the aspects/events
  section becomes the subscribe invitation on home; the live-sky page fills in
  everything except the free current-sky chart) — pattern agreed, layout not
  specced.
