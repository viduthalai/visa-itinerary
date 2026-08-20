"use client";

import { airlineName } from "@/lib/airlines";
import { type Airport } from "@/lib/airports";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { splitIsoLocal } from "@/lib/flightPick";
import type { FlightResult, SearchResponse } from "@/lib/flightSearch";

type Props = {
  data: SearchResponse;
  origin: Airport;
  selectedFlightNumber: string;
  onPick: (r: FlightResult) => void;
};

export function FlightResults({ data, origin, selectedFlightNumber, onPick }: Props) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {data.source === "mock" && (
        <p className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs
                      text-amber-900">
          <span className="font-semibold">Sample data.</span> {data.note}
        </p>
      )}
      {data.source === "travelpayouts" && data.note && (
        <p className="mb-2 text-xs text-neutral-500">{data.note}</p>
      )}

      {data.results.length === 0 ? (
        <p className="text-sm text-neutral-500">No flights returned for this route and date.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {data.results.map((r, i) => {
            const code = `${r.airlineCode}${r.flightNumber}`;
            const depart = splitIsoLocal(r.departureAt);
            const dOff = depart ? offsetLabel(depart, origin.tz) : null;
            const selected = code === selectedFlightNumber;

            return (
              <li key={`${code}-${i}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(r)}
                  className={`flex w-full items-baseline gap-3 px-2 py-2 text-left text-sm
                              hover:bg-neutral-50 ${selected ? "bg-neutral-100" : ""}`}
                >
                  <span className="w-16 font-mono text-xs font-semibold">{code}</span>
                  <span className="w-36 truncate text-xs text-neutral-700">
                    {airlineName(r.airlineCode) ?? r.airlineCode}
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
                  <span className="w-12 text-right text-xs font-medium text-neutral-900">
                    {selected ? "Chosen" : "Select"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
