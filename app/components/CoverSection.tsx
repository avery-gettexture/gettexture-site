'use client';

import { useEffect, useRef, useCallback } from 'react';

interface CoverSectionProps {
  customerName: string;
  onScrollNext: () => void;
}

const VERT_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
  }
`;

const FRAG_SHADER = `
  precision mediump float;
  uniform vec2  u_resolution;
  uniform float u_time;
  uniform vec2  u_dot1;
  uniform vec2  u_dot2;
  uniform vec2  u_dot3;

  void main() {
    vec2 uv = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
    float d1 = distance(uv, u_dot1);
    float d2 = distance(uv, u_dot2);
    float d3 = distance(uv, u_dot3);

    float wavelength = 55.0;
    float speed      = 80.0;
    float amplitude  = 0.13;
    float decay      = 0.0008;

    float w1 = sin((d1 / wavelength) - (u_time * speed / wavelength))
               * amplitude * exp(-d1 * decay);
    float w2 = sin((d2 / (wavelength * 0.85)) - (u_time * speed * 1.1 / (wavelength * 0.85)))
               * amplitude * exp(-d2 * decay);
    float w3 = sin((d3 / (wavelength * 1.15)) - (u_time * speed * 0.9 / (wavelength * 1.15)))
               * amplitude * 0.85 * exp(-d3 * decay);

    float wave = w1 + w2 + w3;
    float wavePos = max(wave, 0.0);
    float waveNeg = min(wave, 0.0);
    vec3 baseColor = vec3(0.680, 0.080, 0.100);
    vec3 color = baseColor
      + vec3(wavePos * 0.50, 0.0, wavePos * 0.02)
      + vec3(waveNeg * 0.15, 0.0, waveNeg * 0.02);
    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vert: string, frag: string) {
  const program = gl.createProgram()!;
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(program);
  return program;
}

export default function CoverSection({ customerName, onScrollNext }: CoverSectionProps) {
  const glCanvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef   = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const mountedRef   = useRef(true);
  const startRef     = useRef(performance.now());
  const glRef        = useRef<WebGLRenderingContext | null>(null);
  const programRef   = useRef<WebGLProgram | null>(null);

  // Init WebGL
  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;
    glRef.current = gl;

    const program = createProgram(gl, VERT_SHADER, FRAG_SHADER);
    programRef.current = program;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1,  -1,1,
      -1, 1,  1,-1,   1,1,
    ]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  }, []);

  // Draw overlay canvas (rings + masked name)
  const drawOverlay = useCallback((W: number, H: number, a1: number, a2: number, a3: number) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    // Orbital rings
    const rings = [
      { r: W * 0.34, opacity: 0.12 },
      { r: W * 0.52, opacity: 0.09 },
      { r: W * 0.72, opacity: 0.06 },
    ];
    for (const ring of rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(253,245,237,${ring.opacity})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Red overlay
    ctx.fillStyle = 'rgba(140, 55, 45, 0.70)';
    ctx.fillRect(0, 0, W, H);

    // Punch name through with destination-out
    const fontSize = Math.min(
      W * 0.20,
      H * 0.14,
      (W * 0.85) / (customerName.length * 0.55),
    );
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.font = `${fontSize}px Anton`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillText(customerName.toUpperCase(), cx, cy);
    ctx.restore();
  }, [customerName]);

  const animate = useCallback(() => {
    if (!mountedRef.current) return;

    const glCanvas = glCanvasRef.current;
    const gl = glRef.current;
    const program = programRef.current;

    if (glCanvas && gl && program) {
      const W = glCanvas.width;
      const H = glCanvas.height;
      const t = (performance.now() - startRef.current) / 1000;

      const P1 = 16, P2 = 13, P3 = 19;
      const a1 =  (t / P1) * Math.PI * 2;
      const a2 = (Math.PI * 0.667 + Math.PI) - (t / P2) * Math.PI * 2;
      const a3 = (Math.PI * 1.333) + (t / P3) * Math.PI * 2;
      const cx = W / 2, cy = H / 2;
      const d1x = cx + Math.cos(a1) * W * 0.34, d1y = cy + Math.sin(a1) * W * 0.34;
      const d2x = cx + Math.cos(a2) * W * 0.52, d2y = cy + Math.sin(a2) * W * 0.52;
      const d3x = cx + Math.cos(a3) * W * 0.72, d3y = cy + Math.sin(a3) * W * 0.72;

      gl.viewport(0, 0, W, H);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), W, H);
      gl.uniform1f(gl.getUniformLocation(program, 'u_time'), t);
      gl.uniform2f(gl.getUniformLocation(program, 'u_dot1'), d1x, d1y);
      gl.uniform2f(gl.getUniformLocation(program, 'u_dot2'), d2x, d2y);
      gl.uniform2f(gl.getUniformLocation(program, 'u_dot3'), d3x, d3y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      drawOverlay(W, H, a1, a2, a3);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [drawOverlay]);

  useEffect(() => {
    mountedRef.current = true;
    startRef.current = performance.now();

    const resize = () => {
      const glCanvas = glCanvasRef.current;
      const overlay = overlayRef.current;
      if (!glCanvas || !overlay) return;
      const W = glCanvas.offsetWidth;
      const H = glCanvas.offsetHeight;
      glCanvas.width = W;
      glCanvas.height = H;
      overlay.width = W;
      overlay.height = H;
      if (glRef.current) glRef.current.viewport(0, 0, W, H);
    };

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [animate]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {/* WebGL wave field */}
      <canvas
        ref={glCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* 2D overlay: rings + masked name */}
      <canvas
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Look closely + arrow */}
      <div style={{
        position: 'absolute',
        bottom: '6%',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{
          fontFamily: 'var(--font-anton), sans-serif',
          fontSize: 'clamp(11px, 3vw, 13px)',
          letterSpacing: '2px',
          color: 'rgba(140, 10, 10, 0.45)',
          textTransform: 'uppercase',
        }}>
          look closely
        </span>
        <button
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '18px',
            color: 'rgba(253,245,237,0.50)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 16px',
          }}
          onClick={onScrollNext}
        >
          ↓
        </button>
      </div>
    </div>
  );
}
