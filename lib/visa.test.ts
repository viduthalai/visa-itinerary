import { describe, expect, it } from "vitest";
import realData from "@/data/visa.json";
import {
  assessStay,
  decodeCell,
  hasCountry,
  lookupVisa,
  passportProfile,
  STATUS_BY_CODE,
  stayLengthDays,
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

describe("stayLengthDays", () => {
  it("counts whole calendar days between two dates", () => {
    expect(stayLengthDays("2026-10-01", "2026-10-10")).toBe(9);
    expect(stayLengthDays("2026-10-01", "2026-10-02")).toBe(1);
  });

  it("spans month and year boundaries without DST drift", () => {
    // Crosses a spring-forward DST change in many zones; UTC midnights ignore it.
    expect(stayLengthDays("2026-03-01", "2026-04-01")).toBe(31);
    expect(stayLengthDays("2026-12-20", "2027-01-05")).toBe(16);
  });

  it("returns null when there is no computable stay", () => {
    expect(stayLengthDays("2026-10-10", "2026-10-01")).toBeNull(); // return before departure
    expect(stayLengthDays("2026-10-01", "2026-10-01")).toBeNull(); // same day
    expect(stayLengthDays("2026-10-01", "")).toBeNull(); // one-way, no return
    expect(stayLengthDays(null, "2026-10-10")).toBeNull();
    expect(stayLengthDays("2026-10-01", "not-a-date")).toBeNull();
  });
});

describe("assessStay", () => {
  const visaFree60 = lookupVisa(fixture, "IN", "TH"); // F60
  const visaRequired = lookupVisa(fixture, "IN", "US"); // R, no day cap

  it("flags a trip that runs past the permitted stay", () => {
    const a = assessStay(visaFree60, 75);
    expect(a).toEqual({ stayDays: 75, allowedDays: 60, overBy: 15, exceeds: true });
  });

  it("clears a trip inside the limit, reporting the headroom", () => {
    const a = assessStay(visaFree60, 45);
    expect(a?.exceeds).toBe(false);
    expect(a?.overBy).toBe(-15);
  });

  it("treats exactly the cap as within the limit", () => {
    expect(assessStay(visaFree60, 60)?.exceeds).toBe(false);
  });

  it("returns null when there is nothing to check", () => {
    expect(assessStay(visaRequired, 100)).toBeNull(); // no day cap in the dataset
    expect(assessStay(visaFree60, null)).toBeNull(); // stay unknown (one-way)
    expect(assessStay(visaFree60, 0)).toBeNull(); // non-positive stay
    expect(assessStay(null, 30)).toBeNull(); // no requirement (absent pair)
  });
});

describe("passportProfile", () => {
  it("groups a passport's destinations by status, easiest first, with counts", () => {
    const p = passportProfile(fixture, "IN")!; // IN: US=R, TH=F60, AE=V, JP=A
    expect(p.name).toBe("India");
    expect(p.total).toBe(4);
    expect(p.counts).toEqual({ F: 1, A: 1, E: 0, V: 1, R: 1, X: 0 });
    // groups in CODE_ORDER, empty statuses (E, X) dropped
    expect(p.groups.map((g) => g.code)).toEqual(["F", "A", "V", "R"]);
    expect(p.groups[0].label).toBe("Visa-free");
    expect(p.groups[0].destinations).toEqual([
      { iso2: "TH", name: "Thailand", code: "F", days: 60 },
    ]);
  });

  it("headline noAdvanceVisa is visa-free + visa-on-arrival", () => {
    // IN has 1 visa-free (TH) + 1 on-arrival (JP)
    expect(passportProfile(fixture, "IN")!.noAdvanceVisa).toBe(2);
  });

  it("sorts destinations within a group by country name", () => {
    const data: VisaData = {
      ...fixture,
      matrix: { XX: { TH: "F", AU: "F", IN: "F" } },
    };
    expect(passportProfile(data, "XX")!.groups[0].destinations.map((d) => d.name)).toEqual([
      "Australia",
      "India",
      "Thailand",
    ]);
  });

  it("is case-insensitive and returns null for an absent or blank passport", () => {
    expect(passportProfile(fixture, "in")!.total).toBe(4);
    expect(passportProfile(fixture, "ZZ")).toBeNull();
    expect(passportProfile(fixture, "")).toBeNull();
    expect(passportProfile(fixture, null)).toBeNull();
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
