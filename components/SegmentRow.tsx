"use client";

import { AirportPicker } from "@/components/AirportPicker";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { deriveSegment, type Segment } from "@/lib/itinerary";

type Props = {
  index: number;
  segment: Segment;
  onChange: (patch: Partial<Segment>) => void;
  onRemove: (() => void) | null;
};

const fieldClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm " +
  "focus:border-neutral-900 focus:outline-none";
const labelClass = "block text-xs font-medium text-neutral-600";

/**
 * NOTE — airline is free text for now. There is no maintained free airline
 * dataset: OurAirports covers airports only, and OpenFlights' airlines.dat has
 * no update process and an unconfirmed snapshot date. Rather than bundle stale
 * data or invent a list, this stays a text input until a source is chosen.
 */
export function SegmentRow({ index, segment, onChange, onRemove }: Props) {
  const d = deriveSegment(segment);

  const departOffset = d.originTz ? offsetLabel(segment.depart, d.originTz) : null;
  const arriveOffset = d.destinationTz ? offsetLabel(segment.arrive, d.destinationTz) : null;

  return (
    <fieldset className="rounded-lg border border-neutral-200 bg-white p-4">
      <legend className="flex w-full items-center justify-between px-1">
        <span className="text-sm font-medium">Flight {index + 1}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-neutral-500 hover:text-red-600"
            aria-label={`Remove flight ${index + 1}`}
          >
            Remove
          </button>
        )}
      </legend>

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
          Airline
          <input
            type="text"
            className={fieldClass}
            placeholder="Lufthansa"
            value={segment.airline}
            onChange={(e) => onChange({ airline: e.target.value })}
          />
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-neutral-100 pt-3
                      text-xs text-neutral-500">
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
    </fieldset>
  );
}
