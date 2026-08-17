'use client';

// RIGHT panel of the post-purchase home ("Today's Sky" — SPEC §16,
// post-purchase home build). Deliberately more limited than the My Chart
// panel: Transits isn't wired up yet, so this is plain, unpersonalized
// current-sky data only — no natal contacts, no per-row link, no Read
// button. Data: get_current_sky_positions() + get_current_sky_aspects(),
// the two open RPCs built August 15, 2026 (SPEC §16) and unused by any
// frontend until now.
//
// Per the doc (docs/TEXTURE_LAYOUT_PROPORTIONS.md, "DESKTOP — HOME"), the
// right panel's List-mode header+lists+footer sit on a cream rectangle laid
// over the panel's teal background image — so unlike the My Chart panel
// (light text directly on a dark image), List mode here is dark-on-cream.
// The card extends down through the footer, and stops with a teal margin
// below it (roughly matching the teal margin the shared `.home-panel-slot`
// CSS already leaves above the card) rather than touching the panel's true
// bottom edge (home-page-polish task, §16, fourth follow-up). Chart mode
// drops the cream card entirely and sits directly on the teal image, matching
// the left panel's Chart state.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import TodaySkyWheel from './TodaySkyWheel';
import { formatToday, formatContextualDate, parseLocalDate, getTodayLocalISODate } from '@/lib/date-utils';
import { RAIL_SIGN_GLYPHS } from '@/app/reading/[slug]/natal/page';

interface SkyPosition {
  body: string;
  sign: string;
  sign_degree: number;
  retrograde: boolean;
}

interface SkyAspect {
  body_1: string;
  body_2: string;
  event: string; // conjunction | sextile | square | trine | opposition (eclipse rows never reach this RPC — see create_today_sky_rpcs.sql)
  window_start: string;
  window_end: string | null;
  exact_date: string | null;
}

// Glyph per body — re-keyed from RAIL_PLANET_GLYPHS's short-id map (natal
// page) to the RPC's own body-name strings ("Sun", "North Node", ...); same
// glyph characters, same styled-glyph convention, just a different key
// shape. RAIL_SIGN_GLYPHS is imported directly since its keys (full sign
// names) already match sky_positions.sign as-is.
const BODY_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
};

const BODY_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node'];

function aspectVerb(event: string): string {
  return event === 'conjunction' ? 'conjunct' : event;
}

function formatRowDate(iso: string): string {
  return formatContextualDate(parseLocalDate(iso), { month: 'short', year: undefined });
}

function daysBetween(a: string, b: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.abs(parseLocalDate(a).getTime() - parseLocalDate(b).getTime()) / MS_PER_DAY;
}

type PaneMode = 'list' | 'chart';

const DARK = 'var(--dark)';
const DARK_MUTED = 'var(--dark-muted)';
const DARK_FAINT = 'rgba(22,22,18,0.35)';

export default function HomeTodaySkyPanel({ slug }: { slug: string }) {
  const [positions, setPositions] = useState<SkyPosition[] | null>(null);
  const [aspects, setAspects] = useState<SkyAspect[] | null>(null);
  const [paneMode, setPaneMode] = useState<PaneMode>('list');

  useEffect(() => {
    supabase.rpc('get_current_sky_positions').then(({ data }) => setPositions((data as SkyPosition[]) ?? []));
    supabase.rpc('get_current_sky_aspects').then(({ data }) => setAspects((data as SkyAspect[]) ?? []));
  }, [slug]);

  const sortedPositions = (positions ?? []).slice().sort((a, b) => BODY_ORDER.indexOf(a.body) - BODY_ORDER.indexOf(b.body));

  const today = getTodayLocalISODate();

  // aspect_calendar's own data law (create_transit_and_aspect_calendars.sql):
  // "rows are events, content units are windows" — multiple exact rows
  // sharing one continuous orb window are ONE story, never separate rows.
  // The RPC returns raw rows, so group by the shared window here before
  // rendering, or a pair that exacts twice in one long window (e.g. two
  // slow outer planets) would wrongly print as two near-duplicate lines.
  interface AspectGroup { body_1: string; body_2: string; event: string; window_start: string; window_end: string | null; exact_dates: string[] }
  const groups = new Map<string, AspectGroup>();
  for (const a of aspects ?? []) {
    const key = `${a.body_1}|${a.body_2}|${a.event}|${a.window_start}|${a.window_end}`;
    const g = groups.get(key);
    if (g) {
      if (a.exact_date) g.exact_dates.push(a.exact_date);
    } else {
      groups.set(key, { body_1: a.body_1, body_2: a.body_2, event: a.event, window_start: a.window_start, window_end: a.window_end, exact_dates: a.exact_date ? [a.exact_date] : [] });
    }
  }
  const sortedAspects = Array.from(groups.values()).sort((a, b) => {
    const aExact = a.exact_dates[0];
    const bExact = b.exact_dates[0];
    if (aExact && bExact) return daysBetween(aExact, today) - daysBetween(bExact, today);
    if (aExact) return -1;
    if (bExact) return 1;
    return daysBetween(a.window_start, today) - daysBetween(b.window_start, today);
  });

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', containerType: 'size' }}>

      {/* Header + Body + Footer wrapper — carries the cream card in List
          mode (matching docs/mocks/homepage-variants.png: the card wraps
          the date/toggle header and the two lists, with the footer inside
          it too). Chart mode still drops the card entirely, unchanged.

          BOTTOM MARGIN (home-page-polish task, §16, fourth follow-up):
          the card's bottom edge should sit above the panel's true bottom
          edge by about the same amount the panel's own top:2% slot inset
          (globals.css `.home-panel-slot`) already leaves above the card's
          TOP edge — confirmed by measuring the live page: that top gap is
          14px at 1440×900, i.e. 2% of the panel's own height. `flex: '0 0
          98%'` below reserves that same 2% as unclaimed trailing space
          after this wrapper, which Root (transparent, no background)
          shows through as teal — a REAL margin outside the card, not
          padding/whitespace inside it (that was the wrong read in the
          prior follow-up, since undone).

          The card's own LEFT/RIGHT edges still span the full slot width
          (no horizontal padding on the outer root) — `padding: '0 3%'`
          lives HERE, on the wrapper itself, insetting the wrapper's
          CONTENT from the card's edges rather than defining the card's
          edges (home-page-polish task, §16, second follow-up). */}
      <div style={{
        flex: '0 0 98%', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 3%',
        background: paneMode === 'list' ? 'var(--cream)' : 'transparent',
      }}>

      {/* Header 8.7% of the wrapper (unchanged absolute size from before
          the footer moved back in below and grew the wrapper) */}
      <div style={{ flex: '0 0 8.7%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(16px, 1.6vw, 22px)',
          color: DARK,
          letterSpacing: '0.5px',
        }}>
          {formatToday()}
        </span>

        {/* List | Chart toggle — swaps the body in place, no navigation. */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['list', 'chart'] as PaneMode[]).map((m, i) => (
            <span
              key={m}
              onClick={() => setPaneMode(m)}
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: paneMode === m ? 'clamp(12px, 1vw, 14px)' : 'clamp(11px, 0.9vw, 13px)',
                fontWeight: paneMode === m ? 700 : 400,
                color: paneMode === m ? DARK : DARK_FAINT,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                borderLeft: i > 0 ? '1px solid rgba(22,22,18,0.20)' : 'none',
                paddingLeft: i > 0 ? '10px' : '0',
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Body: back to `flex: 1`, auto-filling whatever's left in the
          wrapper after Header and Footer (home-page-polish task, §16,
          fourth follow-up — a prior version fixed this at a specific %
          to manufacture bottom breathing room a different way; that
          mechanism is gone now that the real bottom margin lives outside
          the card, see the wrapper comment above). Planets/Aspects keep
          the 47.3%/52.7% split set two follow-ups ago (Planets trimmed,
          Aspects given more room) — that was a proportion preference, a
          separate request from today's margin fix, so it's unchanged. */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {paneMode === 'list' ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

            {/* Current sky: 47.3% of Body, smaller than Aspects & Events'
                52.7% below — a proportion preference (Planets trimmed by
                roughly half a planet-row's height from an even 49/51
                split — home-page-polish task, §16, third follow-up). Not
                related to the bottom margin mechanism, see the Body
                comment above. */}
            <div style={{ flex: '0 0 47.3%', minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: '0.5px solid rgba(22,22,18,0.15)' }}>
              <div style={{
                fontFamily: 'var(--font-anton), sans-serif',
                fontSize: 'clamp(15px, 1.6vw, 18px)',
                color: DARK,
                letterSpacing: '0.5px',
                flexShrink: 0,
                marginBottom: '6px',
              }}>
                Planets
              </div>
              <div style={{
                flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: '10px',
                borderTop: '1px solid var(--red-rule)', borderBottom: '1px solid var(--red-rule)',
              }}>
                {/* paddingRight above (and on the Aspects & Events list
                    below) leaves breathing room for the scrollbar so it
                    doesn't sit on top of the right-aligned degree/sign/
                    date text — Avery flagged the scrollbar was covering
                    data (home-page-polish task, §16, third follow-up). */}
                {sortedPositions.map(pos => {
                  // Nodes always move backward by nature — "retrograde" is
                  // meaningless for them, so no R flag here (home-page-
                  // polish task, §16; matches the natal page's own rail).
                  const showRetrograde = pos.retrograde && pos.body !== 'North Node' && pos.body !== 'South Node';
                  return (
                    <div key={pos.body} style={{
                      display: 'flex', alignItems: 'baseline', gap: '8px',
                      padding: '6px 0',
                      borderBottom: '0.5px solid rgba(22,22,18,0.08)',
                      fontFamily: 'var(--font-questrial), sans-serif',
                      fontSize: 'clamp(12px, 1vw, 14px)',
                      color: DARK,
                    }}>
                      <span>{BODY_GLYPH[pos.body] ?? '○'}</span>
                      {/* flex:1 right-aligns the degree/sign/retro against
                          the row's far edge — reverted back to this per
                          Avery's request (home-page-polish task, §16
                          follow-up; briefly changed to left-flow-after-name
                          and reverted the same day). */}
                      <span style={{ flex: 1 }}>{pos.body}</span>
                      <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.9em', color: DARK_MUTED }}>{Math.floor(pos.sign_degree)}°</span>
                      <span style={{ fontSize: '0.9em', color: DARK_MUTED }}>{RAIL_SIGN_GLYPHS[pos.sign] ?? ''}</span>
                      <span style={{ color: DARK_MUTED }}>{pos.sign}</span>
                      {showRetrograde && <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.8em', color: 'var(--red-strong)' }}>R</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aspects & Events: 52.7% of Body — larger than Planets'
                47.3% above, the same proportion preference (home-page-
                polish task, §16, third follow-up). Fixed (`0 0`, not
                `1 1`) so its size stays tied to this ratio rather than
                auto-growing to fill whatever Body happens to have left. */}
            <div style={{ flex: '0 0 52.7%', minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: '10px' }}>
              <div style={{
                fontFamily: 'var(--font-anton), sans-serif',
                fontSize: 'clamp(15px, 1.6vw, 18px)',
                color: DARK,
                letterSpacing: '0.5px',
                flexShrink: 0,
                marginBottom: '6px',
              }}>
                Aspects and Events
              </div>
              <div style={{
                flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: '10px',
                borderTop: '1px solid var(--red-rule)', borderBottom: '1px solid var(--red-rule)',
              }}>
                {sortedAspects.map((a, i) => (
                  <div key={`${a.body_1}-${a.body_2}-${a.event}-${a.window_start}-${i}`} style={{
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px',
                    padding: '6px 0',
                    borderBottom: '0.5px solid rgba(22,22,18,0.08)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(12px, 1vw, 14px)', color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.body_1} {aspectVerb(a.event)} {a.body_2}
                    </span>
                    <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(10px, 0.9vw, 12px)', color: DARK_FAINT, whiteSpace: 'nowrap' }}>
                      {formatRowDate(a.window_start)}{a.window_end ? `–${formatRowDate(a.window_end)}` : ''} · {a.exact_dates.length > 0 ? `exact ${a.exact_dates.map(formatRowDate).join(', ')}` : 'no exact'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Real Today's Sky wheel (SPEC §16, Aug 15 2026; aspect lines
                and size-match added in the wheel-fixes follow-up) — same
                positions driving the Planets list above, reshaped for the
                shared wheel-drawing engine by TodaySkyWheel, plus the same
                aspects state driving the Aspects & Events list below. No
                cream card behind it: Chart mode's wrapper background is
                transparent (see the wrapper comment above), so this sits
                directly on the panel's teal image, matching the left
                panel's Chart state.

                WIDTH: `min(85cqw, 85cqh)` (wheel-fixes follow-up) — 85% of
                the panel's own width or height, whichever is smaller, using
                CSS container query units against the root div's
                `containerType: 'size'` (set where this component returns,
                above). Keying off the ROOT div rather than this Chart-mode
                wrapper matters: the Header+Body+Footer wrapper in between
                has `padding: '0 3%'` (needed for the List-mode card's
                text, applied in Chart mode too), so cqw/cqh measured from
                anything inside it would already be 94% of the true panel
                width — measuring from the root sidesteps that padding
                entirely rather than needing to cancel it out with a
                correction factor. This also fixes overflow on a short
                window: a plain width-percentage (the prior version) never
                shrinks for reduced height, so the wheel would run into the
                header/footer; `min(...cqh)` catches that. The My Chart
                panel's wheel (left, HomeMyChartPanel.tsx) uses the same
                `min(85cqw, 85cqh)` pattern off its own root, so both stay
                the same diameter — confirmed by measuring both rendered
                wheels across several viewport sizes, not just the CSS. */}
            {positions && (
              <div style={{ width: 'min(85cqw, 85cqh)', aspectRatio: '1' }}>
                <TodaySkyWheel positions={positions} aspects={aspects ?? []} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — sized to hug the button (`flex: '0 0 auto'`, not a
          reserved percentage band), so the card's bottom edge ends right
          around the button's own bottom edge, not partway through a
          bigger empty band below it (home-page-polish task, §16, fourth
          follow-up — Avery wants the card's bottom edge AT the button's
          bottom, with the real breathing room living outside the card as
          the reserved 2% teal margin instead, see the wrapper comment
          above). `padding: '16px 0'` gives the button normal click-target
          breathing room without the old 13%-tall reserved band. Inherits
          the wrapper's `padding: '0 3%'` horizontally, same as Header and
          Body, so the button still lines up with the card's edge. No Read
          button (transits hidden). */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 0' }}>
        <Link href={`/reading/${slug}/reference`} style={{
          padding: '10px 24px',
          border: '1px solid rgba(22,22,18,0.30)',
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(12px, 1vw, 14px)',
          letterSpacing: '0.5px',
          color: DARK,
          textDecoration: 'none',
        }}>
          Learn
        </Link>
      </div>

      </div>
    </div>
  );
}
