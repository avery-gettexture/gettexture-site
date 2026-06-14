import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF5ED', color: '#161612' }}>

      <header style={{ padding: '28px 40px', borderBottom: '0.5px solid rgba(22,22,18,0.10)' }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: '14px',
          color: 'rgba(185,18,18,0.75)',
          letterSpacing: '2px',
          textDecoration: 'none',
        }}>
          TEXTURE
        </Link>
      </header>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '60px 40px 100px' }}>

        <h1 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(28px, 7vw, 40px)', letterSpacing: '1px', marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', marginBottom: '48px' }}>
          Last updated June 14, 2026
        </p>

        <Section title="Overview">
          <p>This Privacy Policy describes how Texture LLC ("we," "us," or "our") collects, uses, and stores your personal information when you use our web-based birth chart reading service at gettexture.app.</p>
          <p>Questions or concerns? Contact us at <a href="mailto:help@gettexture.app">help@gettexture.app</a>.</p>
        </Section>

        <Section title="What We Collect">
          <p>When you purchase a reading, we collect and store the following information:</p>
          <ul>
            <li><strong>Name</strong> — as provided at order time</li>
            <li><strong>Birth date</strong> — used to calculate your natal chart</li>
            <li><strong>Birth time</strong> — used to calculate house placements and the Ascendant</li>
            <li><strong>Birth location</strong> — city and country, used for chart calculation</li>
            <li><strong>Geographic coordinates</strong> — latitude and longitude derived from your birth location</li>
            <li><strong>Email address</strong> — used to deliver your reading URL</li>
          </ul>
          <p>We do not collect payment information. Payments are processed by Etsy and their payment processors. We do not have access to your payment details.</p>
        </Section>

        <Section title="How We Use Your Information">
          <p>Your information is used exclusively to generate and deliver your personalized birth chart reading. Specifically:</p>
          <ul>
            <li>Birth date, time, and location are used to calculate your natal chart</li>
            <li>Chart data is sent to Anthropic to generate your personalized interpretations</li>
            <li>Your name is displayed within your reading</li>
            <li>Your email is used to send you your reading URL</li>
          </ul>
          <p>We do not use your information for marketing, advertising, or any purpose beyond delivering your reading.</p>
        </Section>

        <Section title="Data Storage">
          <p>Your personal information — name, birth data, email, and generated reading content — is stored in our database hosted by Supabase (supabase.com), a cloud infrastructure provider. Your reading is stored indefinitely so you can access it at any time via your permanent URL.</p>
          <p>To request deletion of your data, contact us at <a href="mailto:help@gettexture.app">help@gettexture.app</a>. We will delete your record within 30 days.</p>
        </Section>

        <Section title="Third-Party Services">
          <p>We use the following third-party services to deliver your reading:</p>
          <ul>
            <li><strong>Vercel</strong> (vercel.com) — hosts our web application and processes chart calculation requests. Birth data transmitted for chart calculation is not retained by Vercel.</li>
            <li><strong>Anthropic</strong> (anthropic.com) — generates your personalized interpretations from your chart data. Data transmitted to Anthropic is not linked to your identity and is not retained by Anthropic.</li>
            <li><strong>Supabase</strong> (supabase.com) — stores your reading data as described above.</li>
          </ul>
        </Section>

        <Section title="Your Rights">
          <p>Depending on where you are located, you may have rights including:</p>
          <ul>
            <li>The right to access the personal data we hold about you</li>
            <li>The right to request correction of inaccurate data</li>
            <li>The right to request deletion of your data</li>
            <li>The right to data portability</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:help@gettexture.app">help@gettexture.app</a>.</p>
        </Section>

        <Section title="Children">
          <p>Our service is intended for users 18 years of age or older. We do not knowingly collect data from children under 18. If you believe we have collected data from a minor, contact us at <a href="mailto:help@gettexture.app">help@gettexture.app</a>.</p>
        </Section>

        <Section title="Changes to This Policy">
          <p>We may update this policy from time to time. The updated version will be indicated by the "Last updated" date at the top of this page.</p>
        </Section>

        <Section title="Contact">
          <p>Texture LLC<br />Long Beach, California, United States<br /><a href="mailto:help@gettexture.app">help@gettexture.app</a></p>
        </Section>

      </div>

      <footer style={{ padding: '24px 40px', borderTop: '0.5px solid rgba(22,22,18,0.10)', display: 'flex', gap: '24px' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textDecoration: 'none' }}>HOME</Link>
        <Link href="/terms" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textDecoration: 'none' }}>TERMS</Link>
      </footer>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: '11px',
        color: 'rgba(22,22,18,0.35)',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '0.5px solid rgba(22,22,18,0.10)',
      }}>
        {title}
      </h2>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'var(--font-questrial), sans-serif',
        fontSize: 'clamp(14px, 3.5vw, 16px)',
        color: 'rgba(22,22,18,0.80)',
        lineHeight: 1.7,
        letterSpacing: '-0.2px',
      }}>
        {children}
      </div>
    </div>
  );
}
