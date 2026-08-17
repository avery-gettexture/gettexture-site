'use client';

// The pre-purchase order form — extracted verbatim from the old single-column
// `/` page (home-two-panel-rebuild task, SPEC §16) so it can be re-housed
// inside the new right-panel cream rectangle. State, validation, the Google
// Places autocomplete wiring, and the submit → review → /api/checkout →
// Stripe redirect flow are UNCHANGED from the prior page — only the visual
// container around the form moved. The only styling change is the input
// background (white instead of cream): the form previously sat on a page
// whose background was cream, so cream inputs stood out; now it sits ON a
// cream panel, so inputs are white instead so they're still visible as
// distinct fields.

import { useState, useRef, useEffect } from 'react';

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
    backgroundColor: '#FFFFFF',
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
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
          type="submit"
          style={{ marginTop: '8px', padding: '16px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', backgroundColor: 'rgba(185,18,18,0.75)', border: 'none', cursor: 'pointer', width: '100%' }}>
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
    </>
  );
}
