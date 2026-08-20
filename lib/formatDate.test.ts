import { describe, expect, it } from "vitest";
import { formatDocDate, formatDocDateTime } from "@/lib/formatDate";

describe("formatDocDate", () => {
  it("formats with a weekday by default", () => {
    expect(formatDocDate("2026-10-15")).toBe("Thu 15 Oct 2026");
  });

  it("omits the weekday when asked", () => {
    expect(formatDocDate("2026-10-15", false)).toBe("15 Oct 2026");
  });

  it("picks the right weekday regardless of the machine timezone", () => {
    // Built with Date.UTC, so a negative-offset machine cannot shift it a day back.
    expect(formatDocDate("2026-01-01")).toBe("Thu 1 Jan 2026");
    expect(formatDocDate("2026-12-31")).toBe("Thu 31 Dec 2026");
  });

  it("does not zero-pad the day", () => {
    expect(formatDocDate("2026-03-05", false)).toBe("5 Mar 2026");
  });

  it("returns empty string for malformed input rather than Invalid Date", () => {
    expect(formatDocDate("")).toBe("");
    expect(formatDocDate("15/10/2026")).toBe("");
  });
});

describe("formatDocDateTime", () => {
  it("joins date and time", () => {
    expect(formatDocDateTime({ date: "2026-10-15", time: "17:30" })).toBe("15 Oct 2026 · 17:30");
  });

  it("omits the separator when there is no time", () => {
    expect(formatDocDateTime({ date: "2026-10-15", time: "" })).toBe("15 Oct 2026");
  });

  it("is empty with no date", () => {
    expect(formatDocDateTime({ date: "", time: "17:30" })).toBe("");
  });
});
