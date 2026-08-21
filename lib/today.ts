"use client";

import { useEffect, useState } from "react";

/**
 * Local calendar date as `YYYY-MM-DD`, which is the format `<input type="date">`
 * requires for `min`.
 *
 * Built from the LOCAL date parts, not `toISOString()`. `toISOString` converts to
 * UTC first, so for anyone east of Greenwich late in the evening — or west of it
 * early in the morning — it returns the wrong calendar day and would let the user
 * pick yesterday, or block today. Same reasoning as lib/formatDate.ts avoiding
 * `toLocaleString`.
 *
 * Pure and injectable so the boundary cases are testable without mocking a clock.
 */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * `undefined` on the first render, then today's date once mounted.
 *
 * Reading the clock during render is a hydration mismatch: the server renders the
 * date at build/request time and the browser renders it at hydration time, and the
 * two disagree across a midnight boundary or a timezone difference. This project
 * has already been bitten twice by exactly this class of bug (the PNR generator and
 * the module-scoped id counter), so the clock is read in an effect instead.
 *
 * Returning `undefined` first is the important part: the server emits no `min`
 * attribute, the client's first render emits no `min` attribute, so the trees match.
 * The constraint appears a tick later. That tick is invisible to a user — they
 * cannot open the date picker before the page has mounted — and `min` is a UI
 * convenience, never the validation boundary.
 */
export function useTodayIso(): string | undefined {
  const [today, setToday] = useState<string | undefined>(undefined);
  useEffect(() => setToday(todayIso()), []);
  return today;
}
