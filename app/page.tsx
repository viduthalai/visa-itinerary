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
  allLegsChosen,
  emptyPassenger,
  generatePnr,
  generateTicketNumber,
  newItinerary,
  type Fare,
  type Itinerary,
  type Passenger,
  passengerWarnings,
  type Segment,
  warningsFor,
  withReturnLeg,
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
  // One search state PER LEG. A round trip searches two different routes on two
  // different dates, so a single shared state would let the return results
  // overwrite the outbound ones.
  const [searches, setSearches] = useState<SearchState[]>([{ status: "idle" }]);
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
  const legs = itinerary.segments;
  const returnDate = legs[1]?.depart.date ?? "";

  const canSearch =
    Boolean(origin && destination) &&
    origin?.iata !== destination?.iata &&
    /^\d{4}-\d{2}-\d{2}$/.test(segment.depart.date);

  // Every leg needs a flight — whether it came from the results list or from
  // manual entry. A round trip with only the outbound chosen is not ready.
  const flightChosen = allLegsChosen(legs);

  const warnings = useMemo(
    () => [
      ...warningsFor(legs),
      ...(flightChosen ? passengerWarnings(itinerary.passengers) : []),
    ],
    [legs, itinerary.passengers, flightChosen],
  );

  function patchLeg(i: number, p: Partial<Segment>) {
    setItinerary((it) => ({
      ...it,
      segments: it.segments.map((s, idx) => (idx === i ? { ...s, ...p } : s)),
    }));
  }

  /**
   * Changing the outbound route or date invalidates the results, the chosen
   * outbound flight, AND the return leg — the return route is the outbound route
   * reversed, so moving the destination moves where the return starts. Without
   * this the document would assert a flight that contradicts its own route, which
   * already happened once when only the search results were reset.
   */
  function patchRoute(p: Partial<Segment>) {
    setSearches((prev) => prev.map(() => ({ status: "idle" }) as SearchState));
    setStep(1);
    setItinerary((it) => {
      const current = it.segments[0];
      const next = { ...current, ...p };
      const routeChanged =
        next.originIata !== current.originIata ||
        next.destinationIata !== current.destinationIata ||
        next.depart.date !== current.depart.date;

      const outbound = routeChanged
        ? {
            ...next,
            airlineCode: "",
            flightNumber: "",
            depart: { date: next.depart.date, time: "" },
            arrive: { date: "", time: "" },
          }
        : next;

      // Re-derive the return leg from the (possibly new) outbound route.
      const withOutbound: Itinerary = { ...it, segments: [outbound, ...it.segments.slice(1)] };
      return withReturnLeg(withOutbound, it.segments[1]?.depart.date ?? "");
    });
  }

  /** Adding, moving or clearing the return date. */
  function setReturnDate(date: string) {
    setSearches((prev) => {
      const next = [prev[0] ?? { status: "idle" }];
      if (date) next.push({ status: "idle" });
      return next as SearchState[];
    });
    setStep(1);
    setItinerary((it) => withReturnLeg(it, date));
  }

  const runSearch = useCallback(async () => {
    const targets = itinerary.segments
      .map((s, i) => ({ i, s, o: getAirport(s.originIata), d: getAirport(s.destinationIata) }))
      .filter((t) => t.o && t.d && /^\d{4}-\d{2}-\d{2}$/.test(t.s.depart.date));

    if (targets.length === 0) return;
    setSearches(itinerary.segments.map(() => ({ status: "loading" }) as SearchState));

    /*
     * Both legs are fetched in parallel and settled INDEPENDENTLY. A failed return
     * search must not discard usable outbound results — the user can still pick the
     * outbound and enter the return by hand.
     */
    const settled = await Promise.all(
      targets.map(async (t): Promise<[number, SearchState]> => {
        try {
          const res = await fetch(
            `/api/flights?origin=${t.o!.iata}&destination=${t.d!.iata}&date=${t.s.depart.date}`,
          );
          const body = await res.json();
          if (!res.ok) {
            return [t.i, { status: "error", message: body.error ?? `HTTP ${res.status}` }];
          }
          return [t.i, { status: "done", data: body as SearchResponse }];
        } catch (err) {
          return [
            t.i,
            { status: "error", message: err instanceof Error ? err.message : "Request failed" },
          ];
        }
      }),
    );

    setSearches((prev) => {
      const next = itinerary.segments.map((_, i) => prev[i] ?? { status: "idle" });
      for (const [i, state] of settled) next[i] = state;
      return next as SearchState[];
    });
    if (settled.some(([, st]) => st.status === "done")) setStep(2);
  }, [itinerary.segments]);

  function pick(legIndex: number, r: FlightResult) {
    const leg = itinerary.segments[legIndex];
    const o = getAirport(leg?.originIata ?? null);
    const d = getAirport(leg?.destinationIata ?? null);
    if (!o || !d) return;
    const picked = toPickedFlight(r, o.tz, d.tz);
    if (!picked) return;
    patchLeg(legIndex, picked);
    // Only advance once every leg has a flight — otherwise picking the outbound
    // would skip the user past the return list they still have to choose from.
    const remaining = itinerary.segments.some(
      (s, i) => i !== legIndex && !(s.airlineCode && s.depart.time),
    );
    if (!remaining) setStep(3);
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
  const anyResults = searches.some((s) => s.status === "done");
  const searching = searches.some((s) => s.status === "loading");
  const reachable = flightChosen ? STEPS.length : anyResults ? 2 : 1;

  useEffect(() => {
    setStep((s) => Math.min(s, reachable));
  }, [reachable]);

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
            <RouteFields
              segment={segment}
              onChange={patchRoute}
              returnDate={returnDate}
              onReturnDateChange={setReturnDate}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runSearch}
                disabled={!canSearch || searching}
                className="rounded-md bg-neutral-900 px-3.5 py-2 text-xs text-white
                           disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {searching ? "Searching…" : returnDate ? "Search both flights" : "Search flights"}
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
            {searches.map((st, i) =>
              st.status === "error" ? (
                <p
                  key={`err-${i}`}
                  className="mt-2 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-700"
                >
                  {legLabel(itinerary.segments, i)}: {st.message}
                </p>
              ) : null,
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            {itinerary.segments.map((leg, i) => {
              const st = searches[i];
              const legOrigin = getAirport(leg.originIata);
              if (!st || st.status !== "done" || !legOrigin) {
                return (
                  <p key={leg.id} className="text-sm text-neutral-500">
                    {legLabel(itinerary.segments, i)}: no results —{" "}
                    {st?.status === "error"
                      ? "search failed, enter this leg by hand on the next step."
                      : "not searched."}
                  </p>
                );
              }
              return (
                <FlightResults
                  key={leg.id}
                  heading={
                    itinerary.segments.length > 1 ? legLabel(itinerary.segments, i) : undefined
                  }
                  data={st.data}
                  origin={legOrigin}
                  selectedFlightNumber={leg.flightNumber}
                  onPick={(r) => pick(i, r)}
                />
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            {itinerary.segments.map((leg, i) => (
              <FlightDetails
                key={leg.id}
                segment={leg}
                heading={
                  itinerary.segments.length > 1
                    ? legLabel(itinerary.segments, i)
                    : "Flight details"
                }
                onChange={(pp) => patchLeg(i, pp)}
              />
            ))}
          </div>
        )}

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

/**
 * "Outbound — BLR to DXB". Used for search headings, per-leg detail headings and
 * error messages, so one leg can never be described two different ways.
 */
function legLabel(segments: Segment[], i: number): string {
  const s = segments[i];
  const route = s?.originIata && s?.destinationIata ? `${s.originIata} to ${s.destinationIata}` : "route not set";
  if (segments.length < 2) return route;
  return `${i === 0 ? "Outbound" : "Return"} — ${route}`;
}
