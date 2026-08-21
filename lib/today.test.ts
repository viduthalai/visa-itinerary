import { describe, expect, it } from "vitest";
import { todayIso } from "./today";

describe("todayIso", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(todayIso(new Date(2026, 7, 21, 12, 0, 0))).toBe("2026-08-21");
  });

  it("zero-pads single-digit months and days", () => {
    expect(todayIso(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05");
  });

  it("uses the LOCAL calendar day, not the UTC one", () => {
    // 23:30 local on 21 Aug. Anywhere east of Greenwich, `toISOString()` has
    // already rolled over to the 22nd — which would block today's date in the
    // picker. Anywhere west, an early-morning time rolls BACK and would allow
    // yesterday. Reading the local parts is immune to both.
    const late = new Date(2026, 7, 21, 23, 30, 0);
    expect(todayIso(late)).toBe("2026-08-21");

    const early = new Date(2026, 7, 21, 0, 15, 0);
    expect(todayIso(early)).toBe("2026-08-21");
  });

  it("handles a year boundary in both directions", () => {
    expect(todayIso(new Date(2026, 11, 31, 23, 59, 0))).toBe("2026-12-31");
    expect(todayIso(new Date(2027, 0, 1, 0, 1, 0))).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(todayIso(new Date(2028, 1, 29, 12, 0, 0))).toBe("2028-02-29");
  });
});
