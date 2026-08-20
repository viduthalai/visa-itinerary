"use client";

import { AirportPicker } from "@/components/AirportPicker";
import { formatAirline } from "@/lib/airlines";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { deriveSegment, type Segment } from "@/lib/itinerary";

type Props = {
  segment: Segment;
  onChange: (patch: Partial<Segment>) => void;
};

const fieldClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm " +
  "focus:border-neutral-900 focus:outline-none";
const labelClass = "block text-xs font-medium text-neutral-600";

/**
 * The flight itself. Airline and flight number are normally filled by choosing a
 * search result, but stay editable — the search cannot cover past dates or a
 * flight the provider does not return.
 */
export function FlightDetails({ segment, onChange }: Props) {
  const d = deriveSegment(segment);
  const departOffset = d.originTz ? offsetLabel(segment.depart, d.originTz) : null;
  const arriveOffset = d.destinationTz ? offsetLabel(segment.arrive, d.destinationTz) : null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-medium">Flight details</h2>
      <p className="mt-0.5 text-xs text-neutral-500">
        Filled by choosing a flight above. Editable if you need to adjust anything.
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
          <span className="mt-1 block text-xs font-normal text-neutral-500">
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-neutral-100
                      pt-3 text-xs text-neutral-500">
        <span>
          Duration{" "}
          {d.durationMinutes === null ? (
            <span className="text-neutral-400">—</span>
          ) : (
            <span
              className={`font-mono font-semibold ${
                d.durationMinutes < 0 ? "text-red-600" : "text-neutral-900"
              }`}
            >
              {formatDuration(d.durationMinutes)}
            </span>
          )}
          <span className="ml-1 text-neutral-400">(calculated)</span>
        </span>

        {departOffset && arriveOffset && (
          <span className="font-mono">
            {departOffset} → {arriveOffset}
          </span>
        )}

        {d.nextDay && <span className="font-medium text-neutral-700">arrives next day</span>}
      </div>
    </div>
  );
}

/** Route picker — the search inputs. Kept separate so step 1 reads as one block. */
export function RouteFields({ segment, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
      <label className={labelClass}>
        Departure date
        <input
          type="date"
          className={fieldClass}
          value={segment.depart.date}
          onChange={(e) => onChange({ depart: { ...segment.depart, date: e.target.value } })}
        />
      </label>
    </div>
  );
}
