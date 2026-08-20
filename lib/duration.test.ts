import { describe, expect, it } from "vitest";
import {
  arrivesNextDay,
  elapsedMinutes,
  formatDuration,
  offsetLabel,
  wallTimeToInstant,
} from "@/lib/duration";

const JFK = "America/New_York";
const MUC = "Europe/Berlin";
const LHR = "Europe/London";
const KTM = "Asia/Kathmandu"; // +05:45, the awkward one
const PHX = "America/Phoenix"; // no DST

describe("elapsedMinutes — cross-zone", () => {
  it("JFK 17:30 -> MUC 07:20 next day is 7h50m, not 13h50m", () => {
    // Real keyflight search result for LH411 on 15 Oct 2026.
    const mins = elapsedMinutes(
      { date: "2026-10-15", time: "17:30" },
      JFK,
      { date: "2026-10-16", time: "07:20" },
      MUC,
    );
    expect(mins).toBe(470);
    expect(formatDuration(mins!)).toBe("7h 50m");
  });

  it("JFK 16:25 -> MUC 08:10 next day is 9h45m", () => {
    // Condor DE2017 from the same result set, via FRA.
    const mins = elapsedMinutes(
      { date: "2026-10-15", time: "16:25" },
      JFK,
      { date: "2026-10-16", time: "08:10" },
      MUC,
    );
    expect(formatDuration(mins!)).toBe("9h 45m");
  });

  it("handles a half-hour-offset zone", () => {
    // LHR 09:00 BST (+1) -> KTM 22:45 (+5:45) same day = 9h.
    const mins = elapsedMinutes(
      { date: "2026-10-15", time: "09:00" },
      LHR,
      { date: "2026-10-15", time: "22:45" },
      KTM,
    );
    expect(formatDuration(mins!)).toBe("9h");
  });

  it("handles a zone with no DST", () => {
    // PHX is GMT-7 all year; JFK is GMT-4 in October.
    const mins = elapsedMinutes(
      { date: "2026-10-15", time: "08:00" },
      PHX,
      { date: "2026-10-15", time: "15:00" },
      JFK,
    );
    expect(formatDuration(mins!)).toBe("4h");
  });

  it("returns a negative duration rather than hiding an impossible leg", () => {
    const mins = elapsedMinutes(
      { date: "2026-10-15", time: "18:00" },
      JFK,
      { date: "2026-10-15", time: "17:00" },
      JFK,
    );
    expect(mins).toBe(-60);
    expect(formatDuration(mins!)).toBe("-1h");
  });

  it("returns null on malformed input instead of NaN", () => {
    expect(elapsedMinutes({ date: "", time: "" }, JFK, { date: "", time: "" }, MUC)).toBeNull();
    expect(
      elapsedMinutes({ date: "2026-13-40", time: "99:99" }, JFK, { date: "x", time: "y" }, MUC),
    ).toBeNull();
  });
});

describe("DST transitions", () => {
  it("crosses the EU autumn fall-back correctly", () => {
    // 25 Oct 2026: Europe goes +2 -> +1 at 03:00 local.
    // MUC 01:30 (+2, pre-transition) -> MUC 04:30 (+1, post) is 4h elapsed, not 3h.
    const mins = elapsedMinutes(
      { date: "2026-10-25", time: "01:30" },
      MUC,
      { date: "2026-10-25", time: "04:30" },
      MUC,
    );
    expect(mins).toBe(240);
  });

  it("crosses the US spring-forward correctly", () => {
    // 8 Mar 2026: US goes -5 -> -4 at 02:00 local, so 01:30 -> 03:30 is 1h.
    const mins = elapsedMinutes(
      { date: "2026-03-08", time: "01:30" },
      JFK,
      { date: "2026-03-08", time: "03:30" },
      JFK,
    );
    expect(mins).toBe(60);
  });

  it("reports the offset in force on the day, not a fixed one", () => {
    expect(offsetLabel({ date: "2026-10-15", time: "12:00" }, JFK)).toBe("GMT-4"); // EDT
    expect(offsetLabel({ date: "2026-12-15", time: "12:00" }, JFK)).toBe("GMT-5"); // EST
    expect(offsetLabel({ date: "2026-10-15", time: "12:00" }, KTM)).toBe("GMT+5:45");
  });
});

describe("helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(470)).toBe("7h 50m");
  });

  it("detects a next-day arrival", () => {
    expect(arrivesNextDay({ date: "2026-10-15", time: "23:00" }, { date: "2026-10-16", time: "01:00" })).toBe(true);
    expect(arrivesNextDay({ date: "2026-10-15", time: "09:00" }, { date: "2026-10-15", time: "11:00" })).toBe(false);
  });

  it("resolves a wall time to a real instant", () => {
    const i = wallTimeToInstant({ date: "2026-10-15", time: "17:30" }, JFK);
    expect(i?.toISOString()).toBe("2026-10-15T21:30:00.000Z"); // EDT = GMT-4
  });
});
