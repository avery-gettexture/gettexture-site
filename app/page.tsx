import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FDF5ED',
      color: '#161612',
      fontFamily: 'var(--font-questrial), sans-serif',
    }}>

      {/* Header */}
      <header style={{
        padding: '32px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(22,22,18,0.10)',
      }}>
        <span style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: '20px',
          color: 'rgba(185,18,18,0.75)',
          letterSpacing: '0.06em',
        }}>
          TEXTURE
        </span>
        <a href="mailto:help@gettexture.app" style={{
          fontSize: '13px',
          color: 'rgba(22,22,18,0.45)',
          textDecoration: 'none',
          letterSpacing: '0.04em',
        }}>
          help@gettexture.app
        </a>
      </header>

      {/* Hero */}
      <section style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '100px 48px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          margin: '0 auto 48px',
          width: '88px',
          height: '88px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#0e0c1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(14,12,26,0.18)',
        }}>
          <span style={{
            fontFamily: 'var(--font-anton), sans-serif',
            fontSize: '28px',
            color: 'rgba(185,18,18,0.75)',
            letterSpacing: '0.06em',
          }}>T</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(42px, 8vw, 72px)',
          color: 'rgba(185,18,18,0.75)',
          letterSpacing: '0.04em',
          lineHeight: 1,
          marginBottom: '32px',
        }}>
          TEXTURE
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 19px)',
          color: '#161612',
          lineHeight: 1.7,
          maxWidth: '520px',
          margin: '0 auto 48px',
        }}>
          Your chart is a map of one specific moment in the sky. Thousands of years of observation went into understanding what that moment means.{' '}
          <span style={{ color: 'rgba(185,18,18,0.75)' }}>This is your texture.</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <a
            href="https://etsy.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: '#161612',
              color: '#FDF5ED',
              borderRadius: '12px',
              padding: '14px 28px',
              textDecoration: 'none',
              fontFamily: 'var(--font-anton), sans-serif',
              fontSize: '17px',
              letterSpacing: '0.04em',
            }}
          >
            Order on Etsy
          </a>
          <span style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', letterSpacing: '0.06em' }}>
            $25 · One-time purchase · No subscription
          </span>
        </div>
      </section>

      <div style={{ width: '1px', height: '80px', background: 'rgba(22,22,18,0.10)', margin: '0 auto' }} />

      {/* What it is */}
      <section style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '80px 48px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(22,22,18,0.70)', lineHeight: 1.75, maxWidth: '520px', margin: '0 auto 24px' }}>
          A chart is a woven system. All placements are in conversation with each other, but most astrology reads them in isolation — your Sun sign, your Moon sign, each one separately. Texture reads the whole cloth.
        </p>
        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(22,22,18,0.70)', lineHeight: 1.75, maxWidth: '520px', margin: '0 auto' }}>
          AI makes that possible: interpretations generated from your specific chart, in full context, just for you. Sign, house, degree, motion, and aspects — all considered together.
        </p>
      </section>

      {/* Features */}
      <section style={{
        borderTop: '1px solid rgba(22,22,18,0.10)',
        borderBottom: '1px solid rgba(22,22,18,0.10)',
        padding: '80px 48px',
      }}>
        <div style={{
          maxWidth: '680px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '48px 64px',
        }}>
          {[
            {
              label: 'Personalized Interpretations',
              text: 'Each interpretation is generated in full context of your chart — sign, house, degree, motion, and aspects all considered together. No shared content, no generic readings.',
            },
            {
              label: 'No Birth Time? No Problem',
              text: "Don't know your birth time? You still get a full experience — house placements are simply excluded. Interpretations automatically adjust to what's known.",
            },
            {
              label: 'Permanent URL',
              text: 'Your reading lives at a unique URL — yours to keep and return to anytime. No account required, no subscription, no expiration.',
            },
            {
              label: 'Fourteen Placements',
              text: 'Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Ascendant, Midheaven, North Node, South Node — each interpreted in full context.',
            },
          ].map(({ label, text }) => (
            <div key={label}>
              <div style={{
                fontSize: '11px',
                letterSpacing: '0.10em',
                color: 'rgba(185,18,18,0.75)',
                marginBottom: '8px',
                textTransform: 'uppercase' as const,
                fontFamily: 'var(--font-questrial), sans-serif',
              }}>
                {label}
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(22,22,18,0.65)', lineHeight: 1.65 }}>
                {text}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '80px 48px', textAlign: 'center' }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '0.10em',
          color: 'rgba(22,22,18,0.45)',
          textTransform: 'uppercase' as const,
          marginBottom: '40px',
        }}>
          How it works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '420px', margin: '0 auto 48px', border: '1px solid rgba(22,22,18,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
          {[
            { step: '01', text: 'Order on Etsy and provide your name, birth date, birth time, and birth location at checkout' },
            { step: '02', text: 'Receive a unique URL with your complete personalized birth chart reading' },
            { step: '03', text: 'Return to it anytime — your reading is permanent and belongs to you' },
          ].map(({ step, text }, i) => (
            <div key={step} style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              padding: '24px',
              borderBottom: i < 2 ? '1px solid rgba(22,22,18,0.10)' : 'none',
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
              <span style={{ fontSize: '14px', color: 'rgba(22,22,18,0.65)', lineHeight: 1.6 }}>
                {text}
              </span>
            </div>
          ))}
        </div>
        <a
          href="https://etsy.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: '#161612',
            color: '#FDF5ED',
            borderRadius: '12px',
            padding: '14px 28px',
            textDecoration: 'none',
            fontFamily: 'var(--font-anton), sans-serif',
            fontSize: '17px',
            letterSpacing: '0.04em',
          }}
        >
          Order on Etsy
        </a>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(22,22,18,0.10)',
        padding: '32px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        gap: '16px',
      }}>
        <span style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: '14px',
          color: 'rgba(185,18,18,0.75)',
          letterSpacing: '0.06em',
        }}>
          TEXTURE
        </span>
        <div style={{ display: 'flex', gap: '28px' }}>
          <Link href="/privacy" style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', textDecoration: 'none', letterSpacing: '0.04em' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', textDecoration: 'none', letterSpacing: '0.04em' }}>Terms of Use</Link>
          <a href="mailto:help@gettexture.app" style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', textDecoration: 'none', letterSpacing: '0.04em' }}>Support</a>
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', width: '100%' }}>
          © 2026 Texture LLC · Long Beach, California
        </span>
      </footer>

    </div>
  );
}
