import airportsRaw from "@/data/airports.json";

export type Airport = {
  iata: string;
  icao: string | null;
  name: string;
  city: string | null;
  country: string;
  /** IANA zone, derived from coordinates at build time (see scripts/build-airports.mjs). */
  tz: string;
  lat: number;
  lon: number;
};

export const AIRPORTS = airportsRaw as Airport[];

const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

export function getAirport(iata: string | null | undefined): Airport | undefined {
  if (!iata) return undefined;
  return BY_IATA.get(iata.toUpperCase());
}

/** `JFK — John F. Kennedy International Airport, New York` */
export function formatAirport(a: Airport): string {
  return a.city ? `${a.iata} — ${a.name}, ${a.city}` : `${a.iata} — ${a.name}`;
}

/**
 * Rank matches so an exact IATA code always wins. Typing "MUC" must not bury
 * Munich under airports whose *name* happens to contain "muc".
 */
function score(a: Airport, q: string): number {
  const iata = a.iata.toLowerCase();
  if (iata === q) return 0;
  if (iata.startsWith(q)) return 1;
  const city = a.city?.toLowerCase() ?? "";
  if (city.startsWith(q)) return 2;
  const name = a.name.toLowerCase();
  if (name.startsWith(q)) return 3;
  if (city.includes(q)) return 4;
  if (name.includes(q)) return 5;
  return Number.POSITIVE_INFINITY;
}

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const hits: { a: Airport; s: number }[] = [];
  for (const a of AIRPORTS) {
    const s = score(a, q);
    if (s !== Number.POSITIVE_INFINITY) hits.push({ a, s });
  }

  hits.sort((x, y) => x.s - y.s || x.a.iata.localeCompare(y.a.iata));
  return hits.slice(0, limit).map((h) => h.a);
}
