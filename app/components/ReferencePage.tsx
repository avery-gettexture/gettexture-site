'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ReferenceEntry {
  category: string;
  name: string;
  description: string;
}

const SIGN_ORDER = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const HOUSE_ORDER = [
  '1st House','2nd House','3rd House','4th House','5th House','6th House',
  '7th House','8th House','9th House','10th House','11th House','12th House',
];

const PLANET_ORDER = [
  'Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn',
  'Uranus','Neptune','Pluto','Ascendant','Midheaven','North Node','South Node',
];

const MOTION_ORDER = ['Direct','Retrograde'];
const DEGREE_ORDER = ['Early','Middle','Late'];
const ASPECT_ORDER = ['Conjunction','Sextile','Square','Trine','Opposition'];

type SectionKey = 'signs' | 'houses' | 'planets' | 'motion' | 'degree' | 'aspects' | 'support';

function CollapsibleSection({
  title,
  entries,
  instanceLines,
  isOpen,
  onToggle,
}: {
  title: string;
  entries: ReferenceEntry[];
  instanceLines?: Record<string, string[]>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const headerRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    onToggle();
    if (!isOpen) {
      setTimeout(() => {
        headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  return (
    <div style={{ borderBottom: '0.5px solid rgba(22,22,18,0.10)' }}>
      <div
        ref={headerRef}
        onClick={handleToggle}
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
        <div style={{ padding: '0 4px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {entries.map((entry, i) => (
            <div key={i}>
              {instanceLines?.[entry.name]?.map((line, j) => (
                <div key={j} style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 'clamp(10px, 2.6vw, 11px)',
                  color: 'rgba(22,22,18,0.35)',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}>
                  {line}
                </div>
              ))}
              <div style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 'clamp(10px, 2.6vw, 11px)',
                color: 'rgba(22,22,18,0.35)',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                {entry.name}
              </div>
              <p style={{
                fontFamily: 'var(--font-questrial), sans-serif',
                fontSize: 'clamp(13px, 3.6vw, 15px)',
                color: 'rgba(22,22,18,0.70)',
                lineHeight: '1.7',
                letterSpacing: '-0.2px',
              }}>
                {entry.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReferencePage() {
  const [allEntries, setAllEntries] = useState<ReferenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const toggle = (key: SectionKey) =>
    setOpenSection(prev => prev === key ? null : key);

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

  const byCategory = (category: string) =>
    allEntries.filter(e => e.category === category);

  const ordered = (entries: ReferenceEntry[], order: string[]) =>
    order
      .map(name => entries.find(e => e.name === name))
      .filter(Boolean) as ReferenceEntry[];

  const signs   = ordered(byCategory('sign'),   SIGN_ORDER);
  const houses  = [
    ...ordered(byCategory('house'), HOUSE_ORDER),
    ...byCategory('occupied').filter(e => e.name === 'Empty House'),
  ];
  const planets = ordered(byCategory('planet'), PLANET_ORDER);
  const motion  = ordered(byCategory('motion'), MOTION_ORDER);
  const degree  = ordered(byCategory('degree'), DEGREE_ORDER);
  const aspects = ordered(byCategory('aspect'), ASPECT_ORDER);

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
            <CollapsibleSection title="Signs"   entries={signs}   isOpen={openSection === 'signs'}   onToggle={() => toggle('signs')} />
            <CollapsibleSection title="Houses"  entries={houses}  isOpen={openSection === 'houses'}  onToggle={() => toggle('houses')} />
            <CollapsibleSection title="Planets" entries={planets} isOpen={openSection === 'planets'} onToggle={() => toggle('planets')} />
            <CollapsibleSection title="Motion"  entries={motion}  isOpen={openSection === 'motion'}  onToggle={() => toggle('motion')} />
            <CollapsibleSection title="Degree"  entries={degree}  isOpen={openSection === 'degree'}  onToggle={() => toggle('degree')} />
            <CollapsibleSection title="Aspects" entries={aspects} isOpen={openSection === 'aspects'} onToggle={() => toggle('aspects')} />
            
            {/* Support row */}
            <div style={{ borderBottom: '0.5px solid rgba(22,22,18,0.10)' }}>
              <div
                onClick={() => toggle('support')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(14px, 3.8vw, 16px)', color: '#161612', letterSpacing: '-0.2px' }}>Support</span>
                <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(12px, 3vw, 14px)', color: 'rgba(22,22,18,0.35)' }}>{openSection === 'support' ? '−' : '+'}</span>
              </div>
              {openSection === 'support' && (
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
