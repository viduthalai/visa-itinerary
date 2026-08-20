import { describe, expect, it } from "vitest";
import { progressPct } from "@/lib/progress";

describe("progressPct", () => {
  it("shows progress on the FIRST step — the bug this pins", () => {
    // Was 0% with the (current-1)/(total-1) form, which read as "nothing started".
    expect(progressPct(1, 5)).toBe(20);
  });

  it("fills completely only on the last step", () => {
    expect(progressPct(5, 5)).toBe(100);
    expect(progressPct(4, 5)).toBe(80);
  });

  it("steps evenly", () => {
    expect([1, 2, 3, 4, 5].map((n) => progressPct(n, 5))).toEqual([20, 40, 60, 80, 100]);
  });

  it("is never empty for a valid step", () => {
    for (let total = 1; total <= 8; total++) {
      for (let n = 1; n <= total; n++) {
        expect(progressPct(n, total)).toBeGreaterThan(0);
      }
    }
  });

  it("clamps out-of-range input instead of overflowing the bar", () => {
    expect(progressPct(9, 5)).toBe(100);
    expect(progressPct(0, 5)).toBe(20);
    expect(progressPct(-3, 5)).toBe(20);
  });

  it("returns 0 for a nonsensical total rather than dividing by zero", () => {
    expect(progressPct(1, 0)).toBe(0);
  });
});
