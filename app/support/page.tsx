import Link from 'next/link';

export default function SupportPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF5ED', color: '#161612' }}>
      <header style={{ padding: '32px 48px', borderBottom: '1px solid rgba(22,22,18,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '16px', color: 'rgba(185,18,18,0.75)', letterSpacing: '2px', textDecoration: 'none' }}>TEXTURE</Link>
      </header>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '80px 48px' }}>
        <h1 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(28px, 7vw, 40px)', letterSpacing: '1px', marginBottom: '32px' }}>Support</h1>
        <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '16px', color: 'rgba(22,22,18,0.70)', lineHeight: 1.7, marginBottom: '24px' }}>
          For questions about your reading, data deletion requests, or anything else, contact us at:
        </p>
        <a href="mailto:help@gettexture.app" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '16px', color: 'rgba(185,18,18,0.75)', letterSpacing: '1px' }}>
          help@gettexture.app
        </a>
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '0.5px solid rgba(22,22,18,0.10)', display: 'flex', gap: '24px' }}>
          <Link href="/privacy" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textDecoration: 'none' }}>PRIVACY</Link>
          <Link href="/terms" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textDecoration: 'none' }}>TERMS</Link>
        </div>
      </div>
    </div>
  );
}
