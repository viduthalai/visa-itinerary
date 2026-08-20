import { describe, expect, it } from "vitest";
import { formatAirport, getAirport, searchAirports } from "@/lib/airports";

describe("searchAirports", () => {
  it("returns nothing for queries under 2 characters", () => {
    expect(searchAirports("")).toEqual([]);
    expect(searchAirports("J")).toEqual([]);
  });

  it("ranks an exact IATA code first", () => {
    expect(searchAirports("muc")[0].iata).toBe("MUC");
    expect(searchAirports("jfk")[0].iata).toBe("JFK");
  });

  it("matches on city name", () => {
    const codes = searchAirports("munich").map((a) => a.iata);
    expect(codes).toContain("MUC");
  });

  it("respects the limit", () => {
    expect(searchAirports("air", 3)).toHaveLength(3);
  });

  it("returns an empty list for nonsense rather than throwing", () => {
    expect(searchAirports("zzzzzzqqq")).toEqual([]);
  });
});

describe("airport records", () => {
  it("carries an IANA timezone derived at build time", () => {
    expect(getAirport("JFK")?.tz).toBe("America/New_York");
    expect(getAirport("MUC")?.tz).toBe("Europe/Berlin");
  });

  it("is case insensitive on lookup", () => {
    expect(getAirport("jfk")?.iata).toBe("JFK");
  });

  it("formats with code, name and city", () => {
    expect(formatAirport(getAirport("MUC")!)).toBe("MUC — Munich Airport, Munich");
  });
});
