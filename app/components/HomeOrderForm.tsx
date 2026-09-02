'use client';

// The pre-purchase order form — extracted verbatim from the old single-column
// `/` page (home-two-panel-rebuild task, SPEC §16) so it can be re-housed
// inside the new right-panel cream rectangle. State, validation, the Google
// Places autocomplete wiring, and the submit → review → /api/checkout →
// Stripe redirect flow are UNCHANGED — only the visual field markup/styling
// has ever changed. Restyled again in the pre-purchase-home-refinements
// follow-up (SPEC §16): each field is now an inline `label: input` row with
// an underline instead of a boxed input, and text/spacing shrunk, so the
// whole form fits the right panel with ZERO scroll (Avery's non-negotiable
// constraint) — plain white input boxes no longer needed once the field
// itself is just an underline over the cream panel.
//
// Type sizing (fill-the-frame pass, SPEC §16): row spacing, label/input font
// sizes, and the submit button are now dvh-based clamps (not fixed px) so
// they shrink together with the panel on a shorter viewport instead of
// staying a fixed size while the available room shrinks under them — the
// same fixed-px-vs-shrinking-panel mismatch the left panel's title already
// had to correct for. Without this, the form still fit at 1440×900 but
// actually overflowed (submit button below the card's bottom edge) at
// 1366×768 and 1280×800. Verified with no overflow at 1280×800, 1366×768,
// 1440×900, 1920×1080 — the ZERO-scroll constraint holds at all of them.

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

export default function HomeOrderForm({ priceUsd }: { priceUsd: number }) {
  const [form, setForm] = useState<FormData>({
    name: '', birthDate: '', birthHour: '12', birthMinute: '00',
    birthAmPm: 'PM', birthLocation: '', birthLat: null, birthLng: null, email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waiverAcknowledged, setWaiverAcknowledged] = useState(false);
  const locationRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

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
    if (!waiverAcknowledged) return;
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
          waiverAcknowledgedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  // Inline label + underline styling (pre-purchase-home-refinements task,
  // SPEC §16) — replaces the old label-above/white-box fields so the whole
  // form fits the right panel with zero scroll. Sizes shrunk specifically
  // for that fit, not a general style change.
  // flexWrap (a11y Phase 2, SPEC §16): at normal desktop widths every row
  // still fits on one line, so this is invisible day-to-day — it only
  // engages as a fallback when the row is squeezed narrower than its
  // content can fit (200% browser zoom being the concrete case that was
  // clipping fields), letting the input drop to its own line instead of
  // being cut off by the panel's overflow:hidden.
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 12px', marginBottom: 'clamp(9px, 2.1dvh, 20px)',
  };

  const inlineLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(11px, 1.5dvh, 15px)',
    color: 'rgba(22,22,18,0.45)', letterSpacing: '0.5px',
    flex: '0 0 auto', minWidth: '112px',
  };

  const underlineInputStyle = (field: string): React.CSSProperties => ({
    width: '100%', padding: 'clamp(2px, 0.5dvh, 5px) 2px clamp(4px, 0.9dvh, 8px)',
    fontFamily: 'var(--font-questrial), sans-serif', fontSize: 'clamp(12px, 1.6dvh, 16px)', color: '#161612',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${errors[field] ? 'rgba(185,18,18,0.75)' : 'rgba(22,22,18,0.30)'}`,
    borderRadius: 0, outline: 'none', boxSizing: 'border-box' as const,
  });

  const errorStyle: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono), monospace', fontSize: '9px',
    color: 'rgba(185,18,18,0.75)', letterSpacing: '0.5px', marginTop: '2px',
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={rowStyle}>
          <label htmlFor="birth-name" style={inlineLabelStyle}>name:</label>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input id="birth-name" type="text" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); }} placeholder="as you'd like it to appear in your reading" style={underlineInputStyle('name')} />
            {errors.name && <div style={errorStyle}>{errors.name}</div>}
          </div>
        </div>
        <div style={rowStyle}>
          <label htmlFor="birth-date" style={inlineLabelStyle}>date of birth:</label>
          <div style={{ flex: '1 1 160px', minWidth: 0, maxWidth: '160px' }}>
            <input id="birth-date" type="date" value={form.birthDate} onChange={e => { setForm(f => ({ ...f, birthDate: e.target.value })); setErrors(er => ({ ...er, birthDate: '' })); }} style={{ ...underlineInputStyle('birthDate'), maxWidth: '160px' }} />
            {errors.birthDate && <div style={errorStyle}>{errors.birthDate}</div>}
          </div>
        </div>
        <div style={rowStyle}>
          <span id="birth-time-label" style={inlineLabelStyle}>time of birth:</span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <select aria-label="Hour of birth" value={form.birthHour} onChange={e => setForm(f => ({ ...f, birthHour: e.target.value }))} style={{ ...underlineInputStyle('birthTime'), flex: '1 1 48px', minWidth: '36px' }}>
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <select aria-label="Minute of birth" value={form.birthMinute} onChange={e => setForm(f => ({ ...f, birthMinute: e.target.value }))} style={{ ...underlineInputStyle('birthTime'), flex: '1 1 48px', minWidth: '36px' }}>
              {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="AM or PM" value={form.birthAmPm} onChange={e => setForm(f => ({ ...f, birthAmPm: e.target.value }))} style={{ ...underlineInputStyle('birthTime'), flex: '1 1 60px', minWidth: '44px' }}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
        <div style={rowStyle}>
          <label htmlFor="birth-location" style={inlineLabelStyle}>place of birth:</label>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input id="birth-location" ref={locationRef} type="text" placeholder="city, country" onChange={e => { setForm(f => ({ ...f, birthLocation: e.target.value, birthLat: null, birthLng: null })); setErrors(er => ({ ...er, birthLocation: '' })); }} style={underlineInputStyle('birthLocation')} />
            {errors.birthLocation && <div style={errorStyle}>{errors.birthLocation}</div>}
          </div>
        </div>
        <div style={rowStyle}>
          <label htmlFor="birth-email" style={inlineLabelStyle}>email:</label>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input id="birth-email" type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })); }} placeholder="your reading link will be sent here" style={underlineInputStyle('email')} />
            {errors.email && <div style={errorStyle}>{errors.email}</div>}
          </div>
        </div>
        <button
          type="submit"
          style={{ marginTop: '8px', padding: 'clamp(9px, 1.9dvh, 16px)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: 'clamp(11px, 1.5dvh, 14px)', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: 'rgba(185,18,18,0.75)', border: 'none', cursor: 'pointer', width: '100%' }}>
          REVIEW ORDER →
        </button>
      </form>

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
                <span style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '22px', color: '#161612' }}>${priceUsd}.00</span>
              </div>
            </div>
            <label htmlFor="waiver-acknowledged" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
              <input
                id="waiver-acknowledged"
                type="checkbox"
                checked={waiverAcknowledged}
                onChange={e => setWaiverAcknowledged(e.target.checked)}
                style={{ marginTop: '3px', flexShrink: 0, width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.65)', lineHeight: 1.6 }}>
                I have checked that the details I entered are correct and I agree to the{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(22,22,18,0.65)', textDecoration: 'underline' }}>
                  Terms and Conditions
                </Link>
                . I understand that the reading starts generating immediately after checkout and cannot be changed or refunded once it begins.
              </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleConfirm} disabled={loading || !waiverAcknowledged} style={{ padding: '16px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: (loading || !waiverAcknowledged) ? 'rgba(185,18,18,0.40)' : 'rgba(185,18,18,0.75)', border: 'none', cursor: (loading || !waiverAcknowledged) ? 'not-allowed' : 'pointer', width: '100%' }}>
                {loading ? 'REDIRECTING...' : 'PROCEED TO PAYMENT →'}
              </button>
              <button onClick={() => setShowReview(false)} style={{ padding: '14px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: 'rgba(22,22,18,0.45)', backgroundColor: 'transparent', border: '1px solid rgba(22,22,18,0.15)', cursor: 'pointer', width: '100%' }}>
                EDIT DETAILS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
