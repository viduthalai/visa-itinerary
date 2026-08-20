/**
 * Timezone-correct duration.
 *
 * The whole point of build step 3: a user enters wall-clock times at two
 * airports in different zones. "15 Oct 17:30" at JFK and "16 Oct 07:20" at MUC
 * look like 13h50m on the clock but are 7h50m of actual elapsed time. Naive
 * date subtraction gets this wrong every time, which is exactly the bug in
 * keyflight's manual mode — it asks the user to type the duration themselves.
 *
 * No dependency: Intl already carries the full IANA database including
 * historical DST rules. We only need it to answer "what is the UTC offset at
 * this instant in this zone".
 */

export type WallTime = {
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:mm` (24h) */
  time: string;
};

/** UTC offset in milliseconds for a given instant in a given IANA zone. */
function offsetMsAt(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const p = parts.find((x) => x.type === type);
    if (!p) throw new Error(`Intl gave no "${type}" part for zone ${tz}`);
    return Number(p.value);
  };

  // Some engines render midnight as hour 24 under hour12:false.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );

  return asIfUtc - instant.getTime();
}

/** Parse `YYYY-MM-DD` + `HH:mm`. Returns null on anything malformed. */
function parseWall(w: WallTime): { y: number; mo: number; d: number; h: number; mi: number } | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w.date.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(w.time.trim());
  if (!dm || !tm) return null;

  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);

  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return { y, mo, d, h, mi };
}

/**
 * Convert a wall-clock time in `tz` to the UTC instant it refers to.
 *
 * Two passes: the first offset lookup uses the naive instant, which can be on
 * the wrong side of a DST transition; re-reading the offset at the corrected
 * instant fixes it. Ambiguous times inside a fall-back hour resolve to the
 * first (pre-transition) occurrence, which matches how airlines print them.
 */
export function wallTimeToInstant(w: WallTime, tz: string): Date | null {
  const p = parseWall(w);
  if (!p) return null;

  const naive = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  const firstOffset = offsetMsAt(new Date(naive), tz);
  let instant = new Date(naive - firstOffset);

  const secondOffset = offsetMsAt(instant, tz);
  if (secondOffset !== firstOffset) instant = new Date(naive - secondOffset);

  return instant;
}

/**
 * Elapsed minutes between two zoned wall times. Negative means the arrival is
 * before the departure — the caller surfaces that as a warning rather than
 * hiding it.
 */
export function elapsedMinutes(
  depart: WallTime,
  departTz: string,
  arrive: WallTime,
  arriveTz: string,
): number | null {
  const a = wallTimeToInstant(depart, departTz);
  const b = wallTimeToInstant(arrive, arriveTz);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/** `7h 50m`, `45m`, `-2h 10m`. */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/** `GMT-4`, `GMT+5:30` — the offset actually in force at that instant. */
export function offsetLabel(w: WallTime, tz: string): string | null {
  const instant = wallTimeToInstant(w, tz);
  if (!instant) return null;

  const total = offsetMsAt(instant, tz) / 60000;
  const sign = total < 0 ? "-" : "+";
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${String(m).padStart(2, "0")}`;
}

/** True when the arrival falls on a later calendar day than the departure. */
export function arrivesNextDay(depart: WallTime, arrive: WallTime): boolean {
  return arrive.date > depart.date;
}
