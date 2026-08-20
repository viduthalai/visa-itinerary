"use client";

import { useState } from "react";
import { getAirport } from "@/lib/airports";
import { formatDuration, offsetLabel, type WallTime } from "@/lib/duration";
import type { FlightResult, SearchResponse } from "@/lib/flightSearch";

export type PickedFlight = {
  airline: string;
  flightNumber: string;
  depart: WallTime;
  arrive: WallTime;
};

type Props = {
  originIata: string | null;
  destinationIata: string | null;
  date: string;
  onPick: (f: PickedFlight) => void;
};

/** `2026-10-15T17:30:00-04:00` -> { date, time } as printed at the origin airport. */
function splitIsoLocal(iso: string): WallTime | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? { date: m[1], time: m[2] } : null;
}

/**
 * Add `minutes` to a wall time in `fromTz` and express the result in `toTz`.
 * The provider gives a departure and a duration; the arrival wall time has to be
 * computed, and it has to be computed in the destination's zone or the document
 * prints a time that airport would never show.
 */
function arrivalWallTime(
  depart: WallTime,
  fromTz: string,
  minutes: number,
  toTz: string,
): WallTime | null {
  const departIso = `${depart.date}T${depart.time}:00`;
  const naive = Date.parse(`${departIso}Z`);
  if (Number.isNaN(naive)) return null;

  // Resolve the departure to a true instant, then add the flight time.
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
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return (asUtc - instant.getTime()) / 60000;
}

export function FlightSearch({ originIata, destinationIata, date, onPick }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const origin = getAirport(originIata);
  const destination = getAirport(destinationIata);
  const ready = Boolean(origin && destination && /^\d{4}-\d{2}-\d{2}$/.test(date));

  async function run() {
    if (!ready) return;
    setState("loading");
    setError(null);
    try {
      const res = await fetch(
        `/api/flights?origin=${origin!.iata}&destination=${destination!.iata}&date=${date}`,
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        setState("error");
        return;
      }
      setData(body as SearchResponse);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setState("error");
    }
  }

  function pick(r: FlightResult) {
    if (!origin || !destination) return;
    const depart = splitIsoLocal(r.departureAt);
    if (!depart) return;

    const arrive =
      r.durationMinutes !== null
        ? arrivalWallTime(depart, origin.tz, r.durationMinutes, destination.tz)
        : null;

    onPick({
      airline: r.airlineCode,
      flightNumber: `${r.airlineCode}${r.flightNumber}`,
      depart,
      // No duration from the provider means we cannot compute an arrival. Leave it
      // blank for the user rather than guessing one.
      arrive: arrive ?? { date: "", time: "" },
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Search flights</div>
        <button
          type="button"
          onClick={run}
          disabled={!ready || state === "loading"}
          className="rounded-md bg-neutral-900 px-3.5 py-1.5 text-xs text-white
                     disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {state === "loading" ? "Searching…" : "Search"}
        </button>
      </div>

      {!ready && (
        <p className="mt-1 text-xs text-neutral-500">
          Set both airports and a departure date on flight 1 to search.
        </p>
      )}

      {state === "error" && (
        <p className="mt-2 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-700">{error}</p>
      )}

      {state === "done" && data && (
        <>
          {data.source === "mock" && (
            <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs
                          text-amber-900">
              <span className="font-semibold">Sample data.</span> {data.note}
            </p>
          )}
          {data.source === "travelpayouts" && data.note && (
            <p className="mt-2 text-xs text-neutral-500">{data.note}</p>
          )}

          <ul className="mt-3 divide-y divide-neutral-100">
            {data.results.map((r, i) => {
              const depart = splitIsoLocal(r.departureAt);
              const dOff = depart && origin ? offsetLabel(depart, origin.tz) : null;
              return (
                <li key={`${r.airlineCode}${r.flightNumber}-${i}`}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-baseline gap-3 py-2 text-left text-sm
                               hover:bg-neutral-50"
                  >
                    <span className="w-16 font-mono text-xs font-semibold">
                      {r.airlineCode}
                      {r.flightNumber}
                    </span>
                    <span className="font-mono text-xs">{depart?.time ?? "—"}</span>
                    {dOff && <span className="text-xs text-neutral-400">{dOff}</span>}
                    <span className="text-xs text-neutral-600">
                      {r.durationMinutes !== null ? formatDuration(r.durationMinutes) : "—"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {r.transfers === 0 ? "direct" : `${r.transfers} stop`}
                    </span>
                    <span className="ml-auto text-xs text-neutral-500">
                      {r.price !== null ? `${r.currency === "USD" ? "$" : ""}${r.price}` : ""}
                    </span>
                    <span className="text-xs font-medium text-neutral-900">Use</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {data.results.length === 0 && (
            <p className="mt-2 text-xs text-neutral-500">No flights returned.</p>
          )}
        </>
      )}
    </div>
  );
}
