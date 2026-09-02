'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { REFERENCE_TAXONOMY, splitParagraphs, type ReferenceCategory } from '@/lib/reference-taxonomy';
import type { ReferenceEntry } from '@/lib/reference-utils';
import { UNSTYLED_BUTTON } from '@/lib/a11y';

function EntryRow({ entry, isOpen, onToggle }: { entry: ReferenceEntry; isOpen: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          ...UNSTYLED_BUTTON,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(10px, 2.6vw, 11px)',
          color: 'rgba(22,22,18,0.35)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}>
          {entry.name}
        </span>
        <span aria-hidden="true" style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(12px, 3vw, 14px)',
          color: 'rgba(22,22,18,0.35)',
        }}>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div style={{ paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {splitParagraphs(entry.description).map((para, i) => (
            <p key={i} style={{
              fontFamily: 'var(--font-questrial), sans-serif',
              fontSize: 'clamp(13px, 3.6vw, 15px)',
              color: 'rgba(22,22,18,0.70)',
              lineHeight: '1.7',
              letterSpacing: '-0.2px',
            }}>
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  title,
  entries,
  isOpen,
  onToggle,
  openEntryName,
  onToggleEntry,
}: {
  title: string;
  entries: ReferenceEntry[];
  isOpen: boolean;
  onToggle: () => void;
  openEntryName: string | null;
  onToggleEntry: (name: string) => void;
}) {
  return (
    <div style={{ borderBottom: '0.5px solid rgba(22,22,18,0.10)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          ...UNSTYLED_BUTTON,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 4px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-questrial), sans-serif',
          fontSize: 'clamp(14px, 3.8vw, 16px)',
          color: '#161612',
          letterSpacing: '-0.2px',
        }}>
          {title}
        </span>
        <span aria-hidden="true" style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(12px, 3vw, 14px)',
          color: 'rgba(22,22,18,0.35)',
        }}>
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 4px 12px', display: 'flex', flexDirection: 'column' }}>
          {entries.map(entry => (
            <EntryRow
              key={entry.name}
              entry={entry}
              isOpen={openEntryName === entry.name}
              onToggle={() => onToggleEntry(entry.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReferencePage() {
  const [allEntries, setAllEntries] = useState<ReferenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openEntryName, setOpenEntryName] = useState<string | null>(null);

  const toggleCategory = (slug: string) => {
    setOpenCategory(prev => (prev === slug ? null : slug));
    setOpenEntryName(null);
  };
  const toggleEntry = (name: string) =>
    setOpenEntryName(prev => (prev === name ? null : name));

  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from('reference_content')
        .select('category, name, description')
        .eq('version', 1);
      if (!error && data) setAllEntries(data);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const entriesFor = (category: ReferenceCategory) =>
    category.entryNames
      .map(name => allEntries.find(e => e.category === category.slug && e.name === name))
      .filter(Boolean) as ReferenceEntry[];

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--cream)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header — top padding clears the fixed MobileNavShell bar (56px +
          safe-area-inset-top) plus a small buffer, then sits close beneath
          it (SPEC §16, Aug 31 2026 title-position fix), matching how
          "Placements" sits close under the header on the mobile List
          views (ChartSection.tsx's HEADER_ZONE_HEIGHT). */}
      <div style={{
        flexShrink: 0,
        padding: 'calc(56px + env(safe-area-inset-top) + 10px) 20px 12px',
        borderBottom: '1.5px solid rgba(185,18,18,0.50)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(28px, 8vw, 40px)',
          color: '#161612',
          letterSpacing: '1px',
        }}>
          Reference
        </h1>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 20px',
        scrollbarWidth: 'none',
      }}>
        {loading ? (
          <div style={{ padding: '24px 0', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px', color: 'rgba(22,22,18,0.30)', letterSpacing: '1px' }}>
            LOADING
          </div>
        ) : (
          <>
            {/* 'help' is excluded here — it has no reference_content DB row
                (its content is live links, not DB text) and is instead
                rendered by the hardcoded Help row below. */}
            {REFERENCE_TAXONOMY.filter(category => category.slug !== 'help').map(category => (
              <CategorySection
                key={category.slug}
                title={category.label}
                entries={entriesFor(category)}
                isOpen={openCategory === category.slug}
                onToggle={() => toggleCategory(category.slug)}
                openEntryName={openEntryName}
                onToggleEntry={toggleEntry}
              />
            ))}

            {/* Help row — SPEC §16 hide-transits pass: relabeled from the
                prior "Support" row and given the same copy as desktop's
                new Help category (app/reading/[slug]/reference/page.tsx),
                so both surfaces match. */}
            <div style={{ borderBottom: '0.5px solid rgba(22,22,18,0.10)' }}>
              <button
                type="button"
                onClick={() => toggleCategory('help')}
                aria-expanded={openCategory === 'help'}
                style={{ ...UNSTYLED_BUTTON, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(14px, 3.8vw, 16px)', color: '#161612', letterSpacing: '-0.2px' }}>Help</span>
                <span aria-hidden="true" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(12px, 3vw, 14px)', color: 'rgba(22,22,18,0.35)' }}>{openCategory === 'help' ? '−' : '+'}</span>
              </button>
              {openCategory === 'help' && (
                <div style={{ padding: '0 4px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(13px, 3.6vw, 15px)', color: 'rgba(22,22,18,0.70)', lineHeight: '1.7', letterSpacing: '-0.2px' }}>
                    For data deletion requests or any other inquiries, contact{' '}
                    <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)', textDecoration: 'underline' }}>help@gettexture.app</a>.
                  </p>
                  <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(13px, 3.6vw, 15px)', color: 'rgba(22,22,18,0.70)', lineHeight: '1.7', letterSpacing: '-0.2px' }}>
                    <a href="https://www.gettexture.app/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)', textDecoration: 'underline' }}>Privacy Policy</a>
                    {' · '}
                    <a href="https://www.gettexture.app/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)', textDecoration: 'underline' }}>Terms &amp; Conditions</a>
                  </p>
                </div>
              )}
            </div>

            {/* Copyright. WCAG AA contrast fix (a11y Phase 2, SPEC §16): was 0.25 (1.72:1 on cream); 0.68 measures ~6:1. */}
            <div style={{ padding: '20px 4px 8px', textAlign: 'center', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.68)', letterSpacing: '1px' }}>
              © 2026 TEXTURE
            </div>
          </>
        )}
      </div>
    </div>
  );
}
