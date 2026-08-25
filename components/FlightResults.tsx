"use client";

import { Check } from "@phosphor-icons/react";
import { Panel } from "@/components/ui";
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

/**
 * Search results, one row per flight.
 *
 * The row is a fixed-track layout so the same value sits at the same x-position in
 * every row and across both legs of a round trip. Every numeric cell is
 * `tabular-nums` on top of the mono face: proportional digits made the times and
 * prices ragged down the column even though the cells themselves were aligned,
 * which is the detail that separates a table from a list of strings.
 *
 * SELECTED STATE. Chosen rows previously used `bg-primary/15 ring-1 ring-primary/40`,
 * a tinted fill plus a ring on all four sides. Under the monochrome palette
 * `primary` is a near-black neutral, so a 15% wash of it was a barely-perceptible
 * grey and the ring was doing all the work. It is now a 2px left rule in full ink
 * plus a muted fill: unambiguous at a glance, and it marks the row from the margin
 * the way the stepper marks progress, so the two read as the same system.
 */
export function FlightResults({ data, origin, selectedFlightNumber, onPick, heading }: Props) {
  return (
    <Panel title={heading}>
      {data.source === "mock" && (
        <p className="mb-4 border border-notice-line bg-notice-surface px-4 py-2 text-xs text-notice-ink">
          <span className="font-semibold">Sample data.</span> {data.note}
        </p>
      )}
      {data.source === "travelpayouts" && data.note && (
        <p className="mb-2 text-xs text-ink-mute">{data.note}</p>
      )}

      {data.results.length === 0 ? (
        <p className="text-sm text-ink-mute">No flights returned for this route and date.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
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
                  className={`group flex w-full cursor-pointer items-center gap-4 border-l-2 py-4 pr-4
                              text-left text-sm transition-colors duration-200
                              ${
                                selected
                                  ? "border-l-ink bg-muted pl-4"
                                  : "border-l-transparent pl-4 hover:bg-muted"
                              }`}
                >
                  <span className="w-16 font-mono text-xs font-semibold tabular-nums text-ink">
                    {code}
                  </span>
                  <span className="w-36 truncate text-xs text-ink-soft">
                    {airlineName(r.airlineCode) ?? r.airlineCode}
                  </span>
                  <span className="w-12 font-mono text-xs tabular-nums">{depart?.time ?? "-"}</span>
                  {/* The offset cell holds its width even when empty, so a flight with
                      an unknown timezone does not shift every cell to its right. */}
                  <span className="w-16 text-xs tabular-nums text-ink-mute">{dOff ?? ""}</span>
                  <span className="w-16 text-xs tabular-nums text-ink-soft">
                    {r.durationMinutes !== null ? formatDuration(r.durationMinutes) : "-"}
                  </span>
                  <span className="w-16 text-xs text-ink-mute">
                    {r.transfers === 0 ? "direct" : `${r.transfers} stop`}
                  </span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-ink-mute">
                    {r.price !== null ? `${r.currency === "USD" ? "$" : ""}${r.price}` : ""}
                  </span>
                  {/*
                   * A SPAN, not a button. The whole row is already the button, so a
                   * nested <button> would be invalid nesting — and it would shrink the
                   * click target from the full row to this pill. It only has to LOOK
                   * like a control; the row provides the behaviour.
                   *
                   * THE ONE ROUNDED EXCEPTION in the wizard, and the shape rule in
                   * ui.tsx names it explicitly. It stays a full pill because it reads
                   * as a state chip rather than as a button, which is the distinction
                   * that keeps every actual control at 4px.
                   *
                   * Colours come from `secondary`, deliberately not `primary`: the row
                   * fill and left rule already use ink for the chosen state, so a
                   * primary chip inside a chosen row would lose its edge.
                   *
                   * The border is present in BOTH states — matching the fill when chosen,
                   * so it is invisible but still occupies the box. Without it the pill
                   * measured 74x26 unselected and 76x24 chosen, and the row jittered 2px
                   * on click. Fixed width for the same reason: the check icon is +2px.
                   */}
                  <span
                    aria-hidden
                    className={`inline-flex w-[86px] shrink-0 items-center justify-center gap-1
                                rounded-full border px-4 py-1 text-xs font-semibold
                                transition-colors duration-200
                                ${
                                  selected
                                    ? "border-secondary bg-secondary text-white"
                                    : `border-ink-mute bg-surface text-ink
                                       group-hover:border-secondary group-hover:text-secondary`
                                }`}
                  >
                    {selected && (
                      /* `tick-pop` is kept: it is the pop-in on the one decisive
                         click in the flow, and it collapses under reduced motion
                         via the global rule in globals.css. */
                      <Check className="tick-pop h-3 w-3" weight="bold" aria-hidden />
                    )}
                    {selected ? "Chosen" : "Select"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
