'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'tx-9k2mR#vQ';

function generateSlug(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'texture-admin/1.0' } }
    );
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      name: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    birthDate: '',
    birthTime: '',
    location: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState<string[]>([]);
  const [genDone, setGenDone] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function runGeneration(retryOnly = false) {
    if (!result) return;
    setGenerating(true);
    setHasFailed(false);
    setGenLog(prev => [...prev, retryOnly ? 'Retrying failed placements...' : 'Starting content generation...', 'Warming cache with Sun...']);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: result.slug, retryOnly }),
      });
      const data = await res.json();
      if (data.success) {
        const failed = data.failed ?? [];
        setGenLog(prev => [...prev,
          `Generated ${data.generated} placements.`,
          failed.length > 0 ? `Failed: ${failed.join(', ')}` : 'All placements complete ✓',
        ]);
        setHasFailed(failed.length > 0);
        if (failed.length === 0) setGenDone(true);
      } else {
        setGenLog(prev => [...prev, `Error: ${data.error}`]);
        setHasFailed(true);
      }
    } catch (e: any) {
      setGenLog(prev => [...prev, `Error: ${e.message}`]);
      setHasFailed(true);
    }
    setGenerating(false);
  }

  const [error, setError] = useState('');
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (localStorage.getItem('tx_admin_auth') === '1') setAuthed(true);
  }, []);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem('tx_admin_auth', '1');
      setAuthed(true);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  }

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setLog([]);
    setError('');
    setResult(null);

    try {
      // 1. Geocode location
      addLog(`Geocoding "${form.location}"...`);
      const geo = await geocodeLocation(form.location);
      if (!geo) throw new Error(`Could not geocode location: "${form.location}". Try a more specific city name.`);
      addLog(`Found: ${geo.name}`);
      addLog(`Lat: ${geo.lat}, Lng: ${geo.lng}`);

      // 2. Parse birth date and time
      const [year, month, day] = form.birthDate.split('-').map(Number);
      const [hour, minute] = form.birthTime
        ? form.birthTime.split(':').map(Number)
        : [12, 0];
      const birthTimeKnown = !!form.birthTime;

      // 3. Call chart API
      addLog('Calculating chart...');
      const chartRes = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: {
            name: form.name,
            year, month, day, hour, minute,
            latitude: geo.lat,
            longitude: geo.lng,
            city: form.location,
            nation: 'XX',
          },
        }),
      });

      if (!chartRes.ok) {
        const err = await chartRes.json();
        throw new Error(`Chart calculation failed: ${err.error}`);
      }

      const chartData = await chartRes.json();
      addLog('Chart calculated successfully.');
      addLog(`Sun: ${chartData.chart_data?.subject?.sun?.sign ?? 'unknown'}`);

      // 4. Generate slug and write to Supabase
      const slug = generateSlug();
      addLog(`Generated slug: ${slug}`);

      const { error: dbError } = await supabase
        .from('readings')
        .insert({
          slug,
          name: form.name,
          email: form.email || null,
          birth_date: form.birthDate,
          birth_time: form.birthTime || null,
          birth_location: form.location,
          birth_lat: geo.lat,
          birth_lng: geo.lng,
          birth_time_known: birthTimeKnown,
          chart_data: chartData.chart_data,
        });

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      addLog('Reading saved to database.');

      const url = `${window.location.origin}/reading/${slug}`;
      setResult({ slug, url });
      setStatus('done');

    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'var(--font-questrial), sans-serif',
    fontSize: '16px',
    color: '#161612',
    background: '#fff',
    border: '1px solid rgba(22,22,18,0.20)',
    outline: 'none',
    borderRadius: '2px',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono), monospace',
    fontSize: '11px',
    color: 'rgba(22,22,18,0.45)',
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
    display: 'block',
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#FDF5ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '280px' }}>
          <div style={{ fontFamily: 'var(--font-anton), sans-serif', fontSize: '14px', color: 'rgba(185,18,18,0.75)', letterSpacing: '2px', marginBottom: '8px' }}>TEXTURE</div>
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
            style={{ padding: '10px 12px', fontFamily: 'var(--font-questrial), sans-serif', fontSize: '16px', border: `1px solid ${passwordError ? 'rgba(185,18,18,0.75)' : 'rgba(22,22,18,0.20)'}`, outline: 'none', borderRadius: '2px' }}
            autoFocus
          />
          {passwordError && <div style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(185,18,18,0.75)', letterSpacing: '1px' }}>INCORRECT</div>}
          <button type="submit" style={{ padding: '12px', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px', letterSpacing: '2px', color: '#FDF5ED', background: 'rgba(185,18,18,0.75)', border: 'none', cursor: 'pointer' }}>
            ENTER →
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FDF5ED',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-anton), sans-serif',
            fontSize: '14px',
            color: 'rgba(185,18,18,0.75)',
            letterSpacing: '2px',
            marginBottom: '8px',
          }}>
            TEXTURE
          </div>
          <div style={{
            fontFamily: 'var(--font-anton), sans-serif',
            fontSize: '28px',
            color: '#161612',
            letterSpacing: '1px',
          }}>
            New Reading
          </div>
          <div style={{ height: '1.5px', background: 'rgba(185,18,18,0.50)', marginTop: '12px' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div>
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Email (optional)</label>
            <input
              style={inputStyle}
              type="email"
              placeholder="customer@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div>
            <label style={labelStyle}>Birth Date</label>
            <input
              style={inputStyle}
              type="date"
              value={form.birthDate}
              onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Birth Time (leave blank if unknown)</label>
            <input
              style={inputStyle}
              type="time"
              value={form.birthTime}
              onChange={e => setForm(f => ({ ...f, birthTime: e.target.value }))}
            />
          </div>

          <div>
            <label style={labelStyle}>Birth Location</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="City, Country"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              padding: '14px',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '13px',
              letterSpacing: '2px',
              color: status === 'loading' ? 'rgba(253,245,237,0.50)' : '#FDF5ED',
              background: status === 'loading' ? 'rgba(185,18,18,0.40)' : 'rgba(185,18,18,0.75)',
              border: 'none',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}
          >
            {status === 'loading' ? 'GENERATING...' : 'GENERATE READING →'}
          </button>

        </form>

        {/* Log */}
        {log.length > 0 && (
          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: 'rgba(22,22,18,0.04)',
            border: '1px solid rgba(22,22,18,0.08)',
          }}>
            {log.map((line, i) => (
              <div key={i} style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '12px',
                color: 'rgba(22,22,18,0.55)',
                letterSpacing: '0.5px',
                lineHeight: '1.8',
              }}>
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(185,18,18,0.06)',
            border: '1px solid rgba(185,18,18,0.20)',
            fontFamily: 'var(--font-questrial), sans-serif',
            fontSize: '14px',
            color: 'rgba(185,18,18,0.85)',
          }}>
            {error}
          </div>
        )}

        {/* Result */}
        {status === 'done' && result && (
          <div style={{
            marginTop: '32px',
            padding: '24px',
            background: '#fff',
            border: '1px solid rgba(22,22,18,0.10)',
          }}>
            <div style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '11px',
              color: 'rgba(22,22,18,0.35)',
              letterSpacing: '1.5px',
              marginBottom: '12px',
            }}>
              READING CREATED
            </div>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-questrial), sans-serif',
                fontSize: '16px',
                color: 'rgba(185,18,18,0.75)',
                wordBreak: 'break-all',
              }}
            >
              {result.url}
            </a>
            <div style={{
              marginTop: '16px',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '11px',
              color: 'rgba(22,22,18,0.35)',
              letterSpacing: '1px',
            }}>
              Send this URL to the customer.
            </div>

            <button
              onClick={() => runGeneration(false)}
              disabled={generating || genDone}
              style={{
                marginTop: '16px', width: '100%', padding: '14px',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '13px', letterSpacing: '2px',
                color: genDone ? 'rgba(22,22,18,0.35)' : '#FDF5ED',
                background: genDone ? 'rgba(22,22,18,0.08)' : generating ? 'rgba(185,18,18,0.40)' : 'rgba(185,18,18,0.75)',
                border: 'none', cursor: generating || genDone ? 'not-allowed' : 'pointer',
              }}
            >
              {genDone ? 'CONTENT GENERATED ✓' : generating ? 'GENERATING...' : 'GENERATE CONTENT →'}
            </button>

            {hasFailed && !generating && (
              <button
                onClick={() => runGeneration(true)}
                style={{
                  marginTop: '8px', width: '100%', padding: '12px',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '13px', letterSpacing: '2px',
                  color: '#FDF5ED',
                  background: 'rgba(22,22,18,0.55)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                RETRY FAILED →
              </button>
            )}

            {genLog.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(22,22,18,0.04)', border: '1px solid rgba(22,22,18,0.08)' }}>
                {genLog.map((line, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '11px', color: 'rgba(22,22,18,0.55)', lineHeight: '1.8' }}>{line}</div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
