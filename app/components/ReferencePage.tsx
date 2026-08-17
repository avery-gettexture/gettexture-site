'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { REFERENCE_TAXONOMY, splitParagraphs, type ReferenceCategory } from '@/lib/reference-taxonomy';
import type { ReferenceEntry } from '@/lib/reference-utils';

function EntryRow({ entry, isOpen, onToggle }: { entry: ReferenceEntry; isOpen: boolean; onToggle: () => void }) {
  return (
    <div>
      <div
        onClick={onToggle}
        style={{
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
        <span style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(12px, 3vw, 14px)',
          color: 'rgba(22,22,18,0.35)',
        }}>
          {isOpen ? '−' : '+'}
        </span>
      </div>
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
      <div
        onClick={onToggle}
        style={{
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
        <span style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(12px, 3vw, 14px)',
          color: 'rgba(22,22,18,0.35)',
        }}>
          {isOpen ? '−' : '+'}
        </span>
      </div>

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
      {/* Header */}
      <div style={{
        flexShrink: 0,
        padding: '16px 20px 12px',
        borderBottom: '1.5px solid rgba(185,18,18,0.50)',
      }}>
        <div style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(28px, 8vw, 40px)',
          color: '#161612',
          letterSpacing: '1px',
        }}>
          Reference
        </div>
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
            {REFERENCE_TAXONOMY.map(category => (
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

            {/* Support row */}
            <div style={{ borderBottom: '0.5px solid rgba(22,22,18,0.10)' }}>
              <div
                onClick={() => toggleCategory('support')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(14px, 3.8vw, 16px)', color: '#161612', letterSpacing: '-0.2px' }}>Support</span>
                <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(12px, 3vw, 14px)', color: 'rgba(22,22,18,0.35)' }}>{openCategory === 'support' ? '−' : '+'}</span>
              </div>
              {openCategory === 'support' && (
                <div style={{ padding: '0 4px 24px' }}>
                  <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(13px, 3.6vw, 15px)', color: 'rgba(22,22,18,0.70)', lineHeight: '1.7', letterSpacing: '-0.2px' }}>
                    Privacy policy, data deletion requests, and general information about Texture are available at{' '}
                    <a href="https://gettexture.app" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)', textDecoration: 'underline' }}>gettexture.app</a>.
                  </p>
                </div>
              )}
            </div>

            {/* Copyright */}
            <div style={{ padding: '20px 4px 8px', textAlign: 'center', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.25)', letterSpacing: '1px' }}>
              © 2026 TEXTURE
            </div>
          </>
        )}
      </div>
    </div>
  );
}
