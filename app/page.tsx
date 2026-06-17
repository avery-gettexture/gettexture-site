'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

declare global {
  interface Window { google: any; initGooglePlaces: () => void; }
}

interface FormData {
  name: string;
  birthDate: string;
  birthHour: string;
  birthMinute: string;
  birthAmPm: string;
  birthLocation: string;
  birthLat: number | null;
  birthLng: number | null;
  email: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const MARKETING_BASE = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/marketing';
const SCREENSHOTS = [1,2,3,4,5].map(i => `${MARKETING_BASE}/screenshot-${i}.png`);

export default function HomePage() {
  const [form, setForm] = useState<FormData>({
    name: '', birthDate: '', birthHour: '12', birthMinute: '00',
    birthAmPm: 'PM', birthLocation: '', birthLat: null, birthLng: null, email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const locationRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const ctaRef1 = useRef<HTMLAnchorElement>(null);
  const ctaRef2 = useRef<HTMLAnchorElement>(null);
  const ctaRef3 = useRef<HTMLAnchorElement>(null);
  const orderFormRef = useRef<HTMLElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function checkVisibility() {
      const els = [ctaRef1, ctaRef2, ctaRef3, orderFormRef, submitBtnRef];
      const anyVisible = els.some(ref => {
        if (!ref.current) return false;
        const rect = ref.current.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      setShowStickyCta(!anyVisible);
    }
    window.addEventListener('scroll', checkVisibility, { passive: true });
    checkVisibility();
    return () => window.removeEventListener('scroll', checkVisibility);
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    window.initGooglePlaces = () => {
      if (!locationRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(locationRef.current, { types: ['(cities)'] });
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        setForm(f => ({
          ...f,
          birthLocation: place.formatted_address ?? place.name ?? '',
          birthLat: place.geometry?.location?.lat() ?? null,
          birthLng: place.geometry?.location?.lng() ?? null,
        }));
        setErrors(e => ({ ...e, birthLocation: '' }));
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.birthDate) e.birthDate = 'Required';
    if (!form.birthLocation || !form.birthLat) e.birthLocation = 'Please select a location from the dropdown';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) setShowReview(true);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const birthTime = `${form.birthHour}:${form.birthMinute} ${form.birthAmPm}`;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, birthDate: form.birthDate, birthTime,
          birthLocation: form.birthLocation, birthLat: form.birthLat,
          birthLng: form.birthLng, email: form.email,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const inputStyle = (field: string) => ({
    width: '100%', padding: '12px 14px',
    fontFamily: 'var(--font-questrial), sans-serif', fontSize: '15px', color: '#161612',
    backgroundColor: '#FDF5ED',
    border: `1px solid ${errors[field] ? 'rgba(185,18,18,0.75)' : 'rgba(22,22,18,0.20)'}`,
    borderRadius: '2px', outline: 'none', boxSizing: 'border-box' as const,
  });

  const labelStyle = {
    fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px',
    color: 'rgba(22,22,18,0.45)', letterSpacing: '1px',
    textTransform: 'uppercase' as const, marginBottom: '6px', display: 'block',
  };

  const errorStyle = {
    fontFamily: 'var(--font-geist-mono), monospace', fontSize: '10px',
    color: 'rgba(185,18,18,0.75)', letterSpacing: '0.5px', marginTop: '4px',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FDF5ED', color: '#161612' }}>

      {/* Header */}
      <header style={{ padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(22,22,18,0.08)' }}>
        <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '16px', color: 'rgba(185,18,18,0.75)', letterSpacing: '2px' }}>TEXTURE</span>
        <a href="mailto:help@gettexture.app" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textDecoration: 'none' }}>help@gettexture.app</a>
      </header>

      {/* ATF Hero */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '80px 40px 60px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(52px, 14vw, 96px)', color: 'rgba(185,18,18,0.75)', letterSpacing: '4px', lineHeight: 1, marginBottom: '32px' }}>
          TEXTURE
        </h1>
        <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(18px, 4vw, 24px)', color: '#161612', lineHeight: 1.6, marginBottom: '16px' }}>
          Your chart is a map of one specific moment in the sky. Thousands of years of observation went into understanding what that moment means.
        </p>
        <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(18px, 4vw, 24px)', color: 'rgba(185,18,18,0.75)', lineHeight: 1.6, marginBottom: '48px' }}>
          This is your texture.
        </p>
        <a ref={ctaRef1} href="#order" style={{ display: 'inline-block', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: 'rgba(185,18,18,0.75)', padding: '14px 36px', textDecoration: 'none' }}>
          GET YOUR READING — $29 →
        </a>
      </section>

      {/* Product showcase — two column */}
      <section style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '80px 40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '64px', alignItems: 'start' }}>

            {/* Left — screenshots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SCREENSHOTS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Texture reading screenshot ${i + 1}`}
                  style={{ width: '100%', borderRadius: '4px', display: 'block' }}
                />
              ))}
            </div>

            {/* Right — differentiators + CTA */}
            <div style={{ position: 'sticky', top: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(28px, 5vw, 40px)', color: '#161612', letterSpacing: '1px', lineHeight: 1.1, marginBottom: '16px' }}>
                  Take a closer look<br />at your chart.
                </h2>
                <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '16px', color: 'rgba(22,22,18,0.65)', lineHeight: 1.7 }}>
                  Your chart is a woven system of planets, signs, houses, degrees, angles, and more, pushing and pulling on each other in ways unique to you. The more of it you explore, and the more context you hold, the more you'll start to recognize. This reading walks you through the nuance of your chart, so you can sit with the detail and find what it means to you.
                </p>
              </div>

              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: '14 Placements', text: 'Sun, moon, rising, and all major planets, bodies and points interpreted in full.' },
                  { label: '~6,500 Words', text: 'Explore the depth your chart has to offer with ~500 words of unique copy for each placement, written for only you.' },
                  { label: 'Full Context', text: 'Interpretations written to reflect that your chart is more than the sum of its parts. Sign, house, degree, aspects, and motion are considered for every placement.' },
                  { label: 'Permanent URL', text: 'Your reading lives at a unique link. Save it, revisit it, share it anytime.' },
                ].map(({ label, text }) => (
                  <div key={label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '0.5px solid rgba(22,22,18,0.08)' }}>
                    <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(185,18,18,0.75)', letterSpacing: '1px', flexShrink: 0, paddingTop: '2px', minWidth: '100px' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: 'rgba(22,22,18,0.65)', lineHeight: 1.6 }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Price + CTA */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', lineHeight: 1.6 }}>ONE-TIME<br />NO SUBSCRIPTION</span>
                  <a href="#description" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(185,18,18,0.75)', letterSpacing: '1px', textDecoration: 'none' }}>
                    Full description ↓
                  </a>
                </div>
                <a ref={ctaRef2} href="#order" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: 'rgba(185,18,18,0.75)', padding: '16px', textDecoration: 'none' }}>
                  <span>GET YOUR READING →</span>
                  <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '20px', letterSpacing: '1px' }}>$29</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description + What's included — two columns */}
      <section id="description" style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '64px 40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '40px' }}>
            About the reading
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '64px', alignItems: 'start' }}>

            {/* Left — description copy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                'A chart is a woven system. Your placements are the threads, but how they interact creates the texture. This reading reflects that nuance — sign, house, degree, aspects, and motion are all considered, so your placements are read in context, not isolation.',
                'The report you\'ll receive is irreducibly specific to your chart. Your Sun at 29 degrees Leo in your 10th house, with a square to Saturn is different than a Sun in Leo in a different house, at a different degree, or with different aspects. If you\'re interested in astrology, and curious about what insights more specific reading could offer beyond an isolated planet in sign or planet in house interpretation, this report will surface the nuance you\'re looking for.',
                'Astrology resonates when it gets precise, and this report honors that precision. Factors like sign, house, degree, motion, and aspects push and pull on planets to shift what they mean for you. A planet in its home sign might be complicated by the house it\'s in or the aspects pulling against it, or a planet in a challenging sign might be supported by house or aspects. This reading illuminates the unique character of your chart for you to reflect on, consider, and sit with.',
                'This report is written to deliver a felt sense of your chart regardless of your experience with astrology — you do not need to be fluent in astrological terms to understand it. There are reference sections on each placement to define the planet, sign, house, degree, motion, and aspects referenced in the interpretation, as well as a complete reference section at the end with all terms defined.',
              ].map((text, i) => (
                <p key={i} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(15px, 3.5vw, 16px)', color: 'rgba(22,22,18,0.80)', lineHeight: 1.75, letterSpacing: '-0.2px' }}>{text}</p>
              ))}
            </div>

            {/* Right — what's included */}
            <div style={{ position: 'sticky', top: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '16px' }}>What's included</p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  {['Birth chart wheel (Whole Sign house system)', 'Full placements list', '~500 words of interpretation per placement', '~6,500 words of personalized content total', 'Reference sections throughout', 'Complete reference dictionary at the end'].map(item => (
                    <li key={item} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: 'rgba(22,22,18,0.65)', lineHeight: 1.6, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'rgba(185,18,18,0.75)', flexShrink: 0 }}>—</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '12px' }}>Placements interpreted</p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  {['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Rising Sign / Ascendant','Midheaven','North Node','South Node'].map(p => (
                    <li key={p} style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '13px', color: 'rgba(22,22,18,0.55)', lineHeight: 1.6 }}>{p}</li>
                  ))}
                </ul>
              </div>
              <a ref={ctaRef3} href="#order" style={{ display: 'block', textAlign: 'center', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: 'rgba(185,18,18,0.75)', padding: '16px', textDecoration: 'none' }}>
                GET YOUR READING →
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Order Form */}
      <section id="order" ref={orderFormRef} style={{ borderTop: '1.5px solid rgba(185,18,18,0.50)', padding: '64px 40px 80px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: 'clamp(28px, 7vw, 40px)', color: '#161612', letterSpacing: '1px', marginBottom: '8px' }}>
            Receive Your Reading
          </div>
          <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '14px', color: 'rgba(22,22,18,0.65)', lineHeight: 1.7, marginBottom: '40px' }}>
            Please enter the following information so we can deliver your personalized report. This information is used to calculate the position of the planets in the sky relative to the time and place you were born. Accurate information ensures you receive the highest quality report, and cannot be updated once you complete payment, so please be sure to check your entries. You'll receive your reading link by email immediately after purchase.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input type="text" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); }} placeholder="As you'd like it to appear in your reading" style={inputStyle('name')} />
              {errors.name && <div style={errorStyle}>{errors.name}</div>}
            </div>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input type="date" value={form.birthDate} onChange={e => { setForm(f => ({ ...f, birthDate: e.target.value })); setErrors(er => ({ ...er, birthDate: '' })); }} style={inputStyle('birthDate')} />
              {errors.birthDate && <div style={errorStyle}>{errors.birthDate}</div>}
            </div>
            <div>
              <label style={labelStyle}>Time of Birth</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={form.birthHour} onChange={e => setForm(f => ({ ...f, birthHour: e.target.value }))} style={{ ...inputStyle('birthTime'), flex: 1 }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={form.birthMinute} onChange={e => setForm(f => ({ ...f, birthMinute: e.target.value }))} style={{ ...inputStyle('birthTime'), flex: 1 }}>
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={form.birthAmPm} onChange={e => setForm(f => ({ ...f, birthAmPm: e.target.value }))} style={{ ...inputStyle('birthTime'), flex: '0 0 80px' }}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Place of Birth</label>
              <input ref={locationRef} type="text" placeholder="City, Country" onChange={e => { setForm(f => ({ ...f, birthLocation: e.target.value, birthLat: null, birthLng: null })); setErrors(er => ({ ...er, birthLocation: '' })); }} style={inputStyle('birthLocation')} />
              {errors.birthLocation && <div style={errorStyle}>{errors.birthLocation}</div>}
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })); }} placeholder="Your reading link will be sent here" style={inputStyle('email')} />
              {errors.email && <div style={errorStyle}>{errors.email}</div>}
            </div>
            <button
              ref={submitBtnRef}
              type="submit"
              style={{ marginTop: '8px', padding: '16px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: 'rgba(185,18,18,0.75)', border: 'none', cursor: 'pointer', width: '100%' }}>
              REVIEW ORDER →
            </button>
          </form>
        </div>
      </section>

      {/* Review Modal */}
      {showReview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(22,22,18,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 100 }}>
          <div style={{ backgroundColor: '#FDF5ED', maxWidth: '480px', width: '100%', padding: '40px' }}>
            <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '22px', color: '#161612', letterSpacing: '1px', marginBottom: '24px' }}>Review Your Order</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {[
                { label: 'Name', value: form.name },
                { label: 'Date of Birth', value: form.birthDate },
                { label: 'Time of Birth', value: `${form.birthHour}:${form.birthMinute} ${form.birthAmPm}` },
                { label: 'Place of Birth', value: form.birthLocation },
                { label: 'Email', value: form.email },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', paddingBottom: '12px', borderBottom: '0.5px solid rgba(22,22,18,0.10)' }}>
                  <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase' as const, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: '15px', color: '#161612', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Total</span>
                <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '22px', color: '#161612' }}>$29.00</span>
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.45)', lineHeight: 1.7, marginBottom: '24px' }}>
              Please confirm your birth data is correct. These details cannot be updated after purchase.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleConfirm} disabled={loading} style={{ padding: '16px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: loading ? 'rgba(185,18,18,0.40)' : 'rgba(185,18,18,0.75)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
                {loading ? 'REDIRECTING...' : 'PROCEED TO PAYMENT →'}
              </button>
              <button onClick={() => setShowReview(false)} style={{ padding: '14px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: 'rgba(22,22,18,0.45)', backgroundColor: 'transparent', border: '1px solid rgba(22,22,18,0.15)', cursor: 'pointer', width: '100%' }}>
                EDIT DETAILS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approach */}
      <section style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '64px 40px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.35)', letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Texture's approach</div>
          <p style={{ fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(15px, 3.5vw, 17px)', color: 'rgba(22,22,18,0.80)', lineHeight: 1.75 }}>
            Astrology describes patterns. It does not dictate them. Nothing is written as a verdict about who you are or what will happen — it's a description of tendencies, qualities, and the ways energy characteristically moves in your chart. What you recognize, what you set aside, and what you do with any of it is entirely yours. The most useful way to read this report is as a mirror, not a map of a fixed destination.
          </p>
          <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px', color: 'rgba(22,22,18,0.35)', lineHeight: 1.7, paddingTop: '16px', borderTop: '0.5px solid rgba(22,22,18,0.10)' }}>
            A note on method: astrology is a tradition thousands of years in the making. The interpretations here were generated by a language model trained on that body of knowledge and directed at the specific configuration of your chart, calculated using the Whole Sign house system.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(22,22,18,0.08)', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '12px' }}>
        <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.25)', letterSpacing: '1px' }}>© 2026 TEXTURE</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/privacy" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.30)', letterSpacing: '1px', textDecoration: 'none' }}>PRIVACY</Link>
          <Link href="/terms" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.30)', letterSpacing: '1px', textDecoration: 'none' }}>TERMS</Link>
          <a href="mailto:help@gettexture.app" style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.30)', letterSpacing: '1px', textDecoration: 'none' }}>SUPPORT</a>
        </div>
      </footer>

      <div
        className="mobile-sticky-cta"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 20px',
          backgroundColor: '#FDF5ED',
          borderTop: '1px solid rgba(22,22,18,0.10)',
          zIndex: 50,
          display: showStickyCta ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <a href="#order" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: 'rgba(185,18,18,0.75)', padding: '16px', textDecoration: 'none' }}>
          <span>GET YOUR READING →</span>
          <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '20px', letterSpacing: '1px' }}>$29</span>
        </a>
      </div>

    </div>
  );
}
