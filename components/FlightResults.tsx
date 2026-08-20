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
  /** Shown above the list when there is more than one leg to choose. */
  heading?: string;
};

export function FlightResults({ data, origin, selectedFlightNumber, onPick, heading }: Props) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      {heading && <h3 className="mb-2 text-sm font-medium">{heading}</h3>}
      {data.source === "mock" && (
        <p className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100/90">
          <span className="font-semibold">Sample data.</span> {data.note}
        </p>
      )}
      {data.source === "travelpayouts" && data.note && (
        <p className="mb-2 text-xs text-ink-mute">{data.note}</p>
      )}

      {data.results.length === 0 ? (
        <p className="text-sm text-ink-mute">No flights returned for this route and date.</p>
      ) : (
        <ul className="divide-y divide-line">
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
                  className={`flex w-full cursor-pointer items-baseline gap-3 rounded-lg px-3 py-3 text-left
                              text-sm transition-colors duration-200 hover:bg-muted
                              ${selected ? "bg-primary/15 ring-1 ring-primary/40" : ""}`}
                >
                  <span className="w-16 font-mono text-xs font-semibold text-ink">{code}</span>
                  <span className="w-36 truncate text-xs text-ink-soft">
                    {airlineName(r.airlineCode) ?? r.airlineCode}
                  </span>
                  <span className="font-mono text-xs">{depart?.time ?? "—"}</span>
                  {dOff && <span className="text-xs text-ink-mute">{dOff}</span>}
                  <span className="text-xs text-ink-soft">
                    {r.durationMinutes !== null ? formatDuration(r.durationMinutes) : "—"}
                  </span>
                  <span className="text-xs text-ink-mute">
                    {r.transfers === 0 ? "direct" : `${r.transfers} stop`}
                  </span>
                  <span className="ml-auto text-xs text-ink-mute">
                    {r.price !== null ? `${r.currency === "USD" ? "$" : ""}${r.price}` : ""}
                  </span>
                  <span className="w-14 text-right text-xs font-semibold text-secondary">
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
