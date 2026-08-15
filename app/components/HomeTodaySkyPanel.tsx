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
// right panel's List-mode header+lists sit on a cream rectangle laid over
// the panel's teal background image — so unlike the My Chart panel (light
// text directly on a dark image), List mode here is dark-on-cream. That
// card is CONTAINED (docs/mocks/homepage-variants.png): it stops after the
// Aspects & Events list, and the footer always sits outside it, directly on
// the teal image — matching the left panel's Read/Learn buttons, which
// never sit on a card either. Chart mode drops the cream card entirely
// (home-page-polish task, §16) and sits directly on the teal image instead,
// matching the left panel's Chart state.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import NatalChartWheelWeb from './NatalChartWheelWeb';
import { formatToday, formatContextualDate, parseLocalDate, getTodayLocalISODate } from '@/lib/date-utils';
import { RAIL_SIGN_GLYPHS, type Reading } from '@/app/reading/[slug]/natal/page';

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
  // Borrowed ONLY to feed the CHART-state placeholder wheel below — not
  // shown anywhere else on this panel. Same precedent as the Transits
  // page's own CHART pane (SPEC §16, Aug 11 entry): reuse the real natal
  // chart_data as a stand-in until the real Today's Sky wheel exists.
  const [chartReading, setChartReading] = useState<Pick<Reading, 'chart_data' | 'birth_time_known'> | null>(null);
  const [paneMode, setPaneMode] = useState<PaneMode>('list');

  useEffect(() => {
    supabase.rpc('get_current_sky_positions').then(({ data }) => setPositions((data as SkyPosition[]) ?? []));
    supabase.rpc('get_current_sky_aspects').then(({ data }) => setAspects((data as SkyAspect[]) ?? []));
    supabase.rpc('get_reading_by_slug', { p_slug: slug }).single().then(({ data }) => {
      if (data) setChartReading(data as Reading);
    });
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
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '0 3%' }}>

      {/* Header + Body wrapper — carries the cream card in List mode
          (matching docs/mocks/homepage-variants.png: the card wraps the
          date/toggle header and the two lists, but stops there — it does
          NOT extend down behind the footer). The footer sits outside this
          wrapper, always directly on the panel's teal image, same as the
          left panel's Read/Learn buttons never sitting on a card
          (home-page-polish task, §16 follow-up — original cream fill
          wrongly extended the full panel height, flush to the bottom).
          Chart mode drops the card entirely, same as before. */}
      <div style={{
        flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column',
        background: paneMode === 'list' ? 'var(--cream)' : 'transparent',
      }}>

      {/* Header ~10% of the wrapper (was 9% of the full panel before the
          footer moved outside the cream wrapper — home-page-polish task,
          §16: same top-anchored content, less reserved empty space before
          the body starts) */}
      <div style={{ flex: '0 0 10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {paneMode === 'list' ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

            {/* Current sky ~60% (swapped with Aspects & Events per Avery's
                request, home-page-polish task, §16 follow-up) */}
            <div style={{ flex: '0 0 60%', minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: '0.5px solid rgba(22,22,18,0.15)' }}>
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
                flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
                borderTop: '1px solid var(--red-rule)', borderBottom: '1px solid var(--red-rule)',
              }}>
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

            {/* Aspects & Events ~40% (swapped with Planets per Avery's
                request, home-page-polish task, §16 follow-up) */}
            <div style={{ flex: '1 1 40%', minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: '10px' }}>
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
                flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
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
            {/* STAND-IN ONLY — not the real Today's Sky wheel. Renders the
                natal wheel (borrowed chart_data) purely as a placeholder
                until a real no-birth-time "current sky" wheel is built
                (the very next task). Do not treat this as finished. */}
            <div style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 'clamp(10px, 0.9vw, 12px)',
              // DARK_FAINT was tuned for the cream card this sat on; Chart
              // mode no longer has one (item 4, home-page-polish task,
              // §16), so this needs to read against the teal panel image
              // instead — same faint-light treatment as the equivalent
              // placeholder text in TransitChartPane.tsx.
              color: 'rgba(253,245,237,0.55)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              Placeholder — Today&apos;s Sky wheel not yet built
            </div>
            {chartReading && (
              <div style={{ width: '75%', aspectRatio: '1' }}>
                <NatalChartWheelWeb chartData={chartReading.chart_data} birthTimeKnown={chartReading.birth_time_known} />
              </div>
            )}
          </div>
        )}
      </div>

      </div>
      {/* Footer ~13% — outside the cream wrapper (see comment above), always
          directly on the panel's teal image. No Read button (transits
          hidden). */}
      <div style={{ flex: '0 0 13%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
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
  );
}
