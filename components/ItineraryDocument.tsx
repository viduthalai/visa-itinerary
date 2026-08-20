"use client";

import { airlineName } from "@/lib/airlines";
import { getAirport } from "@/lib/airports";
import { DOCUMENT_TITLE, SPECIMEN_MARKING, TOOL_NAME } from "@/lib/config";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { countryName } from "@/lib/countries";
import { formatCompactDate, formatDocDate } from "@/lib/formatDate";
import {
  deriveSegment,
  formatPassenger,
  hasFare,
  type Itinerary,
} from "@/lib/itinerary";

/**
 * Layout and palette follow the information architecture of a standard airline
 * itinerary receipt: warm top rule, wordmark block, centred serif title, a
 * booking-reference band, two-column notices, a chevron check-in timing band, a
 * bordered travel-information panel with a per-leg block, then policy sections.
 *
 * Colours are sampled from a rendered reference rather than invented, so the
 * greys are warm and the accents taupe/olive — that is what makes the page read
 * as a travel document rather than a generic invoice.
 *
 * What is NOT copied, deliberately:
 *   - No third-party airline logo, wordmark, brand red or copyright line. The
 *     mark block carries OUR name; the accent (#CB3333) is the title red, not a
 *     carrier's logo colour.
 *   - No verbatim carrier copy, no footer link set, no barcode or scan text.
 *   - No "booked and confirmed" assertion in the body copy. Status is blank
 *     unless the user sets it, so the app never fills that in on its own.
 *
 * The TITLE is a deliberate exception, added 2026-08-20 on Vidu's instruction:
 * it now reads "Ticket & receipt", matching the reference. That is the strongest
 * claim on the page, so it lives in lib/config.ts as DOCUMENT_TITLE rather than
 * being hard-coded here, and it is tracked as a pre-release decision (P-2).
 *
 * Spacing between adjacent values (time and UTC offset, carrier and flight
 * number) uses literal space characters, never CSS margins. A margin looks
 * right on screen but collapses in COPIED TEXT, and this document is deliberately
 * real selectable text rather than an image. That bug has appeared twice.
 */
export function ItineraryDocument({ itinerary }: { itinerary: Itinerary }) {
  const segment = itinerary.segments[0];
  const origin = getAirport(segment.originIata);
  const destination = getAirport(segment.destinationIata);
  const derived = deriveSegment(segment);

  const named = itinerary.passengers.filter((p) => p.surname.trim() || p.givenNames.trim());
  const carrier = airlineName(segment.airlineCode);
  const issued = itinerary.generatedAt ? itinerary.generatedAt.slice(0, 10) : "";
  const departDate = segment.depart.date ? formatDocDate(segment.depart.date, false) : "—";
  const arriveDate = segment.arrive.date ? formatDocDate(segment.arrive.date, false) : "—";

  /*
   * Coupon validity window. In the reference both bounds are the DEPARTURE date on
   * every leg — including a leg that lands the next day — so the window is not
   * derived from the arrival. Matching that rather than inventing a range.
   */
  const couponNotAfter = segment.depart.date;
  const fareShown = hasFare(itinerary.fare);

  return (
    <article
      id="itinerary-document"
      className="relative mx-auto bg-white font-[family-name:var(--font-doc)]
                 text-[10px] leading-snug text-doc-ink"
      style={{ maxWidth: "210mm" }}
    >
      {SPECIMEN_MARKING && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center
                     text-6xl font-bold tracking-widest text-doc-accent opacity-10"
          style={{ transform: "rotate(-24deg)" }}
        >
          SPECIMEN
        </div>
      )}

      {/* Warm top rule — the reference opens with a taupe-to-grey gradient band. */}
      <div
        aria-hidden
        className="h-2"
        style={{ background: "linear-gradient(90deg, #cebcb2 0%, #ddd4ce 45%, #edeceb 100%)" }}
      />

      <div className="px-8 pb-6 pt-5">
        {/* Header: mark block · centred serif title · document number */}
        <header className="flex items-start justify-between gap-6">
          <div
            className="flex h-[74px] w-[74px] flex-col items-center justify-center bg-doc-accent-deep
                       px-1 text-center text-white"
          >
            <span className="font-[family-name:var(--font-doc-serif)] text-[15px] leading-none">
              VI
            </span>
            <span className="mt-1 text-[6px] uppercase leading-tight tracking-[0.08em]">
              Visa
              <br />
              Itinerary
            </span>
          </div>

          <h1
            className="mt-4 flex-1 whitespace-nowrap text-center font-[family-name:var(--font-doc-serif)]
                       text-[25px] font-normal leading-none text-doc-accent"
          >
            {DOCUMENT_TITLE}
          </h1>

          <div className="w-[230px] pt-1 text-center">
            <div className="text-[11px] text-doc-grey">
              Document number: {itinerary.ticketNumber || "—"}
            </div>
            <div className="mt-1 text-[7.5px] leading-tight text-doc-mute">
              Quote this number in any correspondence about this itinerary. It is an internal
              reference, not an airline ticket number.
            </div>
          </div>
        </header>

        {/* Passenger / prepared-by */}
        <section className="mt-6 grid grid-cols-2 gap-8">
          <Field label={`Passenger name${named.length === 1 ? "" : "s"}`}>
            {named.length === 0 ? (
              <span className="text-doc-mute">—</span>
            ) : (
              named.map((p) => (
                <div key={p.id} className="tracking-wide">
                  {formatPassenger(p)}
                </div>
              ))
            )}
          </Field>
          <Field label="Prepared by / date">
            <div>{TOOL_NAME}</div>
            <div>{issued ? formatDocDate(issued, false).toUpperCase() : "—"}</div>
          </Field>
        </section>

        {/* Booking-reference band */}
        <div className="mt-4 bg-doc-ref px-4 py-2.5">
          <span className="text-[11px] font-bold text-doc-grey">
            Your booking reference: {itinerary.pnr || "—"}
          </span>
        </div>

        {/* Travel notices — two columns, generic copy */}
        <section
          className="mt-4 grid grid-cols-2 gap-8 pb-4 text-[9.5px] leading-relaxed text-doc-ink"
          style={{ borderBottom: "1px dotted #c9c9c7" }}
        >
          <div className="space-y-2">
            <p>
              This document sets out the intended journey listed below. It is a travel plan
              prepared for your own records and for any application that asks for one — it
              is not a reservation and confers no entitlement to travel.
            </p>
            <p>
              You may be asked to show a travel plan at the airport or when applying for a
              visa. Keep it with your travel documents.
            </p>
          </div>
          <div className="space-y-2">
            <p>
              Check with your departure airport for restrictions on the carriage of liquids,
              aerosols and gels in hand baggage, and check the visa requirements for every
              country on your route — including any you only transit.
            </p>
            <p>
              Some items are restricted or forbidden on board, including spare lithium
              batteries and smart bags. Check the operating carrier&apos;s dangerous goods
              information before you travel.
            </p>
          </div>
        </section>

        {/* Check-in timing band — four chevrons, generic guidance */}
        <section className="mt-5">
          <div className="flex">
            <Chevron first label="Check in online, or" />
            <Chevron label="90 minutes" />
            <Chevron label="60 minutes" />
            <Chevron label="45 minutes" last />
          </div>
          <div className="mt-3 grid grid-cols-4 text-[8.5px] leading-relaxed text-doc-ink">
            <TimingNote>
              Check in at the airport. At most airports you need to arrive{" "}
              <strong>3 hours</strong> before departure, but it can be up to{" "}
              <strong>4 hours</strong> to complete all travel requirements. Check the best
              time to arrive for your journey below.
            </TimingNote>
            <TimingNote>
              90 minutes before take-off go through passport control.
            </TimingNote>
            <TimingNote>
              60 minutes before take-off be ready at the gate (Premium Economy, Economy
              Class).
            </TimingNote>
            <TimingNote last>
              45 minutes before take-off be ready at the gate (First Class, Business Class).
            </TimingNote>
          </div>
        </section>

        {/* Travel information panel */}
        <section
          data-keep-together
          className="mt-6 border border-doc-panel-edge bg-doc-panel p-4"
        >
          <div className="flex items-end justify-between">
            <h2 className="font-[family-name:var(--font-doc-serif)] text-[17px] leading-none text-doc-grey">
              Your travel information
            </h2>
            <span className="text-[8px] text-doc-mute">
              All times shown are local for each city
            </span>
          </div>

          {/* Departing band */}
          <div className="mt-3 flex items-center gap-2 bg-doc-band px-3 py-1.5 text-white">
            <span aria-hidden className="text-[12px] leading-none">
              ➜
            </span>
            <span className="text-[12px]">
              Departing » From{" "}
              <strong className="font-bold">
                {origin?.city ?? origin?.name ?? "—"}
                {origin?.country ? `, ${countryName(origin.country)}` : ""}
              </strong>
            </span>
          </div>

          {/* Leg strip */}
          <div className="bg-doc-leg px-3 py-1 text-[8.5px] text-doc-ink">
            <strong className="font-bold">Leg 1 of 1</strong>
            <span className="mx-1.5">|</span>
            {origin?.city ?? "—"} ({origin?.iata ?? "—"}) to {destination?.city ?? "—"} (
            {destination?.iata ?? "—"})
            {carrier && (
              <>
                <span className="mx-1.5">|</span>
                Operated by {carrier}
              </>
            )}
          </div>

          {/* Leg body */}
          <div className="bg-white px-3 pb-3 pt-3">
            {/* Departure row */}
            <div className="grid grid-cols-[86px_92px_92px_1fr] items-start gap-2">
              <div>
                <Caption>Flight</Caption>
                <div className="text-[16px] font-bold leading-tight text-doc-grey">
                  {segment.flightNumber || segment.airlineCode || "—"}
                </div>
                {segment.cabinClass && (
                  <div className="text-[8.5px] font-bold text-doc-ink">
                    {segment.cabinClass}
                  </div>
                )}
                {segment.fareBasis && (
                  <div className="text-[8.5px] font-bold text-doc-ink">
                    {segment.fareBasis}
                  </div>
                )}
              </div>
              <div>
                <Caption>Check-in at</Caption>
                <div className="text-[8.5px]">
                  {derived.checkIn ? formatDocDate(derived.checkIn.date, false) : "—"}
                </div>
                <div className="text-[17px] font-bold leading-tight text-doc-grey">
                  {derived.checkIn?.time ?? "—:—"}
                </div>
              </div>
              <div>
                <Caption>Departure</Caption>
                <div className="text-[8.5px]">{departDate}</div>
                <div className="text-[17px] font-bold leading-tight text-doc-grey">
                  {segment.depart.time || "—:—"}
                </div>
                {derived.originTz && segment.depart.time && (
                  <div className="text-[8px] text-doc-mute">
                    {offsetLabel(segment.depart, derived.originTz)}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3">
                <RouteGlyph />
                <div>
                  <div className="text-[19px] font-bold uppercase leading-none text-doc-grey">
                    {origin?.city ?? "—"}
                  </div>
                  <div className="mt-1 text-[8.5px] font-bold text-doc-ink">
                    Departing {origin?.iata ?? "—"}, {origin?.name ?? "—"}
                  </div>
                  {segment.departTerminal && (
                    <div className="text-[8.5px] font-bold text-doc-ink">
                      Terminal {segment.departTerminal}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Arrival row */}
            <div className="mt-4 grid grid-cols-[86px_92px_92px_1fr] items-start gap-2">
              <div>
                <Caption>Seat</Caption>
                <div className="text-[8.5px] text-doc-mute">Not assigned</div>
              </div>
              <div>
                <Caption>Status</Caption>
                {segment.seatStatus ? (
                  <div className="text-[12px] font-bold leading-tight text-doc-olive">
                    {segment.seatStatus}
                  </div>
                ) : (
                  <div className="text-[8.5px] text-doc-mute">—</div>
                )}
              </div>
              <div>
                <Caption>Arrival</Caption>
                <div className="text-[8.5px]">{arriveDate}</div>
                <div className="text-[17px] font-bold leading-tight text-doc-grey">
                  {segment.arrive.time || "—:—"}
                </div>
                {derived.destinationTz && segment.arrive.time && (
                  <div className="text-[8px] text-doc-mute">
                    {offsetLabel(segment.arrive, derived.destinationTz)}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3">
                <RouteGlyph arriving />
                <div>
                  <div className="text-[19px] font-bold uppercase leading-none text-doc-grey">
                    {destination?.city ?? "—"}
                  </div>
                  <div className="mt-1 text-[8.5px] font-bold text-doc-ink">
                    Arriving {destination?.iata ?? "—"}, {destination?.name ?? "—"}
                  </div>
                  {segment.arriveTerminal && (
                    <div className="text-[8.5px] font-bold text-doc-ink">
                      Terminal {segment.arriveTerminal}
                    </div>
                  )}
                  {derived.nextDay && (
                    <div className="text-[8.5px] font-bold text-doc-warm">
                      Arrives the following day.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coupon validity / baggage strip — mirrors the reference layout */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-doc-panel-edge pt-2">
              <span className="text-[8.5px] text-doc-ink">
                Journey time{" "}
                <strong className="font-bold text-doc-warm">
                  {derived.durationMinutes !== null && derived.durationMinutes >= 0
                    ? formatDuration(derived.durationMinutes)
                    : "—"}
                </strong>
              </span>
              <span className="text-[8.5px] text-doc-ink">
                Coupon validity: not before{" "}
                <strong className="font-bold text-doc-warm">
                  {segment.depart.date ? formatCompactDate(segment.depart.date) : "—"}
                </strong>{" "}
                /{" "}
                <span className="ml-1">
                  not after{" "}
                  <strong className="font-bold text-doc-warm">
                    {couponNotAfter ? formatCompactDate(couponNotAfter) : "—"}
                  </strong>
                </span>
              </span>
              <span className="font-[family-name:var(--font-doc-serif)] text-[15px] text-doc-grey">
                Baggage {segment.baggage || "refer to the carrier"}
              </span>
            </div>
          </div>
        </section>

        {/*
          Fare information. Rendered ONLY when the user has filled something in —
          an unfilled fare block would print a row of empty money columns, which
          reads as a fare of zero rather than as no fare stated.
        */}
        {fareShown && (
          <section data-keep-together className="mt-4 bg-doc-ref px-4 py-3">
            <h2 className="font-[family-name:var(--font-doc-serif)] text-[17px] leading-none text-doc-grey">
              Fare information
            </h2>

            <div className="mt-3 grid grid-cols-5 gap-4">
              <FareCell label="Fare" value={itinerary.fare.base} />
              <FareCell label="Equivalent fare" value={itinerary.fare.equivalent} />
              <FareCell label="Taxes / Fees / Charges (TFC)" value={itinerary.fare.taxes} />
              <FareCell label="Total fare (Incl. TFC)" value={itinerary.fare.total} />
              <FareCell label="Form of payment" value={itinerary.fare.formOfPayment} />
            </div>

            {itinerary.fare.calculation.trim() && (
              <div className="mt-3">
                <div className="text-[8.5px] text-doc-ink">Fare calculation</div>
                <div className="mt-0.5 break-words text-[8px] font-bold leading-relaxed text-doc-ink">
                  {itinerary.fare.calculation}
                </div>
              </div>
            )}

            {itinerary.fare.additionalInfo.trim() && (
              <div className="mt-3">
                <div className="text-[8.5px] text-doc-ink">Additional information</div>
                <div className="mt-0.5 text-[8px] font-bold leading-relaxed text-doc-ink">
                  {itinerary.fare.additionalInfo}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Generic policy sections */}
        <section className="mt-4 bg-doc-ref px-4 py-4">
          <h2 className="font-[family-name:var(--font-doc-serif)] text-[15px] leading-none text-doc-grey">
            Baggage and cabin items
          </h2>
          <p className="mt-2 text-[8.5px] leading-relaxed text-doc-ink">
            Cabin baggage allowances differ by carrier and cabin. A common allowance is one
            piece up to 55 × 38 × 22 cm and 7 kg in Economy, and up to 10 kg in a premium
            cabin, but the operating carrier&apos;s published allowance applies. Checked
            allowances also vary by route and fare. Confirm both with the operating carrier
            before you travel.
          </p>

          <h2 className="mt-4 font-[family-name:var(--font-doc-serif)] text-[15px] leading-none text-doc-grey">
            Restricted and dangerous goods
          </h2>
          <p className="mt-2 text-[8.5px] leading-relaxed text-doc-ink">
            Carrying certain hazardous materials — aerosols, fireworks, flammable liquids —
            is forbidden on board. Personal motorised vehicles such as hoverboards and
            self-balancing wheels are generally refused as both checked and cabin baggage
            because of their lithium batteries. Where a restriction is unclear, ask the
            operating carrier.
          </p>

          <h2 className="mt-4 font-[family-name:var(--font-doc-serif)] text-[15px] leading-none text-doc-grey">
            Entry requirements
          </h2>
          <p className="mt-2 text-[8.5px] leading-relaxed text-doc-ink">
            You are responsible for holding a passport, visas and any transit permits
            required for every country on this itinerary. Requirements depend on your
            nationality and can change at short notice. Check the official source for each
            country before booking or travelling.
          </p>
        </section>

        <footer className="mt-5 flex items-baseline justify-between border-t border-doc-panel-edge pt-2 text-[8.5px] text-doc-mute">
          <span>
            {TOOL_NAME}
            {issued && <> · prepared {formatDocDate(issued, false)}</>} · travel plan, not a
            reservation
          </span>
          {/*
            No "Page 1 of 1" here. It was hard-coded and the generated PDF runs to
            two pages, so it printed a false count. HTML cannot know the paginated
            total, and Chrome does not support @page margin-box counters — so the
            claim is dropped rather than guessed.
          */}
          <span>Booking reference {itinerary.pnr || "—"}</span>
        </footer>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[8.5px] text-doc-mute">{label}</div>
      <div className="mt-0.5 text-[10px] uppercase text-doc-ink">{children}</div>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="text-[8px] text-doc-mute">{children}</div>;
}

/**
 * One column of the fare block. Empty values print an en dash, matching the
 * reference (its "Equivalent fare" column is a bare "-"), so a column the user
 * left blank does not silently collapse the five-column grid.
 *
 * whiteSpace: pre-line because real TFC values are itemised across several lines.
 */
function FareCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8.5px] leading-tight text-doc-ink">{label}</div>
      <div
        className="mt-0.5 text-[8px] font-bold leading-relaxed text-doc-ink"
        style={{ whiteSpace: "pre-line" }}
      >
        {value.trim() || "–"}
      </div>
    </div>
  );
}

/**
 * Chevron segment of the check-in timing band. Built with clip-path rather than
 * an image so it stays vector-sharp in the PDF and carries no bitmap payload.
 *
 * The reference sets pictograms in these. Emoji were tried and rejected: they
 * resolve to whatever colour emoji font the machine has, so the same document
 * printed on two computers would not match — and they read as cartoonish next to
 * a serif label. Line-art would need real SVG; the labels carry the meaning.
 */
function Chevron({
  label,
  first,
  last,
}: {
  label: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`relative flex h-[40px] items-center pr-7 ${first ? "flex-[1.35] pl-4" : "flex-1 pl-7"}`}
      style={{
        background: "linear-gradient(90deg, #d5cac3 0%, #dbd2ce 100%)",
        clipPath: first
          ? "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)"
          : last
            ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 16px 50%)"
            : "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)",
        marginLeft: first ? 0 : -10,
      }}
    >
      <span className="whitespace-nowrap font-[family-name:var(--font-doc-serif)] text-[12.5px] leading-none text-doc-ink">
        {label}
      </span>
    </div>
  );
}

function TimingNote({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="px-3 first:pl-0"
      style={last ? undefined : { borderRight: "1px dotted #c9c9c7" }}
    >
      {children}
    </div>
  );
}

/** Origin/destination route marker — dot, dashes, aircraft, dot. */
function RouteGlyph({ arriving }: { arriving?: boolean }) {
  return (
    <span
      aria-hidden
      className="mt-1 flex items-center gap-[2px]"
      style={{ color: "#c8b98f" }}
    >
      <span className="text-[9px] leading-none">{arriving ? "○" : "●"}</span>
      <span className="text-[8px] leading-none tracking-tighter">– –</span>
      <span className="text-[13px] leading-none">✈</span>
      <span className="text-[8px] leading-none tracking-tighter">– –</span>
      <span className="text-[9px] leading-none">{arriving ? "●" : "○"}</span>
    </span>
  );
}
