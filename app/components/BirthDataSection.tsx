'use client';

import { useEffect, useRef } from 'react';

interface BirthDataSectionProps {
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  birthLat?: number | null;
  birthLng?: number | null;
  onScrollNext: () => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const month = months[parseInt(parts[1]) - 1] ?? '';
    const day = parseInt(parts[2]);
    const year = parts[0];
    return `${month} ${day}, ${year}`;
  }
  return dateStr;
}

const CONSTELLATIONS: Array<{
  dots: [number, number, number][];
  lines: [number, number][];
  width: number;
}> = [
  { width: 90,  dots: [[0.15,0.55,2],[0.35,0.35,3],[0.58,0.42,2],[0.78,0.25,1],[0.88,0.30,1]], lines: [[0,1],[1,2],[2,3],[3,4]] },
  { width: 110, dots: [[0.10,0.65,2],[0.28,0.45,3],[0.42,0.28,2],[0.55,0.22,3],[0.65,0.35,1],[0.50,0.45,2],[0.38,0.62,1],[0.72,0.20,2],[0.60,0.18,1]], lines: [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[3,7],[3,8]] },
  { width: 100, dots: [[0.18,0.18,3],[0.42,0.12,3],[0.18,0.42,2],[0.42,0.38,2],[0.20,0.65,2],[0.42,0.60,2],[0.28,0.82,1],[0.38,0.85,1]], lines: [[0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,6],[5,7]] },
  { width: 85,  dots: [[0.20,0.28,2],[0.48,0.18,3],[0.78,0.38,2],[0.65,0.65,1],[0.32,0.68,2]], lines: [[0,1],[1,2],[2,3],[3,4],[4,0]] },
  { width: 120, dots: [[0.08,0.72,1],[0.18,0.52,2],[0.28,0.28,3],[0.48,0.18,3],[0.65,0.25,2],[0.80,0.48,2],[0.68,0.60,1],[0.45,0.72,2],[0.55,0.55,1]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,1],[5,8],[8,6]] },
  { width: 105, dots: [[0.18,0.18,3],[0.38,0.10,2],[0.52,0.28,2],[0.62,0.18,1],[0.72,0.38,2],[0.55,0.48,3],[0.32,0.58,2],[0.20,0.78,1],[0.48,0.75,2]], lines: [[0,1],[1,2],[2,3],[2,4],[4,5],[5,6],[6,7],[5,8]] },
  { width: 95,  dots: [[0.10,0.62,2],[0.38,0.52,3],[0.72,0.60,2],[0.38,0.28,1],[0.22,0.28,2],[0.58,0.25,1]], lines: [[0,1],[1,2],[1,3],[3,4],[3,5]] },
  { width: 130, dots: [[0.08,0.28,2],[0.20,0.38,2],[0.35,0.28,3],[0.48,0.38,2],[0.58,0.48,2],[0.68,0.58,1],[0.72,0.68,2],[0.78,0.78,1],[0.84,0.68,2],[0.90,0.58,1]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]] },
  { width: 115, dots: [[0.18,0.72,2],[0.28,0.52,3],[0.48,0.38,2],[0.58,0.18,1],[0.68,0.38,2],[0.78,0.58,2],[0.62,0.58,1],[0.42,0.68,1],[0.35,0.85,1]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2],[6,7],[7,0],[0,8]] },
  { width: 105, dots: [[0.10,0.38,3],[0.28,0.18,2],[0.48,0.28,2],[0.68,0.18,1],[0.82,0.38,2],[0.72,0.58,1],[0.52,0.68,2],[0.32,0.60,1]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]] },
  { width: 115, dots: [[0.08,0.38,2],[0.28,0.28,2],[0.48,0.38,3],[0.68,0.28,2],[0.88,0.38,1],[0.18,0.58,1],[0.38,0.48,2],[0.58,0.58,2],[0.78,0.48,1]], lines: [[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[2,6]] },
  { width: 105, dots: [[0.10,0.48,2],[0.22,0.28,2],[0.35,0.48,3],[0.22,0.68,1],[0.62,0.48,2],[0.75,0.28,2],[0.88,0.48,3],[0.75,0.68,1],[0.48,0.48,1]], lines: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[2,8],[8,4]] },
];

const DOT_SIZES = [1.0, 1.8, 2.8];

function ConstellationBelt() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const SPEED = 0.70;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!mountedRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const SCALE = H * 2.15;
      const GAP = 56;

      let totalWidth = 0;
      const widths = CONSTELLATIONS.map(c => {
        const w = c.width * (SCALE / 100);
        totalWidth += w + GAP;
        return w;
      });

      offsetRef.current = (offsetRef.current + SPEED) % totalWidth;

      for (let copy = 0; copy < 3; copy++) {
        let x = -offsetRef.current + copy * totalWidth;
        CONSTELLATIONS.forEach((c, ci) => {
          const w = widths[ci];
          const cH = SCALE;
          const cY = H - cH * 0.80;

          if (x + w < -20 || x > W + 20) { x += w + GAP; return; }

          const dots = c.dots.map(([dx, dy, ds]) => [x + dx * w, cY + dy * cH, ds]);

          c.lines.forEach(([a, b]) => {
            ctx.beginPath();
            ctx.moveTo(dots[a][0], dots[a][1]);
            ctx.lineTo(dots[b][0], dots[b][1]);
            ctx.strokeStyle = 'rgba(253,245,237,0.15)';
            ctx.lineWidth = 0.4;
            ctx.stroke();
          });

          dots.forEach(([dx, dy, ds]) => {
            const r = DOT_SIZES[(ds as number) - 1] ?? 1.0;
            const opacity = ds === 3 ? 0.90 : ds === 2 ? 0.60 : 0.35;
            if (ds === 3) {
              const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 3.5);
              grad.addColorStop(0, 'rgba(253,245,237,0.20)');
              grad.addColorStop(1, 'rgba(253,245,237,0)');
              ctx.beginPath();
              ctx.arc(dx, dy, r * 3.5, 0, Math.PI * 2);
              ctx.fillStyle = grad;
              ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(dx, dy, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(253,245,237,${opacity})`;
            ctx.fill();
          });

          x += w + GAP;
        });
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '320px', display: 'block' }}
    />
  );
}

const SKY_BG = 'https://smmevfkddgymxdjecrra.supabase.co/storage/v1/object/public/backgrounds/sky-background.png';

export default function BirthDataSection({
  name,
  birthDate,
  birthTime,
  birthLocation,
  birthLat,
  birthLng,
  onScrollNext,
}: BirthDataSectionProps) {
  const formattedDate = formatDate(birthDate);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `url(${SKY_BG})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Content — centered */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10% 40px 0',
        gap: '32px',
      }}>

        {/* Name */}
        <div style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(42px, 12vw, 88px)',
          color: 'rgba(253,245,237,0.95)',
          letterSpacing: '1px',
          lineHeight: 1,
          textAlign: 'center',
        }}>
          {name}
        </div>

        {/* Date */}
        <div style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 'clamp(14px, 3.8vw, 20px)',
          color: 'rgba(253,245,237,0.55)',
          letterSpacing: '2px',
          textAlign: 'center',
        }}>
          {formattedDate}
        </div>

        {/* Time + Location on same line */}
        {(birthTime || birthLocation) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '48px',
            flexWrap: 'wrap',
          }}>
            {birthTime && (
              <div style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 'clamp(13px, 3.4vw, 18px)',
                color: 'rgba(253,245,237,0.45)',
                letterSpacing: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '1.2em' }}>◷</span>
                {birthTime}
              </div>
            )}
            {birthLocation && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 'clamp(13px, 3.4vw, 18px)',
                  color: 'rgba(253,245,237,0.45)',
                  letterSpacing: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '1.2em' }}>⌖</span>
                  {birthLocation}
                </div>
                {birthLat != null && birthLng != null && (
                  <div style={{
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 'clamp(10px, 2.4vw, 12px)',
                    color: 'rgba(253,245,237,0.35)',
                    letterSpacing: '1px',
                    textAlign: 'center',
                  }}>
                    {birthLat.toFixed(4)}° {birthLng.toFixed(4)}°
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Constellation belt — anchored to bottom */}
      <div style={{ flexShrink: 0 }}>
        <ConstellationBelt />
      </div>

      <button className="next-arrow" onClick={onScrollNext}>↓</button>

    </div>
  );
}
