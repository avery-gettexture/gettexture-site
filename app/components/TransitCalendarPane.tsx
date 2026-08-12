'use client';

import { useState } from 'react';

// The CALENDAR state of the desktop transits page (SPEC §16). Structure
// only, per docs/mocks/transits-calendar.png and
// docs/TEXTURE_LAYOUT_PROPORTIONS.md's "Aspects & Events / Calendar panel"
// section — the founder's brief is explicit that DATA/content here is a
// placeholder for now ("structure over content"); the real filtering,
// sorting, and live timeline entries are a later task. This pane renders
// INSIDE the same cream reading-zone-card the READ pane uses (unlike the
// CHART pane, which has no cream card) — the caller supplies that framing.

const PLACEHOLDER_ENTRIES = [
  { id: 'newest', label: 'Newest', sideLabel: '(Soonest)' },
  { id: 'mid-1', label: null, sideLabel: null },
  { id: 'mid-2', label: null, sideLabel: null },
  { id: 'oldest', label: 'Oldest', sideLabel: '(Latest)' },
];

function formatToday(): string {
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

export default function TransitCalendarPane() {
  // Current/Upcoming is wired as a real toggle for the visual active-state
  // affordance (matching every other toggle in the app), but it drives no
  // data yet — both tabs render the same placeholder timeline. Real
  // filtering is later work, per the brief.
  const [tab, setTab] = useState<'current' | 'upcoming'>('current');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 8px 12px' }}>

      {/* Header: date + title, mirrors card-header's red rule convention. */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(11px, 1.2vw, 14px)',
          color: 'rgba(22,22,18,0.45)',
          letterSpacing: '0.5px',
        }}>
          {formatToday()}
        </div>
        <h1 className="planet-name" style={{ marginTop: '6px' }}>Aspects and Events</h1>
        <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', marginTop: '10px' }} />
      </div>

      {/* Controls row: Current/Upcoming (left) + Filter/links (right). */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: '18px',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 'clamp(12px, 1.1vw, 14px)',
        letterSpacing: '0.5px',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span
            onClick={() => setTab('current')}
            style={{
              cursor: 'pointer',
              color: tab === 'current' ? 'var(--dark)' : 'rgba(22,22,18,0.40)',
              fontWeight: tab === 'current' ? 700 : 400,
            }}
          >
            Current
          </span>
          <span
            onClick={() => setTab('upcoming')}
            style={{
              cursor: 'pointer',
              color: tab === 'upcoming' ? 'var(--dark)' : 'rgba(22,22,18,0.40)',
              fontWeight: tab === 'upcoming' ? 700 : 400,
            }}
          >
            Upcoming
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', color: 'rgba(22,22,18,0.55)' }}>
          <span style={{ cursor: 'default' }}>Filter ⌄</span>
          <span style={{ cursor: 'default', color: 'rgba(22,22,18,0.40)' }}>Aspects to My Chart</span>
          <span style={{ cursor: 'default', color: 'rgba(22,22,18,0.40)' }}>Sky Aspects</span>
        </div>
      </div>

      {/* Vertical timeline axis — placeholder entries only, per the brief.
          Top = Newest (Current) / Soonest (Upcoming); bottom = Oldest
          (Current) / Latest (Upcoming), per
          docs/TEXTURE_LAYOUT_PROPORTIONS.md's "Aspects & Events" ordering
          rule. */}
      <div style={{ flex: 1, minHeight: 0, marginTop: '24px', position: 'relative', paddingLeft: '24px' }}>
        <div style={{
          position: 'absolute',
          left: '4px',
          top: '4px',
          bottom: '4px',
          width: '1px',
          background: 'rgba(22,22,18,0.20)',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          {PLACEHOLDER_ENTRIES.map(entry => (
            <div key={entry.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '20px' }}>
              <span style={{
                position: 'absolute',
                left: '-24px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'rgba(22,22,18,0.30)',
              }} />
              {entry.label && (
                <span style={{
                  fontFamily: 'var(--font-questrial), sans-serif',
                  fontSize: 'clamp(12px, 1.1vw, 14px)',
                  color: 'rgba(22,22,18,0.55)',
                }}>
                  {entry.label}
                </span>
              )}
              {entry.sideLabel && (
                <span style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 'clamp(11px, 1vw, 13px)',
                  color: 'rgba(22,22,18,0.35)',
                }}>
                  {entry.sideLabel}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
