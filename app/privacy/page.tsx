import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF5ED', color: '#161612' }}>
      <header style={{ padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(22,22,18,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '20px', color: 'rgba(185,18,18,0.75)', letterSpacing: '0.06em', textDecoration: 'none' }}>TEXTURE</Link>
      </header>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 48px 100px', fontFamily: 'var(--font-questrial), sans-serif', fontSize: '15px', lineHeight: 1.7, color: 'rgba(22,22,18,0.85)' }}>

        <h1 style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '28px', fontWeight: 700, color: '#161612', marginBottom: '8px' }}>PRIVACY POLICY</h1>
        <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', color: 'rgba(22,22,18,0.40)', marginBottom: '48px' }}>Last updated June 14, 2026</p>

        <p style={{ marginBottom: '16px' }}>This Privacy Notice for Texture LLC ("we," "us," or "our") describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:</p>
        <ul style={{ margin: '12px 0 16px 24px' }}>
          <li style={{ marginBottom: '8px' }}>Visit our website at gettexture.app</li>
          <li style={{ marginBottom: '8px' }}>Use Texture. Texture is a web-based service that uses AI to generate personalized astrology interpretations based on your birth chart.</li>
          <li style={{ marginBottom: '8px' }}>Engage with us in other related ways, including any marketing or events</li>
        </ul>
        <p style={{ marginBottom: '32px' }}><strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>.</p>

        <H2>SUMMARY OF KEY POINTS</H2>
        <p style={{ marginBottom: '12px' }}><strong>What personal information do we process?</strong> We collect names, dates of birth, times of birth, locations of birth, geographic coordinates, and email addresses that you provide when ordering a reading.</p>
        <p style={{ marginBottom: '12px' }}><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</p>
        <p style={{ marginBottom: '12px' }}><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>
        <p style={{ marginBottom: '12px' }}><strong>How do we process your information?</strong> We process your information to provide astrological interpretations. Birth data is transmitted transiently to Vercel for chart calculation and to Anthropic for interpretation generation. Your personal data is stored in Supabase to enable permanent access to your reading.</p>
        <p style={{ marginBottom: '12px' }}><strong>How do we keep your information safe?</strong> We have implemented appropriate technical and organizational security measures. Your data is stored in a secured cloud database with access controls.</p>
        <p style={{ marginBottom: '32px' }}><strong>What are your rights?</strong> Depending on where you are located, you may have rights regarding your personal information. Contact us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a> to exercise your rights.</p>

        <H2>TABLE OF CONTENTS</H2>
        <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            '1. WHAT INFORMATION DO WE COLLECT?',
            '2. HOW DO WE PROCESS YOUR INFORMATION?',
            '3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?',
            '4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?',
            '5. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?',
            '6. HOW LONG DO WE KEEP YOUR INFORMATION?',
            '7. HOW DO WE KEEP YOUR INFORMATION SAFE?',
            '8. DO WE COLLECT INFORMATION FROM MINORS?',
            '9. WHAT ARE YOUR PRIVACY RIGHTS?',
            '10. CONTROLS FOR DO-NOT-TRACK FEATURES',
            '11. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?',
            '12. DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?',
            '13. THIRD-PARTY SERVICE PROVIDERS',
            '14. DO WE MAKE UPDATES TO THIS NOTICE?',
            '15. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?',
            '16. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?',
          ].map(item => (
            <div key={item} style={{ color: 'rgba(185,18,18,0.75)', fontSize: '14px' }}>{item}</div>
          ))}
        </div>

        <H2>1. WHAT INFORMATION DO WE COLLECT?</H2>
        <H3>Personal information you disclose to us</H3>
        <p style={{ marginBottom: '12px' }}>We collect personal information that you voluntarily provide to us when you order a reading. The personal information we collect includes:</p>
        <ul style={{ margin: '12px 0 16px 24px' }}>
          <li style={{ marginBottom: '8px' }}>Name</li>
          <li style={{ marginBottom: '8px' }}>Date of birth</li>
          <li style={{ marginBottom: '8px' }}>Time of birth</li>
          <li style={{ marginBottom: '8px' }}>Location of birth (city and country)</li>
          <li style={{ marginBottom: '8px' }}>Geographic coordinates (latitude and longitude derived from birth location)</li>
          <li style={{ marginBottom: '8px' }}>Email address</li>
        </ul>
        <p style={{ marginBottom: '12px' }}><strong>Sensitive Information.</strong> We do not process sensitive information.</p>
        <p style={{ marginBottom: '12px' }}><strong>Payment Data.</strong> All payment data is handled and stored by Etsy and their payment processors. We do not have access to your payment details.</p>
        <p style={{ marginBottom: '32px' }}>All personal information that you provide to us must be true, complete, and accurate.</p>

        <H2>2. HOW DO WE PROCESS YOUR INFORMATION?</H2>
        <p style={{ marginBottom: '32px' }}>We process your personal information to deliver and facilitate delivery of astrological interpretation services to you. Birth date, time, and location are transmitted to Vercel for chart calculation and to Anthropic for interpretation generation. Your name, birth data, and email are stored in our database to enable permanent access to your reading and to deliver your reading URL.</p>

        <H2>3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?</H2>
        <p style={{ marginBottom: '12px' }}>We only process your personal information when we believe it is necessary and we have a valid legal reason to do so under applicable law. Our primary legal basis is performance of a contract — we process birth data to deliver the astrological interpretation service you have purchased.</p>
        <p style={{ marginBottom: '12px' }}><em><strong>If you are located in the EU or UK:</strong></em> The GDPR requires us to explain the valid legal bases we rely on. We rely on Performance of a Contract as our primary legal basis. We may also rely on Legal Obligations where required by law.</p>
        <p style={{ marginBottom: '32px' }}><em><strong>If you are located in Canada:</strong></em> We process your information based on express consent given at the time of purchase. You may withdraw your consent at any time by contacting us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>.</p>

        <H2>4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</H2>
        <p style={{ marginBottom: '12px' }}>We may share information in the following situations:</p>
        <ul style={{ margin: '12px 0 16px 24px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Business Transfers.</strong> We may share or transfer your information in connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business.</li>
          <li style={{ marginBottom: '8px' }}><strong>Third-Party Service Providers.</strong> We share birth data transiently with Vercel for chart calculation and with Anthropic for interpretation generation. Your reading data is stored in Supabase. See Section 13 for full details.</li>
        </ul>
        <p style={{ marginBottom: '32px' }}>We do not sell, trade, or share your personal information with third parties for marketing purposes.</p>

        <H2>5. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</H2>
        <p style={{ marginBottom: '32px' }}>Yes. Texture's core service uses AI to generate personalized astrological interpretations. We provide AI products through Anthropic as our AI Service Provider. Chart data (planetary positions and placements, not personal birth data) is shared with Anthropic to generate interpretations. This data is not linked to your identity and is not retained by Anthropic.</p>

        <H2>6. HOW LONG DO WE KEEP YOUR INFORMATION?</H2>
        <p style={{ marginBottom: '32px' }}>Your personal data — name, birth data, email, and generated reading content — is stored in our database indefinitely so that you can access your reading at any time via your permanent URL. You may request deletion of your data at any time by contacting us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>. We will delete your record within 30 days of receiving your request. Birth data transmitted to Vercel for chart calculation and to Anthropic for interpretation generation is not retained by those services.</p>

        <H2>7. HOW DO WE KEEP YOUR INFORMATION SAFE?</H2>
        <p style={{ marginBottom: '32px' }}>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. Your data is stored in a secured cloud database (Supabase) with access controls. However, no electronic transmission over the Internet can be guaranteed to be 100% secure. Transmission of personal information to and from our Services is at your own risk.</p>

        <H2>8. DO WE COLLECT INFORMATION FROM MINORS?</H2>
        <p style={{ marginBottom: '32px' }}>We do not knowingly collect, solicit data from, or market to children under 18 years of age. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of a minor and consent to such minor's use of the Services. If you become aware of any data we may have collected from children under age 18, please contact us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>.</p>

        <H2>9. WHAT ARE YOUR PRIVACY RIGHTS?</H2>
        <p style={{ marginBottom: '12px' }}>Depending on where you are located, you may have certain rights under applicable data protection laws. These may include the right to request access to your personal information, request rectification or erasure, restrict processing, and data portability. To exercise these rights, contact us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>.</p>
        <p style={{ marginBottom: '12px' }}>If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you have the right to complain to your <a href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)' }}>Member State data protection authority</a> or <a href="https://ico.org.uk/make-a-complaint/data-protection-complaints/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)' }}>UK data protection authority</a>.</p>
        <p style={{ marginBottom: '32px' }}><strong>Withdrawing your consent:</strong> You have the right to withdraw your consent at any time by contacting us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>. Note that withdrawing consent will not affect the lawfulness of processing before its withdrawal.</p>

        <H2>10. CONTROLS FOR DO-NOT-TRACK FEATURES</H2>
        <p style={{ marginBottom: '32px' }}>Most web browsers include a Do-Not-Track ("DNT") feature. We do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online, as no uniform technology standard for recognizing and implementing DNT signals has been finalized. California law requires us to let you know how we respond to DNT signals — we do not respond to them at this time.</p>

        <H2>11. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</H2>
        <p style={{ marginBottom: '12px' }}>If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you, correct inaccuracies, get a copy of, or delete your personal information.</p>
        <p style={{ marginBottom: '12px' }}>The personal information we collect includes names (Category B — California Customer Records statute), birth data, and email addresses. We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose and will not do so in the future.</p>
        <p style={{ marginBottom: '12px' }}>To exercise your rights, contact us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>. If your appeal is denied, you may submit a complaint to your state attorney general.</p>
        <p style={{ marginBottom: '32px' }}><strong>California "Shine The Light" Law:</strong> California residents may request information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes in the preceding calendar year. We do not disclose personal information to third parties for direct marketing purposes.</p>

        <H2>12. DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?</H2>
        <H3>Australia and New Zealand</H3>
        <p style={{ marginBottom: '12px' }}>We collect and process your personal information under the obligations and conditions set by Australia's Privacy Act 1988 and New Zealand's Privacy Act 2020. If you believe we are unlawfully processing your personal information, you have the right to complain to the <a href="https://www.oaic.gov.au/privacy/privacy-complaints/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)' }}>Office of the Australian Information Commissioner</a> or the <a href="https://www.privacy.org.nz/your-rights/making-a-complaint/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)' }}>Office of New Zealand Privacy Commissioner</a>.</p>
        <H3>Republic of South Africa</H3>
        <p style={{ marginBottom: '32px' }}>If you are unsatisfied with how we address any complaint regarding our processing of personal information, you can contact the <a href="https://inforegulator.org.za/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(185,18,18,0.75)' }}>Information Regulator (South Africa)</a> at <a href="mailto:enquiries@inforegulator.org.za" style={{ color: 'rgba(185,18,18,0.75)' }}>enquiries@inforegulator.org.za</a>.</p>

        <H2>13. THIRD-PARTY SERVICE PROVIDERS</H2>
        <p style={{ marginBottom: '32px' }}>Texture uses third-party service providers to deliver its core functionality. Birth date, time, and location are transmitted to Vercel (vercel.com) solely for the purpose of calculating your astrological chart. This data is not stored by Vercel. Chart data (planetary positions and placements) is transmitted to Anthropic (anthropic.com) via Vercel solely for the purpose of generating personalized interpretations. No data transmitted to Anthropic is linked to your identity or stored by Anthropic. Your reading data — name, birth data, email, and generated content — is stored in Supabase (supabase.com), a secured cloud database provider. Payments are processed through Etsy and their payment partners; Texture does not receive or store your payment information.</p>

        <H2>14. DO WE MAKE UPDATES TO THIS NOTICE?</H2>
        <p style={{ marginBottom: '32px' }}>We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Last updated" date at the top of this Privacy Notice. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.</p>

        <H2>15. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</H2>
        <p style={{ marginBottom: '12px' }}>If you have questions or comments about this notice, you may contact our Data Protection Officer (DPO) by email at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>, or by mail at:</p>
        <p style={{ marginBottom: '32px' }}>
          <strong>Texture LLC</strong><br />
          Data Protection Officer<br />
          Long Beach, CA 90802<br />
          United States
        </p>

        <H2>16. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</H2>
        <p style={{ marginBottom: '32px' }}>Based on the applicable laws of your country or state of residence, you may have the right to request access to the personal information we collect from you, correct inaccuracies, or delete your personal information. To make a request, contact us at <a href="mailto:help@gettexture.app" style={{ color: 'rgba(185,18,18,0.75)' }}>help@gettexture.app</a>. We will respond within 30 days.</p>

      </div>

      <footer style={{ borderTop: '1px solid rgba(22,22,18,0.10)', padding: '28px 48px', display: 'flex', gap: '20px', flexWrap: 'wrap' as const }}>
        <Link href="/" style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', textDecoration: 'none' }}>TEXTURE</Link>
        <Link href="/terms" style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', textDecoration: 'none' }}>Terms of Use</Link>
        <a href="mailto:help@gettexture.app" style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', textDecoration: 'none' }}>Support</a>
        <span style={{ fontSize: '12px', color: 'rgba(22,22,18,0.45)', width: '100%' }}>© 2026 Texture LLC · Long Beach, California</span>
      </footer>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-questrial), sans-serif',
      fontSize: '17px',
      fontWeight: 700,
      color: '#161612',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      marginTop: '48px',
      marginBottom: '16px',
    }}>
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-questrial), sans-serif',
      fontSize: '15px',
      fontWeight: 600,
      color: '#161612',
      marginTop: '28px',
      marginBottom: '12px',
    }}>
      {children}
    </h3>
  );
}
