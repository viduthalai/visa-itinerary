"use client";

import { fieldClass, labelClass } from "@/components/ui";

import { AirportPicker } from "@/components/AirportPicker";
import { formatAirline } from "@/lib/airlines";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { deriveSegment, type Segment } from "@/lib/itinerary";

type Props = {
  segment: Segment;
  onChange: (patch: Partial<Segment>) => void;
};

// Field styling is shared — see components/ui.tsx. Local copies had already
// drifted apart (different padding, one missing a hover state).

/**
 * The flight itself. Airline and flight number are normally filled by choosing a
 * search result, but stay editable — the search cannot cover past dates or a
 * flight the provider does not return.
 */
export function FlightDetails({
  segment,
  onChange,
  heading = "Flight details",
}: Props & { heading?: string }) {
  const d = deriveSegment(segment);
  const departOffset = d.originTz ? offsetLabel(segment.depart, d.originTz) : null;
  const arriveOffset = d.destinationTz ? offsetLabel(segment.arrive, d.destinationTz) : null;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-medium">{heading}</h3>
      <p className="mt-0.5 text-xs text-ink-mute">
        Filled by choosing a flight. Editable if you need to adjust anything.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className={labelClass}>
            Departs
            <input
              type="date"
              className={fieldClass}
              value={segment.depart.date}
              onChange={(e) => onChange({ depart: { ...segment.depart, date: e.target.value } })}
            />
          </label>
          <label className={labelClass}>
            Time
            <input
              type="time"
              className={fieldClass}
              value={segment.depart.time}
              onChange={(e) => onChange({ depart: { ...segment.depart, time: e.target.value } })}
            />
          </label>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className={labelClass}>
            Arrives
            <input
              type="date"
              className={fieldClass}
              value={segment.arrive.date}
              onChange={(e) => onChange({ arrive: { ...segment.arrive, date: e.target.value } })}
            />
          </label>
          <label className={labelClass}>
            Time
            <input
              type="time"
              className={fieldClass}
              value={segment.arrive.time}
              onChange={(e) => onChange({ arrive: { ...segment.arrive, time: e.target.value } })}
            />
          </label>
        </div>

        <label className={labelClass}>
          Airline code
          <input
            type="text"
            maxLength={2}
            className={`${fieldClass} w-20 font-mono uppercase`}
            placeholder="LH"
            value={segment.airlineCode}
            onChange={(e) => onChange({ airlineCode: e.target.value.toUpperCase() })}
          />
          <span className="mt-1 block text-xs font-normal text-ink-mute">
            {segment.airlineCode
              ? formatAirline(segment.airlineCode) === segment.airlineCode
                ? "Unknown code — the document will show the code only."
                : formatAirline(segment.airlineCode)
              : "\u00a0"}
          </span>
        </label>

        <label className={labelClass}>
          Flight number
          <input
            type="text"
            className={`${fieldClass} font-mono`}
            placeholder="LH411"
            value={segment.flightNumber}
            onChange={(e) => onChange({ flightNumber: e.target.value.toUpperCase() })}
          />
        </label>
      </div>

      <details className="mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">
          Document details — terminals, cabin, baggage
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Departure terminal
            <input
              type="text"
              className={fieldClass}
              placeholder="2"
              value={segment.departTerminal}
              onChange={(e) => onChange({ departTerminal: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Arrival terminal
            <input
              type="text"
              className={fieldClass}
              placeholder="3"
              value={segment.arriveTerminal}
              onChange={(e) => onChange({ arriveTerminal: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Cabin
            <input
              type="text"
              className={fieldClass}
              placeholder="Economy"
              value={segment.cabinClass}
              onChange={(e) => onChange({ cabinClass: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Fare label
            <input
              type="text"
              className={fieldClass}
              placeholder="Saver"
              value={segment.fareBasis}
              onChange={(e) => onChange({ fareBasis: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Baggage
            <input
              type="text"
              className={fieldClass}
              placeholder="25Kgs"
              value={segment.baggage}
              onChange={(e) => onChange({ baggage: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Status
            <input
              type="text"
              className={fieldClass}
              placeholder="leave blank"
              value={segment.seatStatus}
              onChange={(e) => onChange({ seatStatus: e.target.value })}
            />
            <span className="mt-1 block text-xs font-normal text-ink-mute">
              Blank by default — the app will not assert a booking status for you.
            </span>
          </label>
        </div>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line
                      pt-3 text-xs text-ink-mute">
        <span>
          Duration{" "}
          {d.durationMinutes === null ? (
            <span className="text-ink-mute">—</span>
          ) : (
            <span
              className={`font-mono font-semibold ${
                d.durationMinutes < 0 ? "text-red-600" : "text-ink"
              }`}
            >
              {formatDuration(d.durationMinutes)}
            </span>
          )}
          <span className="ml-1 text-ink-mute">(calculated)</span>
        </span>

        {departOffset && arriveOffset && (
          <span className="font-mono">
            {departOffset} → {arriveOffset}
          </span>
        )}

        {d.nextDay && <span className="font-medium text-ink-soft">arrives next day</span>}
      </div>
    </div>
  );
}

/**
 * Route picker — the search inputs. Kept separate so step 1 reads as one block.
 *
 * The return date is on THIS step rather than a step of its own, and it is
 * optional: leaving it blank produces a one-way document. The return route is
 * never entered — it is the outbound route reversed, derived in
 * `withReturnLeg()`, so the two can never disagree.
 */
export function RouteFields({
  segment,
  onChange,
  returnDate,
  onReturnDateChange,
}: Props & { returnDate: string; onReturnDateChange: (d: string) => void }) {
  const reverseLabel =
    segment.destinationIata && segment.originIata
      ? `${segment.destinationIata} → ${segment.originIata}`
      : null;

  return (
    <div className="grid gap-3">
      {/* Row 1 — where. Row 2 — when. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <AirportPicker
          label="From"
          value={segment.originIata}
          onChange={(iata) => onChange({ originIata: iata })}
          placeholder="JFK"
        />
        <AirportPicker
          label="To"
          value={segment.destinationIata}
          onChange={(iata) => onChange({ destinationIata: iata })}
          placeholder="MUC"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Departure date
          <input
            type="date"
            className={fieldClass}
            value={segment.depart.date}
            onChange={(e) => onChange({ depart: { ...segment.depart, date: e.target.value } })}
          />
        </label>
        <label className={labelClass}>
          Return date <span className="font-normal text-ink-mute">— optional</span>
          <input
            type="date"
            className={fieldClass}
            value={returnDate}
            min={segment.depart.date || undefined}
            onChange={(e) => onReturnDateChange(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-ink-mute">
          {returnDate
            ? `Round trip${reverseLabel ? ` — return leg ${reverseLabel}` : ""}.`
            : "Leave the return date blank for a one-way itinerary."}
        </p>
        {returnDate && (
          <button
            type="button"
            onClick={() => onReturnDateChange("")}
            className="text-xs text-ink-soft underline underline-offset-2"
          >
            Make it one-way
          </button>
        )}
      </div>
    </div>
  );
}
