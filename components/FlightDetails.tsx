"use client";

import { Cell, FormGrid, Panel, fieldClass, labelClass } from "@/components/ui";

import { AirportPicker } from "@/components/AirportPicker";
import { formatAirline } from "@/lib/airlines";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { deriveSegment, type Segment } from "@/lib/itinerary";
import { useTodayIso } from "@/lib/today";

type Props = {
  segment: Segment;
  onChange: (patch: Partial<Segment>) => void;
};

// Field styling and the grid are shared — see components/ui.tsx. Local copies had
// already drifted apart (different padding, one missing a hover state), and every
// row used to invent its own column layout so nothing aligned across rows.

/**
 * The flight itself. Airline and flight number are normally filled by choosing a
 * search result, but stay editable — the search cannot cover past dates or a
 * flight the provider does not return.
 *
 * GRID. Row one is the four time fields (4 + 2 + 4 + 2 = 12), so a date and its
 * time sit together and the outbound pair aligns exactly with the inbound pair.
 * Row two is the flight identity plus the derived readout (2 + 4 + 6). Those
 * previously used `sm:grid-cols-2` with a nested `grid-cols-[1fr_auto]`, which made
 * the arrival date a different width from the departure date on the same visual row.
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
    <Panel title={heading} hint="Filled by choosing a flight. Editable if you need to adjust anything.">
      <FormGrid>
        <Cell span={4}>
          <label className={labelClass}>
            Departs
            <input
              type="date"
              className={fieldClass}
              value={segment.depart.date}
              data-empty={!segment.depart.date}
              onChange={(e) => onChange({ depart: { ...segment.depart, date: e.target.value } })}
            />
          </label>
        </Cell>
        <Cell span={2}>
          <label className={labelClass}>
            Time
            <input
              type="time"
              className={fieldClass}
              value={segment.depart.time}
              data-empty={!segment.depart.time}
              onChange={(e) => onChange({ depart: { ...segment.depart, time: e.target.value } })}
            />
          </label>
        </Cell>

        <Cell span={4}>
          <label className={labelClass}>
            Arrives
            <input
              type="date"
              className={fieldClass}
              value={segment.arrive.date}
              data-empty={!segment.arrive.date}
              onChange={(e) => onChange({ arrive: { ...segment.arrive, date: e.target.value } })}
            />
          </label>
        </Cell>
        <Cell span={2}>
          <label className={labelClass}>
            Time
            <input
              type="time"
              className={fieldClass}
              value={segment.arrive.time}
              data-empty={!segment.arrive.time}
              onChange={(e) => onChange({ arrive: { ...segment.arrive, time: e.target.value } })}
            />
          </label>
        </Cell>

        <Cell span={2}>
          <label className={labelClass}>
            Airline
            <input
              type="text"
              maxLength={2}
              className={`${fieldClass} font-mono uppercase`}
              placeholder="LH"
              value={segment.airlineCode}
              onChange={(e) => onChange({ airlineCode: e.target.value.toUpperCase() })}
            />
          </label>
          {/*
            The `w-20` that used to be here is gone. A fixed 80px input inside a grid
            cell defeats the grid: the field stopped at 80px while its column ran to
            the full span, so the airline field was the one control in the wizard
            whose right edge lined up with nothing.
          */}
          <span className="mt-1 block text-xs text-ink-mute">
            {segment.airlineCode
              ? formatAirline(segment.airlineCode) === segment.airlineCode
                ? "Unknown code. The document will show the code only."
                : formatAirline(segment.airlineCode)
              : " "}
          </span>
        </Cell>

        <Cell span={4}>
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
        </Cell>

        {/*
          Derived values, on the same row as the inputs they come from rather than in
          a footer strip under the panel. They are OUTPUT, so the cell is filled and
          labelled "Calculated" instead of bordered like a control: nothing here is
          editable, and a field-shaped box would invite a click that does nothing.
        */}
        <Cell span={6}>
          <span className={labelClass}>Calculated</span>
          <div className="mt-1 flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 bg-muted px-4 py-2 text-xs text-ink-mute">
            <span>
              Duration{" "}
              {d.durationMinutes === null ? (
                <span>-</span>
              ) : (
                <span
                  className={`font-mono font-semibold ${
                    /* A negative elapsed time means arrival precedes departure, which
                       is an error rather than a warning, so this is `destructive` and
                       not the `notice` token. Was raw `red-600`, unreachable by
                       @theme. */
                    d.durationMinutes < 0 ? "text-destructive" : "text-ink"
                  }`}
                >
                  {formatDuration(d.durationMinutes)}
                </span>
              )}
            </span>

            {departOffset && arriveOffset && (
              <span className="font-mono">
                {departOffset} → {arriveOffset}
              </span>
            )}

            {d.nextDay && <span className="font-medium text-ink-soft">arrives next day</span>}
          </div>
        </Cell>
      </FormGrid>

      <details className="mt-6 border-t border-line pt-4">
        <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
          Document details: terminals, cabin, baggage
        </summary>
        {/* Six fields at span 4 = two clean rows of three, on the same 12 columns as
            the panel above rather than a separate `sm:grid-cols-3` system. */}
        <FormGrid className="mt-4">
          <Cell span={4}>
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
          </Cell>
          <Cell span={4}>
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
          </Cell>
          <Cell span={4}>
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
          </Cell>
          <Cell span={4}>
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
          </Cell>
          <Cell span={4}>
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
          </Cell>
          <Cell span={4}>
            <label className={labelClass}>
              Status
              <input
                type="text"
                className={fieldClass}
                placeholder="leave blank"
                value={segment.seatStatus}
                onChange={(e) => onChange({ seatStatus: e.target.value })}
              />
            </label>
            <span className="mt-1 block text-xs text-ink-mute">
              Blank by default. The app will not assert a booking status for you.
            </span>
          </Cell>
        </FormGrid>
      </details>
    </Panel>
  );
}

/**
 * Route picker — the search inputs. Kept separate so step 1 reads as one block.
 *
 * The return date is on THIS step rather than a step of its own, and it is
 * optional: leaving it blank produces a one-way document. The return route is
 * never entered — it is the outbound route reversed, derived in
 * `withReturnLeg()`, so the two can never disagree.
 *
 * GRID. Row one is the two airports (6 + 6). Row two is asymmetric on purpose:
 * the two dates take 4 columns each and the trip-shape note takes the remaining 4,
 * so the note sits BESIDE the control that determines it rather than as a
 * full-width line of small print underneath. That is the asymmetric balance the
 * system asks for, doing actual work.
 */
export function RouteFields({
  segment,
  onChange,
  returnDate,
  onReturnDateChange,
}: Props & { returnDate: string; onReturnDateChange: (d: string) => void }) {
  /*
   * Past dates are blocked on the SEARCH dates only. No provider returns schedules
   * for a date that has already happened, so offering them here just produces an
   * empty result list and a confused user.
   *
   * Deliberately NOT applied to the "Departs" / "Arrives" fields in FlightDetails:
   * those are the manual-entry path, which exists precisely because search cannot
   * cover past dates. Constraining both would close the escape hatch and make a
   * past-dated itinerary impossible to build at all.
   */
  const today = useTodayIso();

  const reverseLabel =
    segment.destinationIata && segment.originIata
      ? `${segment.destinationIata} → ${segment.originIata}`
      : null;

  return (
    <FormGrid>
      <Cell span={6}>
        <AirportPicker
          label="From"
          value={segment.originIata}
          onChange={(iata) => onChange({ originIata: iata })}
          placeholder="JFK"
        />
      </Cell>
      <Cell span={6}>
        <AirportPicker
          label="To"
          value={segment.destinationIata}
          onChange={(iata) => onChange({ destinationIata: iata })}
          placeholder="MUC"
        />
      </Cell>

      <Cell span={4}>
        <label className={labelClass}>
          Departure date
          <input
            type="date"
            className={fieldClass}
            value={segment.depart.date}
            data-empty={!segment.depart.date}
            min={today}
            onChange={(e) => onChange({ depart: { ...segment.depart, date: e.target.value } })}
          />
        </label>
      </Cell>
      <Cell span={4}>
        <label className={labelClass}>
          Return date <span className="font-normal text-ink-mute">(optional)</span>
          <input
            type="date"
            className={fieldClass}
            value={returnDate}
            data-empty={!returnDate}
            /* Not before the outbound — and not in the past either, for the case
               where the outbound is still blank. */
            min={segment.depart.date || today}
            onChange={(e) => onReturnDateChange(e.target.value)}
          />
        </label>
      </Cell>

      <Cell span={4} className="flex flex-col justify-end">
        <p className="text-xs text-ink-mute">
          {returnDate
            ? `Round trip${reverseLabel ? `, return leg ${reverseLabel}` : ""}.`
            : "Leave the return date blank for a one-way itinerary."}
        </p>
        {returnDate && (
          <button
            type="button"
            onClick={() => onReturnDateChange("")}
            className="mt-1 self-start text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Make it one-way
          </button>
        )}
      </Cell>
    </FormGrid>
  );
}
