import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0e0c1a',
      backgroundImage: 'url(https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sky-background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: '14px',
          color: 'rgba(185,18,18,0.75)',
          letterSpacing: '2px',
        }}>
          TEXTURE
        </div>
        <a
          href="mailto:help@gettexture.app"
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '11px',
            color: 'rgba(253,245,237,0.35)',
            letterSpacing: '1px',
            textDecoration: 'none',
          }}
        >
          help@gettexture.app
        </a>
      </header>

      {/* Hero */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 32px',
        gap: '40px',
        textAlign: 'center',
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>
          <h1 style={{
            fontFamily: 'var(--font-anton), sans-serif',
            fontSize: 'clamp(48px, 12vw, 88px)',
            color: 'rgba(253,245,237,0.95)',
            letterSpacing: '2px',
            lineHeight: 1,
          }}>
            TEXTURE
          </h1>
          <p style={{
            fontFamily: 'var(--font-questrial), sans-serif',
            fontSize: 'clamp(16px, 4vw, 20px)',
            color: 'rgba(253,245,237,0.65)',
            lineHeight: 1.6,
            letterSpacing: '-0.2px',
          }}>
            A personalized birth chart reading — your full chart interpreted in context, delivered as a permanent URL.
          </p>
        </div>

        {/* How it works */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '440px',
          width: '100%',
        }}>
          {[
            { step: '01', text: 'Order on Etsy and provide your birth data at checkout' },
            { step: '02', text: 'Receive a unique URL with your complete birth chart reading' },
            { step: '03', text: 'Return to it anytime — it\'s yours permanently' },
          ].map(({ step, text }) => (
            <div key={step} style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              textAlign: 'left',
            }}>
              <span style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '11px',
                color: 'rgba(185,18,18,0.75)',
                letterSpacing: '1px',
                flexShrink: 0,
                paddingTop: '2px',
              }}>
                {step}
              </span>
              <span style={{
                fontFamily: 'var(--font-questrial), sans-serif',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                color: 'rgba(253,245,237,0.55)',
                lineHeight: 1.6,
                letterSpacing: '-0.2px',
              }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href="https://etsy.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '13px',
            letterSpacing: '2px',
            color: '#FDF5ED',
            backgroundColor: 'rgba(185,18,18,0.75)',
            padding: '16px 40px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          ORDER ON ETSY →
        </a>

        <p style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: '11px',
          color: 'rgba(253,245,237,0.20)',
          letterSpacing: '1px',
        }}>
          $25 · One-time purchase · No subscription
        </p>

      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px 32px',
        borderTop: '0.5px solid rgba(253,245,237,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: '11px',
          color: 'rgba(253,245,237,0.20)',
          letterSpacing: '1px',
        }}>
          © 2026 TEXTURE
        </span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/privacy" style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '11px',
            color: 'rgba(253,245,237,0.25)',
            letterSpacing: '1px',
            textDecoration: 'none',
          }}>
            PRIVACY
          </Link>
          <Link href="/terms" style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '11px',
            color: 'rgba(253,245,237,0.25)',
            letterSpacing: '1px',
            textDecoration: 'none',
          }}>
            TERMS
          </Link>
          <a href="mailto:help@gettexture.app" style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '11px',
            color: 'rgba(253,245,237,0.25)',
            letterSpacing: '1px',
            textDecoration: 'none',
          }}>
            SUPPORT
          </a>
        </div>
      </footer>

    </div>
  );
}
