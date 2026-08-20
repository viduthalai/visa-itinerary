import type { WallTime } from "@/lib/duration";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * `Thu 15 Oct 2026`. Built from the date parts rather than Intl or toLocaleString
 * so the output is identical on every machine and locale — a document that renders
 * differently for different users is not a document you can support.
 */
export function formatDocDate(date: string, withWeekday = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const body = `${d} ${MONTHS[mo - 1]} ${y}`;
  if (!withWeekday) return body;
  // Date.UTC avoids the local-timezone shift that would otherwise pick the wrong weekday.
  const weekday = DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${weekday} ${body}`;
}

/** `15 Oct 2026 · 17:30` */
export function formatDocDateTime(w: WallTime): string {
  if (!w.date) return "";
  const date = formatDocDate(w.date, false);
  return w.time ? `${date} · ${w.time}` : date;
}
