import { afterEach, describe, expect, it, vi } from "vitest";
import { mapAeroFlight, searchFlights } from "@/lib/flightSearch";

/*
 * Fixture tests for the AeroDataBox mapping. The fixtures mirror a real live
 * response (BLR, 2026-10-15, confirmed 2026-08-26): local time uses a SPACE and
 * carries an offset, duration is not given (derived from the two UTC instants),
 * and each row is a single nonstop leg.
 */

const ekToDxb = {
  number: "EK 569",
  airline: { name: "Emirates", iata: "EK" },
  departure: { scheduledTime: { utc: "2026-10-14 23:15Z", local: "2026-10-15 04:45+05:30" }, terminal: "2" },
  arrival: {
    airport: { iata: "DXB", name: "Dubai" },
    scheduledTime: { utc: "2026-10-15 03:05Z", local: "2026-10-15 07:05+04:00" },
  },
};

describe("mapAeroFlight", () => {
  it("maps a live-shaped departure, deriving duration from the UTC pair", () => {
    expect(mapAeroFlight(ekToDxb)).toEqual({
      airlineCode: "EK",
      flightNumber: "569", // bare number; toPickedFlight prepends the carrier -> "EK569"
      departureAt: "2026-10-15T04:45+05:30", // space normalised to "T", offset kept
      durationMinutes: 230, // 23:15Z -> 03:05Z next-effective = 3h50m
      transfers: 0, // nonstop leg
      price: null,
      currency: null,
    });
  });

  it("splits the flight number when the carrier code has a digit (e.g. 6E)", () => {
    const r = mapAeroFlight({
      ...ekToDxb,
      number: "6E 1407",
      airline: { name: "IndiGo", iata: "6E" },
    })!;
    expect(r.airlineCode).toBe("6E");
    expect(r.flightNumber).toBe("1407");
  });

  it("derives the carrier from `number` when airline.iata is missing", () => {
    const r = mapAeroFlight({ ...ekToDxb, airline: undefined, number: "AI 2758" })!;
    expect(r.airlineCode).toBe("AI");
    expect(r.flightNumber).toBe("2758");
  });

  it("strips the carrier prefix from a spaceless number (EK569 -> 569)", () => {
    const r = mapAeroFlight({ ...ekToDxb, number: "EK569" })!;
    expect(r.flightNumber).toBe("569");
  });

  it("leaves duration null when an arrival UTC time is missing", () => {
    const r = mapAeroFlight({
      ...ekToDxb,
      arrival: { airport: { iata: "DXB" }, scheduledTime: { local: "2026-10-15 07:05+04:00" } },
    })!;
    expect(r.durationMinutes).toBeNull();
    expect(r.departureAt).toBe("2026-10-15T04:45+05:30");
  });

  it("returns null without a local departure time or a carrier", () => {
    expect(mapAeroFlight({ number: "EK 569", airline: { iata: "EK" } })).toBeNull(); // no departure
    expect(
      mapAeroFlight({ number: "", departure: { scheduledTime: { local: "2026-10-15 04:45+05:30" } } }),
    ).toBeNull(); // no carrier
  });
});

/*
 * The dev quota gate: outside a production build, searchFlights must serve sample
 * data WITHOUT calling a provider, even when a key is configured. fetch is stubbed
 * to throw so any real call would fail the test loudly rather than pass silently.
 */
describe("searchFlights dev gate", () => {
  const query = { origin: "BLR", destination: "DXB", date: "2026-10-15" };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns sample data in development even with a provider key set, and never fetches", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("searchFlights hit the network in development");
    });
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FLIGHTS_LIVE", "");
    vi.stubEnv("RAPIDAPI_KEY", "a-configured-key");

    const res = await searchFlights(query);
    expect(res.source).toBe("mock");
    expect(res.note).toMatch(/development mode/i);
    expect(res.results.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("FLIGHTS_LIVE=true opts a local run back into the real provider path", async () => {
    // With no key configured, the live path falls through providers to the no-key
    // mock — a different note than the dev gate, proving the gate was bypassed.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("no network in this test");
      }),
    );
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FLIGHTS_LIVE", "true");
    vi.stubEnv("RAPIDAPI_KEY", "");
    vi.stubEnv("TRAVELPAYOUTS_TOKEN", "");

    const res = await searchFlights(query);
    expect(res.source).toBe("mock");
    expect(res.note).not.toMatch(/development mode/i);
    expect(res.note).toMatch(/no flight-provider key/i);
  });
});
