import { describe, expect, it } from "vitest";
import realData from "@/data/visa.json";
import {
  decodeCell,
  hasCountry,
  lookupVisa,
  STATUS_BY_CODE,
  visaCountries,
  type VisaData,
} from "@/lib/visa";

/*
 * A tiny hand-built matrix. Value-level assertions run against THIS, never the real
 * dataset: the real one is a periodically-updated community source, so asserting
 * "IN->US is visa required" here would make the suite fail the day a policy changes,
 * not the day the code breaks. The real file gets a structural test instead, below.
 */
const fixture: VisaData = {
  meta: {
    source: "fixture",
    sourceUrl: "",
    license: "MIT",
    built: "2026-01-01",
    statusCodes: {},
  },
  matrix: {
    IN: { US: "R", TH: "F60", AE: "V", JP: "A" },
    US: { GB: "E180", IN: "V30" },
  },
};

describe("decodeCell", () => {
  it("splits a status letter from a trailing day count", () => {
    expect(decodeCell("F60")).toEqual({ code: "F", days: 60 });
    expect(decodeCell("E180")).toEqual({ code: "E", days: 180 });
  });

  it("returns null days when no count is present", () => {
    expect(decodeCell("R")).toEqual({ code: "R", days: null });
  });

  it("returns null for an empty or unknown code rather than throwing", () => {
    expect(decodeCell("")).toBeNull();
    expect(decodeCell(undefined)).toBeNull();
    expect(decodeCell("Z9")).toBeNull();
  });
});

describe("lookupVisa", () => {
  it("resolves a visa-free stay with its day count", () => {
    const r = lookupVisa(fixture, "IN", "TH");
    expect(r?.status).toBe("visa free");
    expect(r?.label).toBe("Visa-free");
    expect(r?.days).toBe(60);
    expect(r?.tone).toBe("ok");
  });

  it("maps each code to the right status and tone", () => {
    expect(lookupVisa(fixture, "IN", "US")?.status).toBe("visa required");
    expect(lookupVisa(fixture, "IN", "US")?.tone).toBe("alert");
    expect(lookupVisa(fixture, "IN", "AE")?.status).toBe("e-visa");
    expect(lookupVisa(fixture, "IN", "AE")?.tone).toBe("notice");
    expect(lookupVisa(fixture, "IN", "JP")?.status).toBe("visa on arrival");
    expect(lookupVisa(fixture, "US", "GB")?.status).toBe("eta");
  });

  it("is case-insensitive on both codes", () => {
    expect(lookupVisa(fixture, "in", "th")?.days).toBe(60);
  });

  it("treats a same-country pair as home, not missing data", () => {
    const r = lookupVisa(fixture, "IN", "IN");
    expect(r?.label).toBe("Home country");
    expect(r?.tone).toBe("ok");
  });

  it("returns null for an absent pair or blank input", () => {
    expect(lookupVisa(fixture, "IN", "ZZ")).toBeNull();
    expect(lookupVisa(fixture, "", "US")).toBeNull();
    expect(lookupVisa(fixture, "IN", null)).toBeNull();
  });
});

describe("visaCountries / hasCountry", () => {
  it("lists every matrix passport, named and alphabetised", () => {
    const names = visaCountries(fixture).map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(visaCountries(fixture)).toHaveLength(2); // IN, US
  });

  it("guards whether a destination is offered", () => {
    expect(hasCountry(fixture, "US")).toBe(true);
    expect(hasCountry(fixture, "xx")).toBe(false);
    expect(hasCountry(fixture, null)).toBe(false);
  });
});

/*
 * Structural test over the REAL bundle. This is the visa analogue of
 * svgAssets.test.ts: it does not assert any policy value (those change), it asserts
 * the file the app ships is well-formed and stays in lockstep with the decoder — no
 * cell may carry a status the decoder does not know, which is exactly what the
 * build's closed vocabulary is meant to guarantee.
 */
describe("bundled data/visa.json", () => {
  const data = realData as unknown as VisaData;

  it("is MIT-licensed with a build date", () => {
    expect(data.meta.license).toBe("MIT");
    expect(data.meta.built).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("carries the full country set", () => {
    expect(Object.keys(data.matrix).length).toBeGreaterThanOrEqual(190);
  });

  it("has no cell the decoder cannot read", () => {
    const codes = Object.keys(STATUS_BY_CODE);
    for (const from of Object.keys(data.matrix)) {
      for (const to of Object.keys(data.matrix[from])) {
        const decoded = decodeCell(data.matrix[from][to]);
        expect(decoded, `${from}->${to} = ${data.matrix[from][to]}`).not.toBeNull();
        expect(codes).toContain(decoded!.code);
      }
    }
  });
});
