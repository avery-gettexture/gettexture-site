'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DOGFOOD_READING_SLUG } from '@/lib/config';

// ── Types ──────────────────────────────────────────────────────────────────

interface TransitBodyConfig {
  id: string;
  name: string;
  background: string;
}

interface TimelineEntry {
  id: string;
  prose: string;
}

interface TransitPieceRow {
  body: string;
  synthesis_prose: string;
  timeline_entries: TimelineEntry[];
  phase_opened_date: string;
}

// ── Body config ────────────────────────────────────────────────────────────
// Order per the build spec: Sun, Mercury, Venus, Mars, Jupiter, Saturn,
// Uranus, Neptune, Pluto, Nodes. No ASC/MC windows; Nodes is one window.

const TRANSIT_BODIES: TransitBodyConfig[] = [
  { id: 'sun',     name: 'Sun',     background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sun-background.png' },
  { id: 'mercury', name: 'Mercury', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mercury-background.png' },
  { id: 'venus',   name: 'Venus',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/venus-background.png' },
  { id: 'mars',    name: 'Mars',    background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/mars-background.png' },
  { id: 'jupiter', name: 'Jupiter', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/jupiter-background.png' },
  { id: 'saturn',  name: 'Saturn',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/saturn-background.png' },
  { id: 'uranus',  name: 'Uranus',  background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/uranus-background.png' },
  { id: 'neptune', name: 'Neptune', background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/neptune-background.png' },
  { id: 'pluto',   name: 'Pluto',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/pluto-background.png' },
  { id: 'nodes',   name: 'Nodes',   background: 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/nodes-background.png' },
];

const PLACEHOLDER_SYNTHESIS = 'This transit reading is being prepared. Check back shortly.';
const PLACEHOLDER_TIMELINE = 'Timeline entries will appear here once this piece is generated.';

// ── Body Card Component ─────────────────────────────────────────────────────

function TransitBodyCard({ body, customerName, piece }: { body: TransitBodyConfig; customerName: string; piece?: TransitPieceRow }) {
  return (
    <>
      <div className="card-outer" />
      <div className="card-inner">
        <div className="card-header">
          <h1 className="planet-name">{body.name}</h1>
          <p className="placeholder-text" style={{ fontSize: 'clamp(11px, 3.4vw, 14px)' }}>current phase — pending</p>
          <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '0' }} />
        </div>

        <div className="card-content">
          <div className="section-row" style={{ cursor: 'default' }}>
            <span className="section-row-label">Synthesis</span>
          </div>
          <div className="section-body">
            {piece ? (
              <p>{piece.synthesis_prose}</p>
            ) : (
              <p className="placeholder-text">{PLACEHOLDER_SYNTHESIS}</p>
            )}
          </div>

          <div className="section-divider" />

          <div className="section-row" style={{ cursor: 'default' }}>
            <span className="section-row-label">Timeline</span>
          </div>
          <div className="section-body">
            {piece ? (
              piece.timeline_entries.length > 0 ? (
                piece.timeline_entries.map(entry => <p key={entry.id}>{entry.prose}</p>)
              ) : (
                <p className="placeholder-text">No dated entries this phase.</p>
              )
            ) : (
              <p className="placeholder-text">{PLACEHOLDER_TIMELINE}</p>
            )}
          </div>
        </div>

        <div className="card-footer">
          <span className="card-name">{customerName}</span>
        </div>
      </div>
    </>
  );
}

// ── Main Transits Page ───────────────────────────────────────────────────────

export default function TransitsPage() {
  const slug = DOGFOOD_READING_SLUG;
  const [customerName, setCustomerName] = useState('');
  const [pieces, setPieces] = useState<Record<string, TransitPieceRow>>({});

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchName() {
      const { data } = await supabase
        .from('readings')
        .select('name')
        .eq('slug', slug)
        .single();
      if (data?.name) setCustomerName(data.name);
    }
    fetchName();
  }, [slug]);

  useEffect(() => {
    async function fetchPieces() {
      const { data } = await supabase
        .from('transit_pieces')
        .select('body, synthesis_prose, timeline_entries, phase_opened_date')
        .eq('reading_slug', slug)
        .order('phase_opened_date', { ascending: false });
      if (!data) return;
      // Keep only the newest row per body -- prior phase editions are kept
      // in the table (not overwritten), so this can return more than one
      // row per body over time.
      const byBody: Record<string, TransitPieceRow> = {};
      for (const row of data as TransitPieceRow[]) {
        if (!byBody[row.body]) byBody[row.body] = row;
      }
      setPieces(byBody);
    }
    fetchPieces();
  }, [slug]);

  const scrollToSection = useCallback((index: number) => {
    const section = sectionRefs.current[index];
    const container = containerRef.current;
    if (!section || !container) return;
    const top = section.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTo({ top, behavior: 'smooth' });
  }, []);

  return (
    <div className="reading-container" ref={containerRef}>
      {TRANSIT_BODIES.map((body, index) => (
        <div
          key={body.id}
          className="reading-section"
          ref={el => { sectionRefs.current[index] = el; }}
        >
          <div className="wordmark">TEXTURE</div>
          {index > 0 && (
            <button
              className="next-arrow"
              style={{ bottom: 'auto', top: '0.25%', color: 'rgba(253,245,237,0.50)' }}
              onClick={() => scrollToSection(index - 1)}
            >
              ↑
            </button>
          )}
          <div
            className="section-bg"
            style={{ backgroundImage: `url(${body.background})`, backgroundPosition: 'center center' }}
          />
          <TransitBodyCard body={body} customerName={customerName} piece={pieces[body.id]} />
          {index < TRANSIT_BODIES.length - 1 && (
            <button
              className="next-arrow"
              style={{ color: 'rgba(253,245,237,0.50)' }}
              onClick={() => scrollToSection(index + 1)}
            >
              ↓
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
