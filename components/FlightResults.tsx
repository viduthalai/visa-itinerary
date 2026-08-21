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
        <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-900">
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
                  className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left
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
                  {/*
                   * A SPAN, not a button. The whole row is already the button, so a
                   * nested <button> would be invalid nesting — and it would shrink the
                   * click target from the full row to this pill. It only has to LOOK
                   * like a control; the row provides the behaviour.
                   *
                   * Colours come from `secondary`, deliberately not `primary`: the row
                   * fill and ring already use primary for the chosen state, so a primary
                   * pill inside a primary-tinted row loses its edge.
                   *
                   * The border is present in BOTH states — matching the fill when chosen,
                   * so it is invisible but still occupies the box. Without it the pill
                   * measured 74x26 unselected and 76x24 chosen, and the row jittered 2px
                   * on click. Fixed width for the same reason: the check icon is +2px.
                   */}
                  <span
                    aria-hidden
                    className={`inline-flex w-[86px] shrink-0 items-center justify-center gap-1
                                rounded-full border px-2.5 py-1 text-xs font-semibold
                                transition-colors duration-200
                                ${
                                  selected
                                    ? "border-secondary bg-secondary text-canvas"
                                    : `border-ink-mute bg-elevated text-ink
                                       group-hover:border-secondary group-hover:text-secondary`
                                }`}
                  >
                    {selected && (
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                        <path
                          d="M3.5 8.5l3 3 6-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
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
