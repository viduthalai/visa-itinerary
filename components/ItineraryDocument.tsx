"use client";

import { airlineName } from "@/lib/airlines";
import { getAirport } from "@/lib/airports";
import { SPECIMEN_MARKING, TOOL_NAME } from "@/lib/config";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { countryName } from "@/lib/countries";
import { formatDocDate } from "@/lib/formatDate";
import { deriveSegment, formatPassenger, type Itinerary } from "@/lib/itinerary";

/**
 * Layout follows the information architecture of a standard airline itinerary
 * receipt — header band, passenger block, booking reference, travel notices,
 * check-in timings, a per-leg detail block, then generic policy sections.
 *
 * What is NOT copied, deliberately:
 *   - No third-party airline logo, wordmark, brand colour or copyright line.
 *   - No verbatim carrier-specific copy (their hazardous-goods wording, their
 *     footer links, their "your ticket is stored in our booking system").
 *   - No barcode or scan instruction.
 *   - No "booked and confirmed" assertion. Seat status is blank unless the user
 *     sets it, so the app never claims a booking exists on its own.
 *   - Not titled Ticket, E-Ticket, Confirmation or Reservation.
 * The notice text below is generic industry information, written here.
 */
export function ItineraryDocument({ itinerary }: { itinerary: Itinerary }) {
  const segment = itinerary.segments[0];
  const origin = getAirport(segment.originIata);
  const destination = getAirport(segment.destinationIata);
  const derived = deriveSegment(segment);

  const named = itinerary.passengers.filter((p) => p.surname.trim() || p.givenNames.trim());
  const carrier = airlineName(segment.airlineCode);
  const issued = itinerary.generatedAt ? itinerary.generatedAt.slice(0, 10) : "";

  return (
    <article
      id="itinerary-document"
      className="relative mx-auto bg-white px-9 py-8 font-[family-name:var(--font-doc)]
                 text-[10.5px] leading-snug text-neutral-900"
      style={{ maxWidth: "210mm" }}
    >
      {SPECIMEN_MARKING && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center
                     text-6xl font-bold tracking-widest opacity-10"
          style={{ transform: "rotate(-24deg)" }}
        >
          SPECIMEN
        </div>
      )}

      {/* Header band */}
      <header className="flex items-start justify-between gap-8 border-b-2 border-neutral-800 pb-3">
        <div>
          <div className="text-base font-semibold tracking-tight">{TOOL_NAME}</div>
          <h1 className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]
                         text-neutral-600">
            Itinerary &amp; travel plan
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-neutral-500">
            Document number
          </div>
          <div className="font-mono text-[11px] font-semibold">
            {itinerary.ticketNumber || "—"}
          </div>
          <div className="mt-1 text-[9px] text-neutral-500">
            Quote this reference in any correspondence about this itinerary.
          </div>
        </div>
      </header>

      {/* Passenger / issued-by */}
      <section className="mt-3 grid grid-cols-[1.4fr_1fr_1fr] gap-6 border-b border-neutral-300 pb-3">
        <Field label={`Passenger name${named.length === 1 ? "" : "s"}`}>
          {named.length === 0 ? (
            <span className="text-neutral-400">—</span>
          ) : (
            named.map((p) => (
              <div key={p.id} className="font-medium tracking-wide">
                {formatPassenger(p)}
              </div>
            ))
          )}
        </Field>
        <Field label="Prepared by / date">
          <div>{TOOL_NAME}</div>
          <div>{issued ? formatDocDate(issued, false).toUpperCase() : "—"}</div>
        </Field>
        <Field label="Booking reference">
          <span className="font-mono text-[13px] font-semibold tracking-wider">
            {itinerary.pnr || "—"}
          </span>
        </Field>
      </section>

      {/* Travel notices — two columns, generic */}
      <section className="mt-3 grid grid-cols-2 gap-6 border-b border-neutral-300 pb-3
                          text-[9px] leading-relaxed text-neutral-600">
        <div>
          <p>
            This document sets out the intended journey listed below. Keep it with your
            travel documents — you may be asked to show a travel plan at the airport or
            when applying for a visa.
          </p>
          <p className="mt-1.5">
            All times shown are local to each airport, with the UTC offset in force on
            that date.
          </p>
        </div>
        <div>
          <p>
            Check with your departure airport for restrictions on liquids, aerosols and
            gels in hand baggage, and check the visa requirements for every country on
            your route, including any you only transit.
          </p>
          <p className="mt-1.5">
            Some items are restricted or forbidden on board, including spare lithium
            batteries and smart bags. Check the carrier&apos;s dangerous goods
            information before you travel.
          </p>
        </div>
      </section>

      {/* Check-in timing band — generic guidance */}
      <section className="mt-3 grid grid-cols-4 gap-4 border-b border-neutral-300 pb-3
                          text-[9px] leading-relaxed text-neutral-600">
        <Timing head="Arrive at the airport">
          Allow at least 3 hours before departure on international flights. Some airports
          need up to 4 hours to complete all travel requirements.
        </Timing>
        <Timing head="90 minutes before">Be through security and passport control.</Timing>
        <Timing head="60 minutes before">
          Be ready at the gate for Economy and Premium Economy.
        </Timing>
        <Timing head="45 minutes before">Be ready at the gate for Business and First.</Timing>
      </section>

      {/* Journey */}
      <section className="mt-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em]">
          Your travel information
        </h2>
        <p className="text-[9px] text-neutral-500">All times shown are local for each city</p>

        <p className="mt-2 text-[10px] font-semibold">
          Departing » From {origin?.city ?? origin?.name ?? "—"}
          {origin?.country ? `, ${countryName(origin.country)}` : ""}
        </p>

        <div className="mt-1 border border-neutral-400">
          <div className="border-b border-neutral-300 bg-neutral-100 px-3 py-1.5 text-[10px]">
            <span className="font-semibold">Leg 1 of 1</span>
            <span className="mx-1.5 text-neutral-400">|</span>
            {origin?.city ?? "—"} ({origin?.iata ?? "—"}) to {destination?.city ?? "—"} (
            {destination?.iata ?? "—"})
            {carrier && (
              <>
                <span className="mx-1.5 text-neutral-400">|</span>
                Operated by {carrier}
              </>
            )}
          </div>

          <div className="grid grid-cols-[0.85fr_0.85fr_1.3fr] divide-x divide-neutral-300">
            {/* Flight */}
            <Cell head="Flight">
              <div className="font-mono text-[13px] font-semibold">
                {segment.flightNumber || segment.airlineCode || "—"}
              </div>
              {segment.cabinClass && <div className="mt-1">{segment.cabinClass}</div>}
              {segment.fareBasis && (
                <div className="text-neutral-500">{segment.fareBasis}</div>
              )}
            </Cell>

            {/* Check-in */}
            <Cell head="Check-in opens">
              <div>{segment.depart.date ? formatDocDate(segment.depart.date, false) : "—"}</div>
              <div className="text-neutral-500">
                Refer to the carrier — typically 3 hours before departure.
              </div>
            </Cell>

            {/* Departure */}
            <Cell head="Departure">
              <div className="text-[11px] font-semibold uppercase tracking-wide">
                {origin?.city ?? "—"}
              </div>
              <div className="text-neutral-600">
                {segment.depart.date ? formatDocDate(segment.depart.date, false) : "—"}
              </div>
              <div className="mt-0.5">
                <span className="font-mono text-[15px] font-semibold">
                  {segment.depart.time || "—:—"}
                </span>
                {derived.originTz && segment.depart.time && (
                  <>
                    {" "}
                    <span className="font-mono text-[9px] text-neutral-500">
                      {offsetLabel(segment.depart, derived.originTz)}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-0.5 text-neutral-600">
                Departing {origin?.iata ?? "—"}, {origin?.name ?? "—"}
              </div>
              {segment.departTerminal && <div>Terminal {segment.departTerminal}</div>}
            </Cell>
          </div>

          <div className="grid grid-cols-[0.85fr_0.85fr_1.3fr] divide-x divide-neutral-300
                          border-t border-neutral-300">
            <Cell head="Seat">
              <span className="text-neutral-400">Not assigned</span>
            </Cell>

            <Cell head="Status">
              {segment.seatStatus ? (
                segment.seatStatus
              ) : (
                <span className="text-neutral-400">—</span>
              )}
            </Cell>

            <Cell head="Arrival">
              <div className="text-[11px] font-semibold uppercase tracking-wide">
                {destination?.city ?? "—"}
              </div>
              <div className="text-neutral-600">
                {segment.arrive.date ? formatDocDate(segment.arrive.date, false) : "—"}
              </div>
              <div className="mt-0.5">
                <span className="font-mono text-[15px] font-semibold">
                  {segment.arrive.time || "—:—"}
                </span>
                {derived.destinationTz && segment.arrive.time && (
                  <>
                    {" "}
                    <span className="font-mono text-[9px] text-neutral-500">
                      {offsetLabel(segment.arrive, derived.destinationTz)}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-0.5 text-neutral-600">
                Arriving {destination?.iata ?? "—"}, {destination?.name ?? "—"}
              </div>
              {segment.arriveTerminal && <div>Terminal {segment.arriveTerminal}</div>}
              {derived.nextDay && (
                <div className="font-medium">Arrives the following day.</div>
              )}
            </Cell>
          </div>

          <div className="flex items-baseline justify-between gap-4 border-t border-neutral-300
                          bg-neutral-50 px-3 py-1.5 text-[9px] text-neutral-600">
            <span>
              Journey time{" "}
              <span className="font-mono font-semibold text-neutral-900">
                {derived.durationMinutes !== null && derived.durationMinutes >= 0
                  ? formatDuration(derived.durationMinutes)
                  : "—"}
              </span>
            </span>
            <span>Baggage {segment.baggage || "refer to the carrier"}</span>
          </div>
        </div>
      </section>

      {/* Generic policy sections */}
      <section className="mt-4 border-t border-neutral-300 pt-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em]">
          Baggage and cabin items
        </h2>
        <p className="mt-1 text-[9px] leading-relaxed text-neutral-600">
          Cabin baggage allowances differ by carrier and cabin. A common allowance is one
          piece up to 55 × 38 × 22 cm and 7 kg in Economy, and up to 10 kg in a premium
          cabin, but the carrier&apos;s published allowance applies. Checked allowances
          also vary by route and fare. Confirm both with the operating carrier before you
          travel.
        </p>

        <h2 className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
          Restricted and dangerous goods
        </h2>
        <p className="mt-1 text-[9px] leading-relaxed text-neutral-600">
          Carrying certain hazardous materials — aerosols, fireworks, flammable liquids —
          is forbidden on board. Personal motorised vehicles such as hoverboards and
          self-balancing wheels are generally refused as both checked and cabin baggage
          because of their lithium batteries. Where a restriction is unclear, ask the
          operating carrier.
        </p>

        <h2 className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
          Entry requirements
        </h2>
        <p className="mt-1 text-[9px] leading-relaxed text-neutral-600">
          You are responsible for holding a passport, visas and any transit permits
          required for every country on this itinerary. Requirements depend on your
          nationality and can change at short notice. Check the official source for each
          country before booking or travelling.
        </p>
      </section>

      <footer className="mt-5 flex items-baseline justify-between border-t border-neutral-300 pt-2
                         text-[9px] text-neutral-500">
        <span>
          {TOOL_NAME}
          {issued && <> · prepared {formatDocDate(issued, false)}</>}
        </span>
        <span>
          Booking reference {itinerary.pnr || "—"} · Page 1 of 1
        </span>
      </footer>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Timing({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-semibold text-neutral-800">{head}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Cell({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{head}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
