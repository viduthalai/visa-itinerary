"use client";

import { useEffect, useMemo, useState } from "react";
import { FlightDetails, RouteFields } from "@/components/FlightDetails";
import { FlightSearch, type PickedFlight } from "@/components/FlightSearch";
import { PassengerFields } from "@/components/PassengerFields";
import {
  emptyPassenger,
  generatePnr,
  newItinerary,
  type Passenger,
  passengerWarnings,
  type Segment,
  warningsFor,
} from "@/lib/itinerary";

/** One flight, no more. Search picks it; the fields below let you adjust it. */
export default function Page() {
  const [itinerary, setItinerary] = useState(newItinerary);

  // PNR and generatedAt are non-deterministic, so they are produced on the client
  // only — during render they would differ between server and client HTML and
  // trip a hydration mismatch. Generated once, then left alone.
  useEffect(() => {
    setItinerary((it) =>
      it.pnr ? it : { ...it, pnr: generatePnr(), generatedAt: new Date().toISOString() },
    );
  }, []);

  const segment = itinerary.segments[0];
  const warnings = useMemo(
    () => [...warningsFor([segment]), ...passengerWarnings(itinerary.passengers)],
    [segment, itinerary.passengers],
  );

  function patch(p: Partial<Segment>) {
    setItinerary((it) => ({
      ...it,
      segments: [{ ...it.segments[0], ...p }],
    }));
  }

  function patchPassenger(id: string, p: Partial<Passenger>) {
    setItinerary((it) => ({
      ...it,
      passengers: it.passengers.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
  }

  function addPassenger() {
    setItinerary((it) => ({ ...it, passengers: [...it.passengers, emptyPassenger()] }));
  }

  function removePassenger(id: string) {
    setItinerary((it) => ({ ...it, passengers: it.passengers.filter((x) => x.id !== id) }));
  }

  function applyPicked(f: PickedFlight) {
    patch({
      airlineCode: f.airlineCode,
      flightNumber: f.flightNumber,
      depart: f.depart,
      arrive: f.arrive,
    });
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Visa Itinerary</h1>
        <span className="font-mono text-xs text-neutral-500">PNR {itinerary.pnr || "—"}</span>
      </header>

      <ol className="mt-6 space-y-4">
        <li>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 1 — Route
          </h2>
          <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-4">
            <RouteFields segment={segment} onChange={patch} />
          </div>
        </li>

        <li>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 2 — Choose a flight
          </h2>
          <div className="mt-2">
            <FlightSearch
              originIata={segment.originIata}
              destinationIata={segment.destinationIata}
              date={segment.depart.date}
              onPick={applyPicked}
            />
          </div>
        </li>

        <li>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 3 — Confirm
          </h2>
          <div className="mt-2">
            <FlightDetails segment={segment} onChange={patch} />
          </div>
        </li>

        <li>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 4 — Passengers
          </h2>
          <div className="mt-2">
            <PassengerFields
              passengers={itinerary.passengers}
              onChange={patchPassenger}
              onAdd={addPassenger}
              onRemove={removePassenger}
            />
          </div>
        </li>
      </ol>

      {warnings.length > 0 && (
        <section
          aria-label="Warnings"
          className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Check these — they do not block generating the document
          </h2>
          <ul className="mt-1.5 space-y-0.5 text-sm text-amber-900">
            {warnings.map((w, i) => (
              <li key={`${w.segmentId}-${i}`}>{w.text}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
