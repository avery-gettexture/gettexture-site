import { supabase } from '@/lib/supabase';

export interface ReferenceEntry {
  category: string;
  name: string;
  description: string;
}

export interface PlacementReferenceResult {
  planet: ReferenceEntry | null;
  sign: ReferenceEntry | null;
  house: ReferenceEntry | null;
  motion: ReferenceEntry | null;
  degree: ReferenceEntry | null;
  aspects: Array<{
    instance: string;
    entry: ReferenceEntry;
    showDescription: boolean;
  }>;
}

function degreeBucket(degree: number): 'Early' | 'Middle' | 'Late' {
  if (degree <= 9)  return 'Early';
  if (degree <= 19) return 'Middle';
  return 'Late';
}

const HOUSE_ORDINALS: Record<string, string> = {
  First_House: '1st House', Second_House: '2nd House', Third_House: '3rd House',
  Fourth_House: '4th House', Fifth_House: '5th House', Sixth_House: '6th House',
  Seventh_House: '7th House', Eighth_House: '8th House', Ninth_House: '9th House',
  Tenth_House: '10th House', Eleventh_House: '11th House', Twelfth_House: '12th House',
};

const SIGN_ABBR_MAP: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

// Map from proxy planet name to display name
const PLANET_DISPLAY_NAMES: Record<string, string> = {
  Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus',
  Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus',
  Neptune: 'Neptune', Pluto: 'Pluto',
  Mean_North_Lunar_Node: 'North Node', Mean_South_Lunar_Node: 'South Node',
  Ascendant: 'Ascendant', Medium_Coeli: 'Midheaven',
};

// Map from our planet ID to proxy planet name
const PLANET_ID_TO_PROXY_NAME: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus',
  neptune: 'Neptune', pluto: 'Pluto',
  'north-node': 'Mean_North_Lunar_Node', 'south-node': 'Mean_South_Lunar_Node',
  asc: 'Ascendant', mc: 'Medium_Coeli',
};

export async function fetchPlanetReference(
  planetId: string,
  chartData: any,
  birthTimeKnown: boolean,
): Promise<PlacementReferenceResult> {
  const subject = chartData?.subject ?? {};
  const aspects = chartData?.aspects ?? [];

  // Get planet key in subject
  const proxyName = PLANET_ID_TO_PROXY_NAME[planetId];
  if (!proxyName) return { planet: null, sign: null, house: null, motion: null, degree: null, aspects: [] };

  const proxyKey = proxyName.toLowerCase();
  const planetData = subject[proxyKey] ?? subject[proxyName] ?? null;
  if (!planetData) return { planet: null, sign: null, house: null, motion: null, degree: null, aspects: [] };

  const sign = SIGN_ABBR_MAP[planetData.sign] ?? planetData.sign ?? '';
  const houseLabel = birthTimeKnown && !['ascendant', 'medium_coeli'].includes(proxyKey)
    ? (HOUSE_ORDINALS[planetData.house] ?? null)
    : null;
  const degree = Math.floor(planetData.position ?? 0);
  const bucket = degreeBucket(degree);
  const motion = planetData.retrograde ? 'Retrograde' : 'Direct';

  // Get display name for reference lookup
  const planetDisplayName = PLANET_DISPLAY_NAMES[proxyName] ?? proxyName;

  // Find aspects within 3° orb for this planet
  const planetAspects = aspects.filter((a: any) =>
    (a.p1_name === proxyName || a.p2_name === proxyName) && a.orbit <= 3
  );

  // Get unique aspect types
  const aspectTypes = [...new Set(planetAspects.map((a: any) =>
    a.aspect.charAt(0).toUpperCase() + a.aspect.slice(1)
  ))] as string[];

  // Build names to fetch
  const namesToFetch = [
    planetDisplayName,
    sign,
    bucket,
    motion,
    ...aspectTypes,
  ];
  if (houseLabel) namesToFetch.push(houseLabel);

  // Single Supabase query
  const { data, error } = await supabase
    .from('reference_content')
    .select('category, name, description')
    .in('name', namesToFetch)
    .eq('version', 1);

  if (error || !data) {
    return { planet: null, sign: null, house: null, motion: null, degree: null, aspects: [] };
  }

  const find = (category: string, name: string): ReferenceEntry | null =>
    data.find(r => r.category === category && r.name === name) ?? null;

  // Build aspect results with instance lines
  const aspectResults = planetAspects.map((a: any) => {
    const aspectType = a.aspect.charAt(0).toUpperCase() + a.aspect.slice(1);
    const otherName = a.p1_name === proxyName ? a.p2_name : a.p1_name;
    const otherDisplay = PLANET_DISPLAY_NAMES[otherName] ?? otherName;
    const instance = `${planetDisplayName} ${a.aspect} ${otherDisplay}, ${a.orbit.toFixed(1)}°`;
    const entry = find('aspect', aspectType);
    return entry ? { instance, entry } : null;
  }).filter(Boolean) as PlacementReferenceResult['aspects'];

  const aspectTypesSeen = new Set<string>();
  const aspectResultsFinal = aspectResults.map(a => {
    const isFirstOfType = !aspectTypesSeen.has(a.entry.name);
    aspectTypesSeen.add(a.entry.name);
    return { ...a, showDescription: isFirstOfType };
  });

  return {
    planet:   find('planet', planetDisplayName),
    sign:     find('sign', sign),
    house:    houseLabel ? find('house', houseLabel) : null,
    motion:   find('motion', motion),
    degree:   find('degree', bucket),
    aspects:  aspectResultsFinal,
  };
}

// Fetch reference for all planets in background
export async function fetchAllPlanetReferences(
  planetIds: string[],
  chartData: any,
  birthTimeKnown: boolean,
): Promise<Record<string, PlacementReferenceResult>> {
  const results = await Promise.all(
    planetIds.map(async id => ({
      id,
      result: await fetchPlanetReference(id, chartData, birthTimeKnown),
    }))
  );
  return Object.fromEntries(results.map(r => [r.id, r.result]));
}
