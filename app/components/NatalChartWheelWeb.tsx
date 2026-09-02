'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────

const ZODIAC_SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: '♈\uFE0E', Taurus: '♉\uFE0E', Gemini: '♊\uFE0E', Cancer: '♋\uFE0E',
  Leo: '♌\uFE0E', Virgo: '♍\uFE0E', Libra: '♎\uFE0E', Scorpio: '♏\uFE0E',
  Sagittarius: '♐\uFE0E', Capricorn: '♑\uFE0E', Aquarius: '♒\uFE0E', Pisces: '♓\uFE0E',
};

// Flat, uniform sign-ring fill — no per-sign color, no transparency
// (replaces the old ELEMENT_COLORS per-sign palette). Same brand cream as
// --cream (app/globals.css), at full opacity since this ring sits behind
// planet ticks/labels and needs to read as solid, not tinted-by-sign.
const ZODIAC_RING_FILL = '#FDF5ED';

const ASPECT_COLORS: Record<string, string> = {
  conjunction: 'rgba(26,42,58,0.28)',
  sextile:     'rgba(60,120,180,0.40)',
  square:      'rgba(180,60,60,0.40)',
  trine:       'rgba(60,150,90,0.40)',
  opposition:  'rgba(180,120,40,0.40)',
};

const PLANET_GLYPH_COLORS: Record<string, string> = {
  sun:          'rgba(196,160,85,0.68)',
  moon:         'rgba(74,154,138,0.75)',
  mercury:      'rgba(122,168,196,0.75)',
  venus:        'rgba(196,160,184,0.75)',
  mars:         'rgba(196,122,122,0.75)',
  jupiter:      'rgba(196,184,122,0.75)',
  saturn:       'rgba(138,154,180,0.75)',
  uranus:       'rgba(122,180,180,0.75)',
  neptune:      'rgba(122,122,180,0.75)',
  pluto:        'rgba(154,138,180,0.75)',
  'north-node': 'rgba(160,184,160,0.75)',
  'south-node': 'rgba(160,184,160,0.75)',
  chiron:       'rgba(138,180,160,0.75)',
};

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  'north-node': '☊', 'south-node': '☋',
};

const SIGN_ABBR_MAP: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

const HOUSE_NAME_MAP: Record<string, number> = {
  First_House: 1, Second_House: 2, Third_House: 3, Fourth_House: 4,
  Fifth_House: 5, Sixth_House: 6, Seventh_House: 7, Eighth_House: 8,
  Ninth_House: 9, Tenth_House: 10, Eleventh_House: 11, Twelfth_House: 12,
};

const PLANET_KEY_ORDER = [
  'sun','moon','mercury','venus','mars','jupiter','saturn',
  'uranus','neptune','pluto','mean_north_lunar_node','mean_south_lunar_node',
];

const PLANET_ID_MAP: Record<string, string> = {
  sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus',
  mars: 'mars', jupiter: 'jupiter', saturn: 'saturn', uranus: 'uranus',
  neptune: 'neptune', pluto: 'pluto',
  mean_north_lunar_node: 'north-node', mean_south_lunar_node: 'south-node',
};

const DISPLAY_EXCLUDED = new Set(['ic', 'dsc', 'chiron', 'lilith', 'asc', 'mc']);
const CONJ_THRESHOLD = 3.5;

// ── Types ──────────────────────────────────────────────────────────────────

interface MappedPlanet {
  id: string;
  glyph: string;
  color: string;
  sign: string;
  house: number;
  degree: number;
  minutes: number;
  longitude: number;
  retrograde: boolean;
}

interface MappedAspect {
  planet1: string;
  planet2: string;
  type: string;
}

interface MappedChart {
  planets: MappedPlanet[];
  aspects: MappedAspect[];
  ascLongitude: number;
  mcLongitude: number;
  ascDegree: number;
  mcDegree: number;
  birthTimeKnown: boolean;
}

// ── Map proxy chart_data to wheel format ───────────────────────────────────

function mapChartData(chartData: any, birthTimeKnown: boolean): MappedChart {
  const subject = chartData?.subject ?? {};
  const planets: MappedPlanet[] = [];

  for (const key of PLANET_KEY_ORDER) {
    const raw = subject[key];
    if (!raw) continue;
    const id = PLANET_ID_MAP[key];
    if (!id) continue;
    const sign = SIGN_ABBR_MAP[raw.sign] ?? raw.sign ?? '';
    const house = HOUSE_NAME_MAP[raw.house] ?? 1;
    const longitude = raw.abs_pos ?? 0;
    const position = raw.position ?? 0;
    const degree = Math.floor(position);
    const minutes = Math.round((position - degree) * 60);
    planets.push({
      id,
      glyph: PLANET_GLYPHS[id] ?? '○',
      color: solidColor(PLANET_GLYPH_COLORS[id] ?? 'rgba(26,42,58,0.75)'),
      sign,
      house,
      degree,
      minutes,
      longitude,
      retrograde: raw.retrograde ?? false,
    });
  }

  const asc = subject['ascendant'];
  const mc = subject['medium_coeli'];
  const ascLon = asc?.abs_pos ?? 0;
  const mcLon = mc?.abs_pos ?? 0;
  const ascPos = asc?.position ?? 0;
  const mcPos = mc?.position ?? 0;

  const rawAspects = chartData?.aspects ?? [];
  const aspects: MappedAspect[] = rawAspects
    .filter((a: any) => ASPECT_COLORS[a.aspect] && !DISPLAY_EXCLUDED.has(a.p1_name?.toLowerCase()) && !DISPLAY_EXCLUDED.has(a.p2_name?.toLowerCase()))
    .map((a: any) => {
      const p1Key = Object.keys(PLANET_ID_MAP).find(k => subject[k]?.name === a.p1_name);
      const p2Key = Object.keys(PLANET_ID_MAP).find(k => subject[k]?.name === a.p2_name);
      return {
        planet1: p1Key ? PLANET_ID_MAP[p1Key] : '',
        planet2: p2Key ? PLANET_ID_MAP[p2Key] : '',
        type: a.aspect,
        lon1: planets.find(p => p.id === (p1Key ? PLANET_ID_MAP[p1Key] : ''))?.longitude ?? 0,
        lon2: planets.find(p => p.id === (p2Key ? PLANET_ID_MAP[p2Key] : ''))?.longitude ?? 0,
      };
    })
    .filter((a: any) => a.planet1 && a.planet2);

  return {
    planets,
    aspects,
    ascLongitude: ascLon,
    mcLongitude: mcLon,
    ascDegree: Math.floor(ascPos),
    mcDegree: Math.floor(mcPos),
    birthTimeKnown,
  };
}

// ── Math helpers ───────────────────────────────────────────────────────────

function solidColor(color: string): string {
  return color.replace(/rgba?\(([^)]+)\)/, (_: string, inner: string) => {
    const parts = inner.split(',').map((s: string) => s.trim());
    if (parts.length >= 3) {
      const r = Math.round(Number(parts[0]) * 0.60);
      const g = Math.round(Number(parts[1]) * 0.60);
      const b = Math.round(Number(parts[2]) * 0.60);
      return `rgba(${r},${g},${b},1)`;
    }
    return color;
  });
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const a = toRad(angleDeg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function longitudeToScreenAngle(longitude: number, house1Cusp: number): number {
  return 180 - (longitude - house1Cusp);
}

// ── Collision resolution (ported directly from app) ─────────────────────────

type RawPlanet = {
  id: string; glyph: string; color: string; angleDeg: number;
  houseStart: number; houseEnd: number; exactDeg: number;
  degree: number; minutes: number; sign: string; retrograde: boolean;
};

function resolveCollisions(planets: RawPlanet[], minDisplayGap: number): (RawPlanet & { displayAngle: number })[] {
  const result = planets.map(p => ({ ...p, displayAngle: p.angleDeg }));
  const houseMap = new Map<number, typeof result>();
  for (const p of result) {
    if (!houseMap.has(p.houseStart)) houseMap.set(p.houseStart, []);
    houseMap.get(p.houseStart)!.push(p);
  }
  const norm = (a: number) => ((a % 360) + 360) % 360;
  const CLAMP = 2.5;

  for (const group of houseMap.values()) {
    if (group.length < 1) continue;
    const isStellium = group.length >= 6;
    if (isStellium) {
      group.sort((a, b) => a.exactDeg - b.exactDeg);
      const houseStartN = norm(group[0].houseStart);
      const houseEndN = norm(group[0].houseEnd);
      const houseMid = houseStartN > houseEndN ? (houseStartN + houseEndN) / 2 : ((houseStartN + houseEndN + 360) / 2) % 360;
      const gap = 25 / (group.length - 1);
      const totalSpread = (group.length - 1) * gap;
      group.forEach((p, idx) => { p.displayAngle = houseMid + (totalSpread / 2) - idx * gap; });
      continue;
    }
    if (group.length === 1) {
      const p = group[0];
      const display = norm(p.displayAngle);
      const start = norm(p.houseStart);
      const end = norm(p.houseEnd);
      if (start > end) p.displayAngle = Math.min(start - CLAMP, Math.max(end + CLAMP, display));
      continue;
    }
    group.sort((a, b) => a.exactDeg - b.exactDeg);
    const used = new Set<number>();
    const conjGroups: (typeof result)[] = [];
    for (let i = 0; i < group.length; i++) {
      if (used.has(i)) continue;
      const cg: typeof result = [group[i]]; used.add(i);
      let last = i;
      for (let j = i + 1; j < group.length; j++) {
        if (used.has(j)) continue;
        if (group[j].exactDeg - group[last].exactDeg < CONJ_THRESHOLD) { cg.push(group[j]); used.add(j); last = j; } else break;
      }
      conjGroups.push(cg);
    }
    for (const cg of conjGroups) {
      const centerAngle = cg.reduce((sum, p) => sum + p.angleDeg, 0) / cg.length;
      cg.sort((a, b) => b.angleDeg - a.angleDeg);
      const actualSpread = cg.length > 1 ? cg[0].angleDeg - cg[cg.length - 1].angleDeg : 0;
      const neededSpread = (cg.length - 1) * minDisplayGap;
      const totalSpread = Math.max(actualSpread, neededSpread);
      cg.forEach((p, idx) => { p.displayAngle = norm(centerAngle + (totalSpread / 2) - idx * minDisplayGap); });
      cg.sort((a, b) => norm(b.displayAngle) - norm(a.displayAngle));
      const startN = norm(cg[0].houseStart); const endN = norm(cg[0].houseEnd);
      if (startN > endN) {
        const topN = norm(cg[0].displayAngle); const botN = norm(cg[cg.length - 1].displayAngle);
        let shift = 0;
        if (topN > startN - CLAMP) shift = -(topN - (startN - CLAMP));
        else if (botN < endN + CLAMP) shift = (endN + CLAMP) - botN;
        if (shift !== 0) cg.forEach(p => { p.displayAngle = norm(norm(p.displayAngle) + shift); });
      }
    }
    const startN = norm(group[0].houseStart); const endN = norm(group[0].houseEnd);
    const distFromTop = (angle: number): number => { const a = norm(angle); if (startN > endN) return startN - a; return a >= startN ? startN + (360 - a) : startN - a; };
    const distToScreen = (dist: number): number => norm(startN - dist);
    const units = conjGroups.map(cg => ({ planets: cg, center: cg.reduce((sum, p) => sum + distFromTop(p.displayAngle), 0) / cg.length, radius: ((cg.length - 1) / 2) * minDisplayGap }));
    units.sort((a, b) => a.center - b.center);
    const moveUnit = (unit: typeof units[0], delta: number) => { unit.center += delta; unit.planets.forEach(p => { p.displayAngle = distToScreen(distFromTop(p.displayAngle) + delta); }); };
    for (let i = 1; i < units.length; i++) {
      const prev = units[i - 1]; const curr = units[i];
      const required = prev.radius + curr.radius + minDisplayGap; const actual = curr.center - prev.center;
      if (actual < required) { const overlap = required - actual; const bottomEdge = curr.center + curr.radius; const roomBelow = (30 - CLAMP) - bottomEdge; if (roomBelow >= overlap) moveUnit(curr, overlap); else { moveUnit(curr, roomBelow); const remaining = overlap - roomBelow; const topEdge = prev.center - prev.radius; const roomAbove = topEdge - CLAMP; moveUnit(prev, -Math.min(remaining, roomAbove)); } }
    }
    for (let i = units.length - 2; i >= 0; i--) {
      const prev = units[i + 1]; const curr = units[i];
      const required = prev.radius + curr.radius + minDisplayGap; const actual = prev.center - curr.center;
      if (actual < required) { const overlap = required - actual; const topEdge = curr.center - curr.radius; const roomAbove = topEdge - CLAMP; if (roomAbove >= overlap) moveUnit(curr, -overlap); else { moveUnit(curr, -roomAbove); const remaining = overlap - roomAbove; const bottomEdge = prev.center + prev.radius; const roomBelow = (30 - CLAMP) - bottomEdge; moveUnit(prev, Math.min(remaining, roomBelow)); } }
    }
  }
  return result;
}

// ── Chart Wheel Component ──────────────────────────────────────────────────

interface NatalChartWheelWebProps {
  chartData: any;
  birthTimeKnown?: boolean;
  size?: number;
}

export default function NatalChartWheelWeb({ chartData, birthTimeKnown = true, size }: NatalChartWheelWebProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(size ?? 320);

  useEffect(() => {
    if (size) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setW(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [size]);

  const chart = useMemo(() => mapChartData(chartData, birthTimeKnown), [chartData, birthTimeKnown]);

  const CX = W / 2, CY = W / 2, R = W / 2 - 4;
  const R_ZODIAC_OUTER = R;
  const R_ZODIAC_INNER = R * 0.91;
  const R_PLANET_OUTER = R * 0.80;
  const R_PLANET       = R * 0.73;
  const R_PLANET_TICK  = R * 0.79;
  const R_DEG          = R * 0.63;
  const R_ASPECT       = R * 0.38;

  const house1CuspLongitude = Math.floor(chart.ascLongitude / 30) * 30;
  const ascScreenAngle = longitudeToScreenAngle(chart.ascLongitude, house1CuspLongitude);
  const dscScreenAngle = ascScreenAngle + 180;
  const mcScreenAngle  = longitudeToScreenAngle(chart.mcLongitude, house1CuspLongitude);
  const icScreenAngle  = mcScreenAngle + 180;

  const glyphSize = W * 0.032;
  const degStep = W * 0.032;
  const degFontSize = W * 0.019;
  const minDisplayGap = 5.5;

  const zodiacWedges = useMemo(() => ZODIAC_SIGNS.map((sign, i) => {
    const signLongitude = i * 30;
    const startAngle = longitudeToScreenAngle(signLongitude, house1CuspLongitude);
    const endAngle = longitudeToScreenAngle(signLongitude + 30, house1CuspLongitude);
    const glyphAngle = startAngle - 3;
    return { sign, startAngle, endAngle, glyphAngle };
  }), [house1CuspLongitude]);

  const houseBoundaries = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const houseLongitude = house1CuspLongitude + i * 30;
    return { number: i + 1, angle: longitudeToScreenAngle(houseLongitude, house1CuspLongitude), midAngle: longitudeToScreenAngle(houseLongitude + 15, house1CuspLongitude) };
  }), [house1CuspLongitude]);

  const planetPositions = useMemo(() => {
    const visible = chart.planets.filter(p => !DISPLAY_EXCLUDED.has(p.id));
    const raw: RawPlanet[] = visible.map(p => {
      const houseIndex = (p.house ?? 1) - 1;
      const houseStartLon = house1CuspLongitude + houseIndex * 30;
      const houseEndLon = houseStartLon + 30;
      return {
        id: p.id, glyph: p.glyph, color: p.color,
        angleDeg: longitudeToScreenAngle(p.longitude, house1CuspLongitude),
        houseStart: longitudeToScreenAngle(houseStartLon, house1CuspLongitude),
        houseEnd: longitudeToScreenAngle(houseEndLon, house1CuspLongitude),
        exactDeg: p.degree + p.minutes / 60,
        degree: p.degree, minutes: p.minutes, sign: p.sign, retrograde: p.retrograde,
        isAngle: false,
      };
    });
    const resolved = resolveCollisions(raw, minDisplayGap);
    return resolved.map(p => ({ ...p, trueAngleDeg: raw.find(r => r.id === p.id)?.angleDeg ?? p.displayAngle }));
  }, [chart.planets, house1CuspLongitude, minDisplayGap]);

  const aspectLines = useMemo(() => chart.aspects.map((a: any) => {
    const p1 = chart.planets.find(p => p.id === a.planet1);
    const p2 = chart.planets.find(p => p.id === a.planet2);
    if (!p1 || !p2) return null;
    const a1 = toRad(longitudeToScreenAngle(p1.longitude, house1CuspLongitude));
    const a2 = toRad(longitudeToScreenAngle(p2.longitude, house1CuspLongitude));
    return { x1: CX + R_ASPECT * Math.cos(a1), y1: CY + R_ASPECT * Math.sin(a1), x2: CX + R_ASPECT * Math.cos(a2), y2: CY + R_ASPECT * Math.sin(a2), color: ASPECT_COLORS[a.type] ?? 'rgba(26,42,58,0.20)' };
  }).filter(Boolean) as any[], [chart, house1CuspLongitude, CX, CY, R_ASPECT]);

  const axisLabels = chart.birthTimeKnown ? [
    { label: 'ASC', angle: ascScreenAngle, degree: chart.ascDegree },
    { label: 'DSC', angle: dscScreenAngle, degree: chart.ascDegree },
    { label: 'MC',  angle: mcScreenAngle,  degree: chart.mcDegree  },
    { label: 'IC',  angle: icScreenAngle,  degree: chart.mcDegree  },
  ] : [];

  const bandWidth = R_ZODIAC_INNER - R_PLANET_OUTER;
  const labelBadgeR = bandWidth / 2;
  const labelCircleR = R_PLANET_OUTER + labelBadgeR;
  const labelFontSize = (2 * labelBadgeR) / (3 * 0.7) * 0.7;
  const degFontSizeAxis = (2 * labelBadgeR * 0.7) / (3 * 0.7) * 0.7;
  const degBadgeR = degFontSizeAxis * 1.0;
  const degCircleR = R_PLANET_OUTER - degBadgeR;

  if (!chartData) return null;

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: size ? `${size}px` : '100%' }}>
      {/* role="img" + aria-label (a11y Phase 2, SPEC §16): this wheel is a
          visual chart of data that's already fully readable as text
          elsewhere on this page (the List view) — rather than trying to
          label every individual planet/sign glyph and degree drawn inside
          the SVG (which a screen reader would otherwise try to announce
          character-by-character, unreliably), the whole graphic is
          summarized in one label and its internals hidden from assistive
          tech, the standard pattern for a complex decorative/redundant
          inline SVG. */}
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`} role="img" aria-label="Chart wheel showing planet positions by sign and house">

        {/* Zodiac ring */}
        {zodiacWedges.map(({ sign, startAngle, endAngle, glyphAngle }) => {
          const s = toRad(startAngle); const e = toRad(endAngle);
          const x1 = CX + R_ZODIAC_OUTER * Math.cos(s), y1 = CY + R_ZODIAC_OUTER * Math.sin(s);
          const x2 = CX + R_ZODIAC_INNER * Math.cos(s), y2 = CY + R_ZODIAC_INNER * Math.sin(s);
          const x3 = CX + R_ZODIAC_INNER * Math.cos(e), y3 = CY + R_ZODIAC_INNER * Math.sin(e);
          const x4 = CX + R_ZODIAC_OUTER * Math.cos(e), y4 = CY + R_ZODIAC_OUTER * Math.sin(e);
          const path = `M ${x1} ${y1} L ${x2} ${y2} A ${R_ZODIAC_INNER} ${R_ZODIAC_INNER} 0 0 0 ${x3} ${y3} L ${x4} ${y4} A ${R_ZODIAC_OUTER} ${R_ZODIAC_OUTER} 0 0 1 ${x1} ${y1} Z`;
          const gp = pointOnCircle(CX, CY, (R_ZODIAC_OUTER + R_ZODIAC_INNER) / 2, glyphAngle);
          return (
            <g key={sign}>
              <path d={path} fill={ZODIAC_RING_FILL} stroke="rgba(26,42,58,0.12)" strokeWidth={0.5} />
              <text x={gp.x} y={gp.y} fontSize={W * 0.030} textAnchor="middle" dominantBaseline="central" fill="rgba(26,42,58,0.90)" fontFamily="Questrial, sans-serif">{ZODIAC_GLYPHS[sign]}</text>
            </g>
          );
        })}

        {/* Ring borders */}
        <circle cx={CX} cy={CY} r={R_ZODIAC_OUTER} fill="none" stroke="rgba(26,42,58,0.20)" strokeWidth={0.8} />
        <circle cx={CX} cy={CY} r={R_ZODIAC_INNER} fill="rgba(255,248,235,0.70)" stroke="rgba(26,42,58,0.15)" strokeWidth={0.8} />
        <circle cx={CX} cy={CY} r={R_PLANET_OUTER} fill="rgba(255,248,235,0.55)" stroke="rgba(26,42,58,0.10)" strokeWidth={0.5} />
        <circle cx={CX} cy={CY} r={R_ASPECT}       fill="rgba(255,248,235,0.40)" stroke="rgba(26,42,58,0.08)" strokeWidth={0.5} />

        {/* Axis labels */}
        {axisLabels.map(({ label, angle, degree }) => {
          const lc = pointOnCircle(CX, CY, labelCircleR, angle);
          const dc = pointOnCircle(CX, CY, degCircleR, angle);
          const ls = pointOnCircle(CX, CY, R_ASPECT, angle);
          const le = pointOnCircle(CX, CY, R_PLANET_OUTER - degBadgeR * 2, angle);
          return (
            <g key={label}>
              <line x1={ls.x} y1={ls.y} x2={le.x} y2={le.y} stroke="rgba(26,42,58,0.22)" strokeWidth={0.7} />
              <text x={dc.x} y={dc.y} fontSize={degFontSizeAxis} textAnchor="middle" dominantBaseline="central" fill="rgba(26,42,58,0.55)" fontFamily="Questrial, sans-serif">{degree}°</text>
              <text x={lc.x} y={lc.y} fontSize={labelFontSize} textAnchor="middle" dominantBaseline="central" fill="rgba(26,42,58,0.65)" fontFamily="Questrial, sans-serif">{label}</text>
            </g>
          );
        })}

        {/* House spokes */}
        {houseBoundaries.map(({ number, angle, midAngle }) => {
          const isAxis = [1,4,7,10].includes(number);
          const outer = pointOnCircle(CX, CY, R_ZODIAC_INNER, angle);
          const inner = pointOnCircle(CX, CY, R_ASPECT, angle);
          const lp = pointOnCircle(CX, CY, (R_ZODIAC_OUTER + R_ZODIAC_INNER) / 2, midAngle);
          return (
            <g key={number}>
              <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={isAxis ? 'rgba(26,42,58,0.20)' : 'rgba(26,42,58,0.14)'} strokeWidth={isAxis ? 0.6 : 0.5} />
              {chart.birthTimeKnown && <text x={lp.x} y={lp.y} fontSize={W * 0.018} textAnchor="middle" dominantBaseline="central" fill="rgba(26,42,58,0.75)" fontFamily="Questrial, sans-serif">{number}</text>}
            </g>
          );
        })}

        {/* Aspect lines */}
        {aspectLines.map((line: any, i: number) => (
          <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color} strokeWidth={0.8} />
        ))}

        {/* Planet tick marks */}
        {planetPositions.map(p => {
          const inner = pointOnCircle(CX, CY, R_PLANET_OUTER - 2, p.trueAngleDeg);
          const outer = pointOnCircle(CX, CY, R_PLANET_TICK, p.trueAngleDeg);
          return <line key={`tick-${p.id}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={p.color} strokeWidth={0.8} opacity={0.7} />;
        })}

        {/* Planet glyphs + degree stack */}
        {planetPositions.map(p => {
          const p0 = pointOnCircle(CX, CY, R_PLANET, p.displayAngle);
          const p1 = pointOnCircle(CX, CY, R_PLANET - degStep, p.displayAngle);
          const p2 = pointOnCircle(CX, CY, R_DEG, p.displayAngle);
          const p3 = pointOnCircle(CX, CY, R_DEG - degStep, p.displayAngle);
          const p4 = pointOnCircle(CX, CY, R_DEG - degStep * 2, p.displayAngle);
          const signGlyph = ZODIAC_GLYPHS[p.sign] ?? '';
          return (
            <g key={`planet-${p.id}`}>
              <text x={p0.x} y={p0.y} fontSize={glyphSize} textAnchor="middle" dominantBaseline="central" fill={p.color} fontFamily="Questrial, sans-serif">{p.glyph}</text>
              {p.retrograde && <text x={p1.x} y={p1.y} fontSize={W * 0.018} textAnchor="middle" dominantBaseline="central" fill={p.color} opacity={0.8} fontFamily="Questrial, sans-serif">℞</text>}
              <text x={p2.x} y={p2.y} fontSize={degFontSize} textAnchor="middle" dominantBaseline="central" fill={p.color} fontFamily="Questrial, sans-serif">{p.degree}°</text>
              <text x={p3.x} y={p3.y} fontSize={degFontSize} textAnchor="middle" dominantBaseline="central" fill={p.color} opacity={0.75} fontFamily="Questrial, sans-serif">{signGlyph}</text>
              <text x={p4.x} y={p4.y} fontSize={degFontSize} textAnchor="middle" dominantBaseline="central" fill={p.color} fontFamily="Questrial, sans-serif">{String(p.minutes).padStart(2,'0')}'</text>
            </g>
          );
        })}

      </svg>
    </div>
  );
}
