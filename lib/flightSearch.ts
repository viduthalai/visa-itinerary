/**
 * Flight search.
 *
 * Findings from 2026-08-20, all tested directly:
 *   api.skypicker.com/flights?...&partner=picky   -> HTTP 404 (the old keyless door, now dead)
 *   api.tequila.kiwi.com/v2/search                -> HTTP 403 'apikey' header is required
 *   api.travelpayouts.com/aviasales/v3/*          -> HTTP 401 Unauthorized
 *
 * There is no keyless source for forward-dated flights. Travelpayouts is the only
 * one with a genuinely free token (register as a partner, Profile -> API token),
 * so it is the real provider. Until a token exists the mock provider serves a
 * fixed result set and the UI labels it as sample data — a mock must never be
 * mistaken for a live lookup.
 */

export type SearchQuery = {
  origin: string;
  destination: string;
  /** `YYYY-MM-DD` */
  date: string;
};

export type FlightResult = {
  airlineCode: string;
  flightNumber: string;
  /** ISO 8601 with offset, e.g. 2026-10-15T17:30:00-04:00 */
  departureAt: string;
  /** Minutes. Null when the provider does not supply it. */
  durationMinutes: number | null;
  transfers: number;
  price: number | null;
  currency: string | null;
};

export type SearchResponse = {
  results: FlightResult[];
  /** Which provider answered — surfaced in the UI so sample data is never silent. */
  source: "travelpayouts" | "mock";
  /** Set when the provider failed and we fell back or returned nothing. */
  note?: string;
};

/** Documented Travelpayouts v3 `prices_for_dates` row. NOT yet verified against a live response. */
type TpRow = {
  origin?: string;
  destination?: string;
  price?: number;
  airline?: string;
  flight_number?: string | number;
  departure_at?: string;
  transfers?: number;
  duration_to?: number;
  duration?: number;
};

function mapTpRow(r: TpRow): FlightResult | null {
  if (!r.departure_at || !r.airline) return null;
  return {
    airlineCode: String(r.airline).toUpperCase(),
    flightNumber: r.flight_number ? String(r.flight_number) : "",
    departureAt: r.departure_at,
    durationMinutes: r.duration_to ?? r.duration ?? null,
    transfers: r.transfers ?? 0,
    price: typeof r.price === "number" ? r.price : null,
    currency: typeof r.price === "number" ? "USD" : null,
  };
}

async function searchTravelpayouts(q: SearchQuery, token: string): Promise<SearchResponse> {
  const url = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
  url.searchParams.set("origin", q.origin);
  url.searchParams.set("destination", q.destination);
  url.searchParams.set("departure_at", q.date);
  url.searchParams.set("currency", "usd");
  url.searchParams.set("sorting", "price");
  url.searchParams.set("direct", "false");
  url.searchParams.set("limit", "10");
  url.searchParams.set("one_way", "true");

  const res = await fetch(url, {
    headers: { "X-Access-Token": token, Accept: "application/json" },
    // Cached fares, not live availability — a short cache is honest and cheap.
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    return { results: [], source: "travelpayouts", note: `Provider returned HTTP ${res.status}` };
  }

  const body = (await res.json()) as { success?: boolean; data?: TpRow[] };
  const rows = Array.isArray(body.data) ? body.data : [];
  const results = rows.map(mapTpRow).filter((r): r is FlightResult => r !== null);

  return {
    results,
    source: "travelpayouts",
    note: results.length === 0 ? "No cached fares for this route and date." : undefined,
  };
}

/**
 * Fixed sample data, shaped from a real keyflight search (JFK->MUC, 15 Oct 2026).
 * Times are rebased onto the requested date so the UI behaves sensibly, but the
 * carriers and durations are fixed — this is sample data, not a lookup.
 */
function searchMock(q: SearchQuery): SearchResponse {
  const template: Array<Omit<FlightResult, "departureAt"> & { time: string }> = [
    { airlineCode: "LH", flightNumber: "411", time: "17:30", durationMinutes: 470, transfers: 0, price: 670, currency: "USD" },
    { airlineCode: "UA", flightNumber: "8870", time: "17:30", durationMinutes: 470, transfers: 0, price: 674, currency: "USD" },
    { airlineCode: "DE", flightNumber: "2017", time: "16:25", durationMinutes: 585, transfers: 1, price: 646, currency: "USD" },
  ];

  return {
    results: template.map(({ time, ...rest }) => ({
      ...rest,
      departureAt: `${q.date}T${time}:00`,
    })),
    source: "mock",
    note: "Sample data. No TRAVELPAYOUTS_TOKEN is configured, so this is not a live lookup.",
  };
}

/** Server-side only: reads the token from the environment, never the client. */
export async function searchFlights(q: SearchQuery): Promise<SearchResponse> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return searchMock(q);

  try {
    const live = await searchTravelpayouts(q, token);
    if (live.results.length > 0) return live;
    // Provider reachable but empty: say so rather than silently showing samples.
    return live;
  } catch (err) {
    return {
      results: [],
      source: "travelpayouts",
      note: `Lookup failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
