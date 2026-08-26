import { describe, expect, it } from "vitest";
import { mapAeroFlight } from "@/lib/flightSearch";

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
