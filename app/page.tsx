"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlightDetails, RouteFields } from "@/components/FlightDetails";
import { FlightResults } from "@/components/FlightResults";
import { ItineraryDocument } from "@/components/ItineraryDocument";
import { PassengerFields } from "@/components/PassengerFields";
import { getAirport } from "@/lib/airports";
import { toPickedFlight } from "@/lib/flightPick";
import type { FlightResult, SearchResponse } from "@/lib/flightSearch";
import {
  emptyPassenger,
  generatePnr,
  newItinerary,
  type Passenger,
  passengerWarnings,
  type Segment,
  warningsFor,
} from "@/lib/itinerary";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: SearchResponse };

/** One flight, revealed a step at a time: route -> results -> confirm -> passengers. */
export default function Page() {
  const [itinerary, setItinerary] = useState(newItinerary);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });

  // PNR and generatedAt are non-deterministic, so they are produced on the client
  // only — during render they would differ between server and client HTML and
  // trip a hydration mismatch. Generated once, then left alone.
  useEffect(() => {
    setItinerary((it) =>
      it.pnr ? it : { ...it, pnr: generatePnr(), generatedAt: new Date().toISOString() },
    );
  }, []);

  const segment = itinerary.segments[0];
  const origin = getAirport(segment.originIata);
  const destination = getAirport(segment.destinationIata);

  const canSearch =
    Boolean(origin && destination) &&
    origin?.iata !== destination?.iata &&
    /^\d{4}-\d{2}-\d{2}$/.test(segment.depart.date);

  // A flight has been chosen once the carrier and a departure time are set —
  // whether that came from the results list or from manual entry.
  const flightChosen = Boolean(segment.airlineCode && segment.depart.time);

  const warnings = useMemo(
    () => [
      ...warningsFor([segment]),
      ...(flightChosen ? passengerWarnings(itinerary.passengers) : []),
    ],
    [segment, itinerary.passengers, flightChosen],
  );

  function patch(p: Partial<Segment>) {
    setItinerary((it) => ({ ...it, segments: [{ ...it.segments[0], ...p }] }));
  }

  /**
   * Changing the route or date invalidates both the results AND any flight already
   * chosen — otherwise steps 3 and 4 keep showing LH411 to MUC after the route has
   * been changed to LHR, and the document would assert a flight that contradicts
   * its own route.
   */
  function patchRoute(p: Partial<Segment>) {
    setSearch({ status: "idle" });
    setItinerary((it) => {
      const current = it.segments[0];
      const next = { ...current, ...p };
      const routeChanged =
        next.originIata !== current.originIata ||
        next.destinationIata !== current.destinationIata ||
        next.depart.date !== current.depart.date;

      if (!routeChanged) return { ...it, segments: [next] };

      return {
        ...it,
        segments: [
          {
            ...next,
            airlineCode: "",
            flightNumber: "",
            depart: { date: next.depart.date, time: "" },
            arrive: { date: "", time: "" },
          },
        ],
      };
    });
  }

  const runSearch = useCallback(async () => {
    if (!origin || !destination) return;
    setSearch({ status: "loading" });
    try {
      const res = await fetch(
        `/api/flights?origin=${origin.iata}&destination=${destination.iata}&date=${segment.depart.date}`,
      );
      const body = await res.json();
      if (!res.ok) {
        setSearch({ status: "error", message: body.error ?? `HTTP ${res.status}` });
        return;
      }
      setSearch({ status: "done", data: body as SearchResponse });
    } catch (err) {
      setSearch({
        status: "error",
        message: err instanceof Error ? err.message : "Request failed",
      });
    }
  }, [origin, destination, segment.depart.date]);

  function pick(r: FlightResult) {
    if (!origin || !destination) return;
    const picked = toPickedFlight(r, origin.tz, destination.tz);
    if (picked) patch(picked);
  }

  function patchPassenger(id: string, p: Partial<Passenger>) {
    setItinerary((it) => ({
      ...it,
      passengers: it.passengers.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
  }

  return (
    <main className="mx-auto max-w-2xl p-8 pb-24">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Visa Itinerary</h1>
        <span className="font-mono text-xs text-neutral-500">PNR {itinerary.pnr || "—"}</span>
      </header>

      <div className="mt-6 space-y-6">
        <Step n={1} title="Route">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <RouteFields segment={segment} onChange={patchRoute} />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={runSearch}
                disabled={!canSearch || search.status === "loading"}
                className="rounded-md bg-neutral-900 px-3.5 py-2 text-xs text-white
                           disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {search.status === "loading" ? "Searching…" : "Search flights"}
              </button>
              {!canSearch && (
                <span className="text-xs text-neutral-500">
                  Pick two different airports and a departure date.
                </span>
              )}
            </div>
            {search.status === "error" && (
              <p className="mt-2 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-700">
                {search.message}
              </p>
            )}
          </div>
        </Step>

        {search.status === "done" && origin && (
          <Step n={2} title="Choose a flight">
            <FlightResults
              data={search.data}
              origin={origin}
              selectedFlightNumber={segment.flightNumber}
              onPick={pick}
            />
          </Step>
        )}

        {flightChosen && (
          <Step n={3} title="Confirm the flight">
            <FlightDetails segment={segment} onChange={patch} />
          </Step>
        )}

        {flightChosen && (
          <Step n={4} title="Passengers">
            <PassengerFields
              passengers={itinerary.passengers}
              onChange={patchPassenger}
              onAdd={() =>
                setItinerary((it) => ({ ...it, passengers: [...it.passengers, emptyPassenger()] }))
              }
              onRemove={(id) =>
                setItinerary((it) => ({
                  ...it,
                  passengers: it.passengers.filter((x) => x.id !== id),
                }))
              }
            />
          </Step>
        )}

        {flightChosen && (
          <Step n={5} title="Document">
            <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-neutral-600">Live preview</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-md bg-neutral-900 px-3.5 py-2 text-xs text-white"
                >
                  Print / Save as PDF
                </button>
              </div>
              <div className="overflow-hidden rounded-md shadow-sm">
                <ItineraryDocument itinerary={itinerary} />
              </div>
            </div>
          </Step>
        )}

        {warnings.length > 0 && (
          <section
            aria-label="Warnings"
            className="rounded-md border border-amber-300 bg-amber-50 p-3"
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
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-label={`Step ${n}: ${title}`}>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide
                     text-neutral-500">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900
                     text-[10px] text-white"
        >
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
