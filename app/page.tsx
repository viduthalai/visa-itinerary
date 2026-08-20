"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlightDetails, RouteFields } from "@/components/FlightDetails";
import { FlightResults } from "@/components/FlightResults";
import { FareFields } from "@/components/FareFields";
import { ItineraryDocument } from "@/components/ItineraryDocument";
import { PassengerFields } from "@/components/PassengerFields";
import { StepProgress, type StepDef } from "@/components/StepProgress";
import { HeroBand } from "@/components/HeroBand";
import { Button, Card } from "@/components/ui";
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
    <>
      <HeroBand reference={itinerary.pnr} />

      <main id="main" className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-6">
      <div className="mt-8">
        <StepProgress steps={STEPS} current={step} reachable={reachable} onJump={setStep} />
      </div>

      {/* `key` on the step makes React remount the panel, which restarts the
          fade — a step change should read as a change, not a silent repaint. */}
      <div key={step} className="step-panel mt-8">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
          {STEPS[step - 1].title}
        </h2>

        {step === 1 && (
          <Card>
            <RouteFields
              segment={segment}
              onChange={patchRoute}
              returnDate={returnDate}
              onReturnDateChange={setReturnDate}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={runSearch} disabled={!canSearch || searching}>
                {searching ? "Searching…" : returnDate ? "Search both flights" : "Search flights"}
              </Button>
              {/*
                The manual path has to stay reachable: search cannot return past
                dates or a flight the provider does not carry, and removing this
                would make those cases impossible rather than merely awkward.
              */}
              <Button
                type="button"
                variant="link"
                onClick={() => setStep(3)}
                disabled={!canSearch}
              >
                Skip search — enter flights manually
              </Button>
            </div>
            {!canSearch && (
              <p className="mt-3 text-xs text-ink-mute">
                Pick two different airports and a departure date to search.
              </p>
            )}
            {searches.map((st, i) =>
              st.status === "error" ? (
                <p
                  key={`err-${i}`}
                  className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  {legLabel(itinerary.segments, i)}: {st.message}
                </p>
              ) : null,
            )}
          </Card>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            {itinerary.segments.map((leg, i) => {
              const st = searches[i];
              const legOrigin = getAirport(leg.originIata);
              if (!st || st.status !== "done" || !legOrigin) {
                return (
                  <p key={leg.id} className="text-sm text-ink-mute">
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
            <Card className="bg-elevated">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Live preview</p>
                  <p className="text-xs text-ink-mute">
                    What you download is this exact page — there is no second template.
                  </p>
                </div>
                <Button type="button" variant="accent" onClick={() => window.print()}>
                  <DownloadIcon />
                  Save as PDF
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg shadow-[var(--shadow-paper)]">
                <ItineraryDocument itinerary={itinerary} />
              </div>
            </Card>
          </>
        )}
      </div>

      {/*
        Step navigation. Back is ABSENT on step 1 rather than disabled — a disabled
        control still occupies attention and invites a click that does nothing.
        The empty span keeps Continue right-aligned without it.
      */}
      <div className="mt-6 flex items-center justify-between">
        {step > 1 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        {canContinue && (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
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
          className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Worth checking — none of these block your document
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
            {warnings.map((w, i) => (
              <li key={`${w.segmentId}-${i}`}>{w.text}</li>
            ))}
          </ul>
        </section>
      )}

      {/*
        These two sections exist because the header and footer link to them. A nav
        link pointing at an anchor that does not exist is a broken link, so the
        content is real rather than placeholder marketing.

        They sit in a dark band that matches the hero, breaking the light form area
        into a clear "your work" zone above and a "about the tool" zone below.
      */}
      <div
        className="mt-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-16 rounded-2xl"
        style={{
          background: '#0a1120',
          color: '#e9eef7',
          // Reset the light overrides that main applied, so semantic tokens
          // inside this container resolve to the dark values again.
          '--color-canvas': '#0a1120',
          '--color-surface': '#111b2e',
          '--color-ink': '#e9eef7',
          '--color-ink-soft': '#a9b7cd',
          '--color-ink-mute': '#77879f',
          '--color-line': '#25324b',
          '--color-primary': '#3b82f6',
          '--color-secondary': '#7dd3fc',
        } as React.CSSProperties}
      >
      <section id="how-it-works" className="scroll-mt-20">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Enter your route",
              d: "Pick airports from 4,565 with IATA codes. Add a return date for a round trip, or leave it blank for one-way.",
            },
            {
              t: "Choose your flights",
              d: "Search returns carriers and times. Arrival is computed in the destination's timezone, so the document never prints a time that airport would not show.",
            },
            {
              t: "Save the PDF",
              d: "Add passengers and any terminal, cabin or baggage detail, then print. The preview is the PDF — there is no second template to drift.",
            },
          ].map((s2, i) => (
            <li
              key={s2.t}
              className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15
                           font-[family-name:var(--font-display)] text-sm font-semibold text-secondary"
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{s2.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s2.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className="mt-16 scroll-mt-20">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
          FAQ
        </h2>
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
          {[
            {
              q: "Is this a booking?",
              a: "No. It builds a document from details you enter. Nothing is reserved with any airline and no payment is taken.",
            },
            {
              q: "Where does my data go?",
              a: "Nowhere. Everything stays in your browser — there is no account and no database. Closing the tab discards it.",
            },
            {
              q: "Are the flight times real?",
              a: "Times come from the flight search where a provider is configured, and are recalculated in each airport's own timezone. Without a provider token the search returns clearly-labelled sample data.",
            },
            {
              q: "Why is the reference number 6 characters?",
              a: "It matches the shape airlines use. It is generated locally and resolves nowhere, so treat it as a document number rather than something anyone can look up.",
            },
          ].map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink transition-colors duration-200 hover:bg-muted">
                {f.q}
                <span
                  aria-hidden
                  className="text-ink-mute transition-transform duration-200 group-open:rotate-180"
                >
                  <ChevronIcon />
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      </div>
      </main>
    </>
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

function DownloadIcon() {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
