'use client';

// Desktop Reference page (SPEC §16, Part 2 of the reference-dictionary
// rewrite) — replaces the Phase 2 placeholder shell. Follows the natal
// page's ("My Chart") reading-pane pattern: rail on the left, a cream
// reading-pane card on the right bounded top and bottom by the two red
// bars (.card-header's border-bottom, .card-footer's border-top), with an
// accordion inside. Unlike the natal page, there's no scroll-snap between
// sections — the rail just selects which category's content the one
// reading pane shows, so none of DesktopNatal's IntersectionObserver /
// wheel-forwarding machinery is needed here.

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { REFERENCE_TAXONOMY, splitParagraphs } from '@/lib/reference-taxonomy';
import type { ReferenceEntry } from '@/lib/reference-utils';
import ReadingLayout from '@/app/components/ReadingLayout';
import CategoryRail from '@/app/components/CategoryRail';
import MobileNavShell from '@/app/components/MobileNavShell';
import ReferencePage from '@/app/components/ReferencePage';

// ── Mobile (SPEC §16, "mobile reference relocation") ────────────────────────
// The reference dictionary screen already existed and worked on mobile as
// the last section of `/reading/[slug]/natal` — this reuses that exact
// screen (same classes, same <ReferencePage/>) rather than adapting the
// desktop rail/category view below to small widths. Two differences from
// the natal version, both founder-confirmed: the old top-left "TEXTURE"
// wordmark (jumped back to the planet list) and the "↑" arrow (scrolled to
// the previous placement) are dropped — neither has a destination on a
// standalone page, and the wordmark sat exactly where the new nav bar's
// "Menu" button now sits. No replacement wordmark is added on the card
// itself — MobileNavShell already renders its own "TEXTURE" wordmark
// top-right (linking home).
//
// Full-bleed fix (SPEC §16, Aug 31 2026): this used to sit inside
// `.card-inner`, the shared class for the INSET-cream-rectangle-floating-
// over-a-background pattern (8% side margins, so it reads correctly on
// natal/transits, which really do have a background layer behind the
// card). Reference has no background layer — it's full-bleed cream, same
// as the mobile List views — so that inset was just dead space on both
// sides. <ReferencePage/> already renders its own full-bleed
// `position:absolute; inset:0` box, so it's mounted directly here instead,
// and its own header padding (see ReferencePage.tsx) now reserves space
// for the fixed nav bar itself rather than relying on this wrapper's `top`
// offset.
function MobileReference({ slug }: { slug: string }) {
  return (
    <div className="reading-container" role="main">
      <MobileNavShell slug={slug} active="reference" />
      <div className="reading-section" style={{ background: 'var(--cream)' }}>
        <ReferencePage />
      </div>
    </div>
  );
}

function DesktopReference({ slug }: { slug: string }) {
  const [allEntries, setAllEntries] = useState<ReferenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState(REFERENCE_TAXONOMY[0].slug);
  const [openEntryName, setOpenEntryName] = useState<string | null>(null);

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

  const activeCategory = REFERENCE_TAXONOMY.find(c => c.slug === activeSlug)!;
  const entries = activeCategory.entryNames
    .map(name => allEntries.find(e => e.category === activeCategory.slug && e.name === name))
    .filter(Boolean) as ReferenceEntry[];

  return (
    <ReadingLayout
      slug={slug}
      active="reference"
      background="/sky-background.png"
      zoneBackground="/transits-background.png"
      rail={
        <CategoryRail
          activeSlug={activeSlug}
          onSelect={(next) => { setActiveSlug(next); setOpenEntryName(null); }}
        />
      }
    >
      {/* alignItems override (spacing-cleanup task): the shared .card-header
          class centers its content (used by other reading-pane headers,
          e.g. natal placement cards), but Reference's title should be
          left-aligned — scoped to this page only, same override pattern
          already used by the natal page's own header (SPEC §16). */}
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <h1 className="planet-name reference-title">{activeCategory.label}</h1>
        <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', alignSelf: 'stretch', marginTop: '0' }} />
      </div>

      <div className="reference-card-content">
        {loading ? (
          <p className="placeholder-text">Loading...</p>
        ) : activeCategory.slug === 'help' ? (
          <div>
            <button
              type="button"
              className="section-row"
              onClick={() => setOpenEntryName(openEntryName === 'Help' ? null : 'Help')}
              aria-expanded={openEntryName === 'Help'}
            >
              <span className="section-row-label">Help</span>
              <span className="section-row-chevron" aria-hidden="true">{openEntryName === 'Help' ? '−' : '+'}</span>
            </button>
            {openEntryName === 'Help' && (
              <div style={{ padding: '4px 4px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p className="body-text">
                  For data deletion requests or any other inquiries, contact{' '}
                  <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)', textDecoration: 'underline' }}>
                    help@gettexture.app
                  </a>.
                </p>
                <p className="body-text">
                  <a href="https://www.gettexture.app/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)', textDecoration: 'underline' }}>
                    Privacy Policy
                  </a>
                  {' · '}
                  <a href="https://www.gettexture.app/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)', textDecoration: 'underline' }}>
                    Terms &amp; Conditions
                  </a>
                </p>
              </div>
            )}
          </div>
        ) : (
          entries.map(entry => {
            const isOpen = openEntryName === entry.name;
            return (
              <div key={entry.name}>
                <button
                  type="button"
                  className="section-row"
                  onClick={() => setOpenEntryName(isOpen ? null : entry.name)}
                  aria-expanded={isOpen}
                >
                  <span className="section-row-label">{entry.name}</span>
                  <span className="section-row-chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 4px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {splitParagraphs(entry.description).map((para, i) => (
                      <p key={i} className="body-text">{para}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="card-footer" />
    </ReadingLayout>
  );
}

// ── Route entry point ────────────────────────────────────────────────────
// Desktop/mobile split, same matchMedia pattern already used by
// `app/reading/[slug]/natal/page.tsx` and `.../transits/page.tsx`.
export default function ReferenceHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (isDesktop === null) {
    return (
      <div style={{ height: '100dvh', background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-anton)', fontSize: '14px', color: 'var(--red-strong)', letterSpacing: '4px' }}>TEXTURE</span>
      </div>
    );
  }

  return isDesktop ? <DesktopReference slug={slug} /> : <MobileReference slug={slug} />;
}
