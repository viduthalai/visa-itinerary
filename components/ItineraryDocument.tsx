"use client";

import { airlineName } from "@/lib/airlines";
import { getAirport } from "@/lib/airports";
import { SPECIMEN_MARKING, TOOL_NAME } from "@/lib/config";
import { formatDuration, offsetLabel } from "@/lib/duration";
import { formatDocDate, formatDocDateTime } from "@/lib/formatDate";
import { deriveSegment, formatPassenger, type Itinerary } from "@/lib/itinerary";

/**
 * The document. This is the artifact the user takes away, so what is ABSENT
 * matters as much as what is present:
 *
 *   - No airline logo or airline-styled header. Own brand only. (Trademark.)
 *   - No fare, tax breakdown, or "paid"/"issued" status.
 *   - No barcode or boarding-pass furniture.
 *   - No wording asserting the flight is booked, held or confirmed. keyflight's
 *     template says "Your reservation is booked and confirmed" — that single
 *     sentence is the strongest false claim on their document.
 *   - Never titled "Ticket", "E-Ticket", "Confirmation" or "Reservation".
 *   - No warning text: the editor's warnings are for the person filling the form.
 */
export function ItineraryDocument({ itinerary }: { itinerary: Itinerary }) {
  const segment = itinerary.segments[0];
  const origin = getAirport(segment.originIata);
  const destination = getAirport(segment.destinationIata);
  const derived = deriveSegment(segment);

  const named = itinerary.passengers.filter((p) => p.surname.trim() || p.givenNames.trim());
  const carrier = airlineName(segment.airlineCode);

  return (
    <article
      id="itinerary-document"
      className="relative mx-auto bg-white p-10 font-[family-name:var(--font-doc)] text-neutral-900"
      style={{ maxWidth: "210mm" }}
    >
      {SPECIMEN_MARKING && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center
                     text-6xl font-bold tracking-widest text-neutral-900 opacity-10"
          style={{ transform: "rotate(-24deg)" }}
        >
          SPECIMEN
        </div>
      )}

      <header className="flex items-start justify-between border-b border-neutral-300 pb-4">
        <div>
          <div className="text-lg font-semibold tracking-tight">{TOOL_NAME}</div>
          <h1 className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
            Proposed Travel Itinerary
          </h1>
        </div>
        <dl className="text-right text-xs">
          <dt className="text-neutral-500">PNR</dt>
          <dd className="font-mono text-base font-semibold">{itinerary.pnr || "—"}</dd>
        </dl>
      </header>

      <section className="mt-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Passenger{named.length === 1 ? "" : "s"}
        </h2>
        {named.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-400">—</p>
        ) : (
          <ol className="mt-1 space-y-0.5">
            {named.map((p, i) => (
              <li key={p.id} className="flex gap-3 text-sm">
                <span className="w-4 text-neutral-400">{i + 1}</span>
                <span className="font-medium tracking-wide">{formatPassenger(p)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Flight
        </h2>

        <div className="mt-2 border border-neutral-300">
          <div className="flex items-baseline justify-between border-b border-neutral-200
                          bg-neutral-50 px-4 py-2 text-xs">
            <span className="font-medium">
              {segment.depart.date ? formatDocDate(segment.depart.date) : "—"}
            </span>
            <span>
              {carrier ? (
                <>
                  <span className="font-medium">{carrier}</span>{" "}
                  <span className="font-mono text-neutral-600">{segment.flightNumber}</span>
                </>
              ) : (
                <span className="font-mono text-neutral-600">
                  {segment.flightNumber || segment.airlineCode || "—"}
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4">
            <Endpoint
              label="Departure"
              iata={origin?.iata ?? null}
              city={origin?.city ?? null}
              name={origin?.name ?? null}
              wall={segment.depart}
              tz={derived.originTz}
            />

            <div className="text-center text-[10px] leading-tight text-neutral-500">
              <div className="border-t border-neutral-300 pb-1" style={{ width: "3rem" }} />
              {derived.durationMinutes !== null && derived.durationMinutes >= 0 ? (
                <span className="font-mono">{formatDuration(derived.durationMinutes)}</span>
              ) : (
                <span>—</span>
              )}
            </div>

            <Endpoint
              label="Arrival"
              iata={destination?.iata ?? null}
              city={destination?.city ?? null}
              name={destination?.name ?? null}
              wall={segment.arrive}
              tz={derived.destinationTz}
              alignRight
            />
          </div>

          {derived.nextDay && (
            <div className="border-t border-neutral-200 px-4 py-1.5 text-[10px] text-neutral-500">
              Arrives the following day.
            </div>
          )}
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          Times shown are local to each airport, with the UTC offset in force on that
          date.
        </p>
      </section>

      <footer className="mt-8 flex items-baseline justify-between border-t border-neutral-300 pt-3
                         text-[10px] text-neutral-500">
        <span>
          {TOOL_NAME}
          {itinerary.generatedAt && (
            <> · generated {formatDocDate(itinerary.generatedAt.slice(0, 10), false)}</>
          )}
        </span>
        <span>Reference {itinerary.pnr || "—"}</span>
      </footer>
    </article>
  );
}

function Endpoint({
  label,
  iata,
  city,
  name,
  wall,
  tz,
  alignRight = false,
}: {
  label: string;
  iata: string | null;
  city: string | null;
  name: string | null;
  wall: { date: string; time: string };
  tz: string | null;
  alignRight?: boolean;
}) {
  const offset = tz && wall.date && wall.time ? offsetLabel(wall, tz) : null;

  return (
    <div className={alignRight ? "text-right" : ""}>
      <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2" style={alignRight ? { justifyContent: "flex-end" } : undefined}>
        <span className="font-mono text-xl font-semibold leading-none">{iata ?? "—"}</span>
        <span className="text-sm">{city ?? ""}</span>
      </div>
      <div className="text-[11px] text-neutral-500">{name ?? ""}</div>
      <div className="mt-1 text-sm">
        {formatDocDateTime(wall) || "—"}
        {/* A literal space, not just a margin: the document must read correctly when
            its text is selected and copied, not only when it is painted. */}
        {offset && <> <span className="font-mono text-[10px] text-neutral-500">{offset}</span></>}
      </div>
    </div>
  );
}
