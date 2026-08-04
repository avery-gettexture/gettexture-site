'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

export default function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = use(searchParams);
  const [readingUrl, setReadingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.session_id) { setLoading(false); return; }
    // Poll Supabase for the reading created by this session
    async function findReading() {
      const res = await fetch(`/api/reading-by-session?session_id=${params.session_id}`);
      const data = await res.json();
      if (data.slug) {
        setReadingUrl(`/reading/${data.slug}/natal`);
        setLoading(false);
      } else {
        setTimeout(findReading, 2000);
      }
    }
    findReading();
  }, [params.session_id]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF5ED', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '14px', color: 'rgba(185,18,18,0.75)', letterSpacing: '2px', marginBottom: '48px' }}>TEXTURE</div>

      {loading ? (
        <>
          <h1 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(28px, 7vw, 40px)', color: '#161612', letterSpacing: '1px', marginBottom: '16px' }}>
            Your reading is being prepared.
          </h1>
          <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '16px', color: 'rgba(22,22,18,0.55)', lineHeight: 1.6, maxWidth: '420px', marginBottom: '32px' }}>
            Content generation takes a few moments. Your reading link has been sent to your email — check your inbox shortly.
          </p>
          <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.30)', letterSpacing: '2px' }}>
            GENERATING...
          </div>
        </>
      ) : readingUrl ? (
        <>
          <h1 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(28px, 7vw, 40px)', color: '#161612', letterSpacing: '1px', marginBottom: '16px' }}>
            Your reading is on its way.
          </h1>
          <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '16px', color: 'rgba(22,22,18,0.55)', lineHeight: 1.6, maxWidth: '420px', marginBottom: '40px' }}>
            Your chart and placements list are ready now. Interpretations take a few minutes to generate — check back shortly and they'll be there. We've also sent this link to your email.
          </p>
          <Link href={readingUrl} style={{
            display: 'inline-block',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '13px',
            letterSpacing: '2px',
            color: '#FDF5ED',
            backgroundColor: 'rgba(185,18,18,0.75)',
            padding: '16px 36px',
            textDecoration: 'none',
          }}>
            VIEW YOUR READING →
          </Link>
        </>
      ) : (
        <>
          <h1 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(28px, 7vw, 40px)', color: '#161612', letterSpacing: '1px', marginBottom: '16px' }}>
            Something went wrong.
          </h1>
          <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '16px', color: 'rgba(22,22,18,0.55)', lineHeight: 1.6, maxWidth: '420px', marginBottom: '32px' }}>
            Your payment was received. Please contact <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a> and we'll sort it out immediately.
          </p>
        </>
      )}
    </div>
  );
}
