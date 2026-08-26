/**
 * Flight search.
 *
 * Findings from 2026-08-20, all tested directly:
 *   api.skypicker.com/flights?...&partner=picky   -> HTTP 404 (the old keyless door, now dead)
 *   api.tequila.kiwi.com/v2/search                -> HTTP 403 'apikey' header is required
 *   api.travelpayouts.com/aviasales/v3/*          -> HTTP 401 Unauthorized
 *
 * There is no keyless source for forward-dated flights. Providers are tried in
 * order: AeroDataBox (primary — real scheduled flights for any route/date, no
 * price, needs RAPIDAPI_KEY), then Travelpayouts (cached cheapest fares WITH price
 * but sparse per-date, needs TRAVELPAYOUTS_TOKEN), then the mock. With no key the
 * mock serves a fixed result set and the UI labels it as sample data — a mock must
 * never be mistaken for a live lookup.
 *
 * Why AeroDataBox is primary: it returns the actual published schedule (carrier,
 * flight number, real departure/arrival times) for the user's real travel date,
 * which is exactly what the itinerary document needs. It carries no fare, and that
 * is fine — the Fare block is user-entered and optional (see lib/itinerary.ts).
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
  source: "aerodatabox" | "travelpayouts" | "mock";
  /** Set when the provider failed and we fell back or returned nothing. */
  note?: string;
};

/* ── AeroDataBox (via RapidAPI) ───────────────────────────────────────────────
 * The PRIMARY provider. Returns the published schedule of nonstop flights leaving
 * an airport in a time window (max 12h/call, so a full day is two calls). Unlike
 * Travelpayouts' cached fares, a search on the user's real future date reliably
 * has results. No price is returned; transfers is always 0 because each row is a
 * single nonstop leg.
 *
 * Response shape verified against a live call (BLR, 2026-10-15) on 2026-08-26:
 *   flight.number ("EK 569"), flight.airline.iata ("EK"),
 *   flight.departure.scheduledTime.{local:"2026-10-15 04:45+05:30", utc:"...Z"},
 *   flight.arrival.airport.iata ("DXB"), flight.arrival.scheduledTime.utc.
 * The local time uses a SPACE, not "T", so it is normalised for splitIsoLocal;
 * duration is derived from the two UTC instants.
 */
const AERO_HOST = "aerodatabox.p.rapidapi.com";

type AeroTime = { utc?: string; local?: string };
type AeroFlight = {
  number?: string;
  airline?: { name?: string; iata?: string };
  departure?: { scheduledTime?: AeroTime; terminal?: string };
  arrival?: { airport?: { iata?: string }; scheduledTime?: AeroTime };
};

/** AeroDataBox time ("2026-10-14 23:15Z") -> epoch ms. NaN if absent/unparseable. */
function aeroTimeToMs(t: string | undefined): number {
  return t ? Date.parse(t.replace(" ", "T")) : NaN;
}

/**
 * Map one AeroDataBox departure to a FlightResult. Null when it lacks a local
 * departure time or a carrier.
 *
 * flightNumber is the bare number ("569"); toPickedFlight prepends the carrier for
 * display. durationMinutes comes from the two UTC instants — the schedule gives no
 * duration field. transfers is 0: these are nonstop legs.
 */
export function mapAeroFlight(f: AeroFlight): FlightResult | null {
  const local = f.departure?.scheduledTime?.local;
  if (!local) return null;

  const numberRaw = (f.number ?? "").trim();
  const airlineCode = (f.airline?.iata ?? numberRaw.split(/\s+/)[0] ?? "").toUpperCase();
  if (!airlineCode) return null;

  const parts = numberRaw.split(/\s+/);
  let flightNumber = numberRaw;
  if (parts.length > 1) flightNumber = parts.slice(1).join("");
  else if (numberRaw.toUpperCase().startsWith(airlineCode)) flightNumber = numberRaw.slice(airlineCode.length);

  const depMs = aeroTimeToMs(f.departure?.scheduledTime?.utc);
  const arrMs = aeroTimeToMs(f.arrival?.scheduledTime?.utc);
  const durationMinutes =
    Number.isFinite(depMs) && Number.isFinite(arrMs) && arrMs > depMs
      ? Math.round((arrMs - depMs) / 60000)
      : null;

  return {
    airlineCode,
    flightNumber,
    // Normalise the space separator to the "T" splitIsoLocal expects; the offset
    // is already present, so the origin wall time is preserved.
    departureAt: local.replace(" ", "T"),
    durationMinutes,
    transfers: 0,
    price: null,
    currency: null,
  };
}

type AeroWindow = { ok: boolean; status: number; flights: AeroFlight[] };

async function fetchAeroWindow(
  origin: string,
  from: string,
  to: string,
  key: string,
): Promise<AeroWindow> {
  const url =
    `https://${AERO_HOST}/flights/airports/iata/${origin}/${from}/${to}` +
    `?direction=Departure&withLeg=true&withCancelled=false&withCodeshared=false` +
    `&withCargo=false&withPrivate=false&withLocation=false`;

  const res = await fetch(url, {
    headers: { "x-rapidapi-key": key, "x-rapidapi-host": AERO_HOST },
    // Published schedules are stable; cache an hour to conserve the 600 units/month.
    next: { revalidate: 3600 },
  });
  if (!res.ok) return { ok: false, status: res.status, flights: [] };

  const body = (await res.json()) as { departures?: AeroFlight[] };
  return { ok: true, status: 200, flights: Array.isArray(body.departures) ? body.departures : [] };
}

async function searchAeroDataBox(q: SearchQuery, key: string): Promise<SearchResponse> {
  // The window caps at 12h, so a full day is two calls (morning + rest of day).
  const windows: [string, string][] = [
    [`${q.date}T00:00`, `${q.date}T12:00`],
    [`${q.date}T12:00`, `${q.date}T23:59`],
  ];

  // SEQUENTIAL, not parallel. The free tier is 1 req/s; firing both windows at once
  // gets one of them a 429, which fetchAeroWindow reports as !ok. Because only a
  // BOTH-failed case errors out, a parallel call silently returned half the day's
  // flights. Space the calls ~1.1s apart to stay under the limit.
  const parts: AeroWindow[] = [];
  for (let i = 0; i < windows.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1100));
    parts.push(await fetchAeroWindow(q.origin, windows[i][0], windows[i][1], key));
  }

  // Both windows failed — report the status rather than a silent empty list.
  if (parts.every((p) => !p.ok)) {
    return { results: [], source: "aerodatabox", note: `Provider returned HTTP ${parts[0].status}` };
  }

  const dest = q.destination.toUpperCase();
  const seen = new Set<string>();
  const results: FlightResult[] = [];

  for (const p of parts) {
    for (const f of p.flights) {
      if ((f.arrival?.airport?.iata ?? "").toUpperCase() !== dest) continue;
      const mapped = mapAeroFlight(f);
      if (!mapped) continue;
      // A flight near the noon boundary can appear in both windows; de-duplicate.
      const k = `${mapped.airlineCode}${mapped.flightNumber}@${mapped.departureAt}`;
      if (seen.has(k)) continue;
      seen.add(k);
      results.push(mapped);
    }
  }

  results.sort((a, b) => a.departureAt.localeCompare(b.departureAt));

  // If one window failed we are showing PART of the day. Say so rather than
  // presenting a truncated list as complete.
  const partial = parts.some((p) => !p.ok);
  const note =
    results.length === 0
      ? "No scheduled nonstop flights for this route and date."
      : partial
        ? "Showing part of the day — the provider rate-limited one request. Try again for the full list."
        : undefined;

  return { results: results.slice(0, 20), source: "aerodatabox", note };
}

/** Documented Travelpayouts v3 `prices_for_dates` row. Verified against a live response 2026-08-26. */
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
    note: "No flight-provider key is configured, so this is not a live lookup.",
  };
}

/**
 * Server-side only: reads keys from the environment, never the client.
 *
 * Provider order: AeroDataBox (primary — real schedules for any date), then
 * Travelpayouts (cached fares with price), then the labelled mock. A hard failure
 * of a provider falls through to the next rather than dead-ending; a
 * reachable-but-empty result is returned as-is, its note explaining the emptiness.
 */
export async function searchFlights(q: SearchQuery): Promise<SearchResponse> {
  const rapidKey = process.env.RAPIDAPI_KEY;
  if (rapidKey) {
    try {
      return await searchAeroDataBox(q, rapidKey);
    } catch {
      // AeroDataBox unreachable — fall through to the next provider.
    }
  }

  const tpToken = process.env.TRAVELPAYOUTS_TOKEN;
  if (!tpToken) return searchMock(q);

  try {
    return await searchTravelpayouts(q, tpToken);
  } catch (err) {
    return {
      results: [],
      source: "travelpayouts",
      note: `Lookup failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
