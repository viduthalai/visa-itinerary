"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlightDetails, RouteFields } from "@/components/FlightDetails";
import { FlightResults } from "@/components/FlightResults";
import { FareFields } from "@/components/FareFields";
import { ItineraryDocument } from "@/components/ItineraryDocument";
import { PassengerFields } from "@/components/PassengerFields";
import { StepProgress, type StepDef } from "@/components/StepProgress";
import { getAirport } from "@/lib/airports";
import { toPickedFlight } from "@/lib/flightPick";
import type { FlightResult, SearchResponse } from "@/lib/flightSearch";
import {
  emptyPassenger,
  generatePnr,
  generateTicketNumber,
  newItinerary,
  type Fare,
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

const STEPS: StepDef[] = [
  { n: 1, title: "Route" },
  { n: 2, title: "Choose a flight" },
  { n: 3, title: "Confirm flight" },
  { n: 4, title: "Passengers" },
  { n: 5, title: "Document" },
];

/** One flight, one step at a time: route -> results -> confirm -> passengers -> document. */
export default function Page() {
  const [itinerary, setItinerary] = useState(newItinerary);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [step, setStep] = useState(1);

  // PNR and generatedAt are non-deterministic, so they are produced on the client
  // only — during render they would differ between server and client HTML and
  // trip a hydration mismatch. Generated once, then left alone.
  useEffect(() => {
    setItinerary((it) =>
      it.pnr
        ? it
        : {
            ...it,
            pnr: generatePnr(),
            ticketNumber: generateTicketNumber(),
            generatedAt: new Date().toISOString(),
          },
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
    setStep(1);
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
      setStep(2);
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
    if (!picked) return;
    patch(picked);
    setStep(3);
  }

  function patchFare(p: Partial<Fare>) {
    setItinerary((it) => ({ ...it, fare: { ...it.fare, ...p } }));
  }

  function patchPassenger(id: string, p: Partial<Passenger>) {
    setItinerary((it) => ({
      ...it,
      passengers: it.passengers.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
  }

  /*
   * Wizard navigation.
   *
   * `step` is what the user is looking at; `reachable` is what the DATA permits.
   * They are separate on purpose: changing the route invalidates the chosen flight,
   * which must pull the user back even though they had already advanced. Deriving
   * reachability from the itinerary rather than from a "furthest visited" counter
   * means the wizard can never sit on a step whose inputs no longer exist.
   */
  const reachable = flightChosen ? STEPS.length : search.status === "done" ? 2 : 1;

  useEffect(() => {
    setStep((s) => Math.min(s, flightChosen ? STEPS.length : search.status === "done" ? 2 : 1));
  }, [flightChosen, search.status]);

  const canContinue = step < STEPS.length && step < reachable;

  return (
    <main className="mx-auto max-w-2xl p-8 pb-24">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Visa Itinerary</h1>
        <span className="font-mono text-xs text-neutral-500">PNR {itinerary.pnr || "—"}</span>
      </header>

      <div className="mt-6">
        <StepProgress steps={STEPS} current={step} reachable={reachable} onJump={setStep} />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {STEPS[step - 1].title}
        </h2>

        {step === 1 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <RouteFields segment={segment} onChange={patchRoute} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runSearch}
                disabled={!canSearch || search.status === "loading"}
                className="rounded-md bg-neutral-900 px-3.5 py-2 text-xs text-white
                           disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {search.status === "loading" ? "Searching…" : "Search flights"}
              </button>
              {/*
                The manual path has to stay reachable: search cannot return past
                dates or a flight the provider does not carry, and removing this
                would make those cases impossible rather than merely awkward.
              */}
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canSearch}
                className="text-xs text-neutral-600 underline underline-offset-2
                           disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline"
              >
                Skip search — enter the flight manually
              </button>
            </div>
            {!canSearch && (
              <p className="mt-2 text-xs text-neutral-500">
                Pick two different airports and a departure date.
              </p>
            )}
            {search.status === "error" && (
              <p className="mt-2 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-700">
                {search.message}
              </p>
            )}
          </div>
        )}

        {step === 2 && search.status === "done" && origin && (
          <FlightResults
            data={search.data}
            origin={origin}
            selectedFlightNumber={segment.flightNumber}
            onPick={pick}
          />
        )}

        {step === 3 && <FlightDetails segment={segment} onChange={patch} />}

        {step === 4 && (
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
        )}

        {step === 5 && (
          <>
            <div className="mb-3">
              <FareFields fare={itinerary.fare} onChange={patchFare} />
            </div>
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
          </>
        )}
      </div>

      {/* Step navigation */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-md border border-neutral-300 px-3.5 py-2 text-xs text-neutral-700
                     disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
        >
          Back
        </button>
        {canContinue && (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="rounded-md bg-neutral-900 px-3.5 py-2 text-xs text-white"
          >
            Continue
          </button>
        )}
      </div>

      {/*
        Warnings stay outside the step container so they remain visible on every
        step. A warning raised at step 3 that vanishes when the user reaches step 5
        is a warning the user never acts on.
      */}
      {warnings.length > 0 && (
        <section
          aria-label="Warnings"
          className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-3"
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
