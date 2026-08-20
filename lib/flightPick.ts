import type { WallTime } from "@/lib/duration";
import type { FlightResult } from "@/lib/flightSearch";

/** `2026-10-15T17:30:00-04:00` -> { date, time } as printed at the origin airport. */
export function splitIsoLocal(iso: string): WallTime | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? { date: m[1], time: m[2] } : null;
}

function tzOffsetMinutes(instant: Date, tz: string): number {
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
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(
    g("year"),
    g("month") - 1,
    g("day"),
    g("hour") % 24,
    g("minute"),
    g("second"),
  );
  return (asUtc - instant.getTime()) / 60000;
}

/**
 * Add `minutes` to a wall time in `fromTz` and express the result in `toTz`.
 *
 * The provider gives a departure and a duration, never an arrival. The arrival
 * has to be computed in the DESTINATION's zone — compute it in the origin's and
 * the document prints a time that airport would never show on a board.
 */
export function arrivalWallTime(
  depart: WallTime,
  fromTz: string,
  minutes: number,
  toTz: string,
): WallTime | null {
  const naive = Date.parse(`${depart.date}T${depart.time}:00Z`);
  if (Number.isNaN(naive)) return null;

  const offsetAtDepart = tzOffsetMinutes(new Date(naive), fromTz);
  const instant = new Date(naive - offsetAtDepart * 60000 + minutes * 60000);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: toTz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${hour}:${get("minute")}` };
}

export type PickedFlight = {
  /** IATA carrier code — the name is looked up from it, never carried as text. */
  airlineCode: string;
  flightNumber: string;
  depart: WallTime;
  arrive: WallTime;
};

/**
 * Turn a provider result into segment fields. Returns null when the departure is
 * unparseable. A missing duration leaves the arrival blank for the user rather
 * than guessing one.
 */
export function toPickedFlight(
  r: FlightResult,
  originTz: string,
  destinationTz: string,
): PickedFlight | null {
  const depart = splitIsoLocal(r.departureAt);
  if (!depart) return null;

  const arrive =
    r.durationMinutes !== null
      ? arrivalWallTime(depart, originTz, r.durationMinutes, destinationTz)
      : null;

  return {
    airlineCode: r.airlineCode,
    flightNumber: `${r.airlineCode}${r.flightNumber}`,
    depart,
    arrive: arrive ?? { date: "", time: "" },
  };
}
