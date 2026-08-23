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
import { FAQ_ITEMS } from "@/lib/content";
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
  hasAnyPassenger,
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
  /*
   * Step and direction are ONE piece of state, not two.
   *
   * The panel animation needs to know which way the user moved, and deriving that
   * from a previous-value ref would be read during render while being written in an
   * effect — two sources that can disagree for a frame. Holding both in a single
   * object makes every transition atomic: there is no render in which the step has
   * changed but the direction has not.
   *
   * `setStep` keeps its original signature (number or updater) so all eight existing
   * call sites — reset, auto-advance, jump, Back, Continue — work unchanged and pick
   * up the direction for free.
   */
  const [nav, setNav] = useState<{ step: number; dir: "fwd" | "back" }>({
    step: 1,
    dir: "fwd",
  });
  const step = nav.step;
  const setStep = useCallback((next: number | ((s: number) => number)) => {
    setNav((prev) => {
      const n = typeof next === "function" ? next(prev.step) : next;
      return n === prev.step ? prev : { step: n, dir: n < prev.step ? "back" : "fwd" };
    });
  }, []);

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
  /*
   * Reachability now has THREE gates, not two.
   *
   * It used to be `flightChosen ? STEPS.length : ...`, which unlocked steps 3, 4 and 5
   * simultaneously the moment a flight was picked -- so the Document step, which is the
   * whole deliverable, could be opened with no passenger entered and would render an
   * empty itinerary as though it were finished. A UI that presents an empty document as
   * a complete one is worse than one that refuses to show it.
   *
   * Step 4 (Passengers) stays reachable on flight choice -- you must be able to GET to
   * the passenger form. Only step 5 waits for it to be filled.
   */
  const documentReady = hasAnyPassenger(itinerary.passengers);
  const reachable = flightChosen
    ? documentReady
      ? STEPS.length
      : STEPS.length - 1
    : anyResults
      ? 2
      : 1;

  useEffect(() => {
    setStep((s) => Math.min(s, reachable));
  }, [reachable]);

  const canContinue = step < STEPS.length && step < reachable;

  /*
   * Text for the live region. Derived, never stored: a stored copy is a second source
   * of truth that goes stale precisely when the announcement matters.
   *
   * The counts are read from the same `searches` array the list renders from, so the
   * announcement cannot claim a different number of flights than the page shows —
   * which is the failure mode that makes a live region worse than none.
   */
  const liveStatus = useMemo(() => {
    if (searching) return "Searching for flights…";
    if (searches.some((s) => s.status === "error"))
      return "Flight search failed. You can enter the flight details by hand instead.";
    if (!anyResults) return "";
    const parts = searches.map((s, i) => {
      if (s.status !== "done") return null;
      const n = s.data.results.length;
      const label = legLabel(itinerary.segments, i);
      return `${n} ${n === 1 ? "flight" : "flights"} found for ${label}`;
    });
    const found = parts.filter(Boolean).join(". ");
    return found ? `${found}. Now on step ${step} of ${STEPS.length}: ${STEPS[step - 1].title}.` : "";
  }, [searching, searches, anyResults, itinerary.segments, step]);

  return (
    <>
      <HeroBand reference={itinerary.pnr} />

      {/*
        `main` carries no width or padding of its own: each zone below owns a
        full-bleed background with its own centred container inside. Putting the
        max-width on `main` is what forced the explainer band to fake full-bleed
        with negative margins, which is why its rounded corners landed in mid-air.
      */}
      <main id="main">
      {/* ── Light zone: the work surface ───────────────────────────────────── */}
      <div className="theme-light">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
      <div className="mt-8">
        <StepProgress steps={STEPS} current={step} reachable={reachable} onJump={setStep} />
      </div>

      {/*
        The only announcement a screen-reader user gets for the primary action.
        Pressing "Search flights" changes the step, swaps the panel and lands three
        results — all of it silent without this. Measured with 2.5s of injected
        latency: the button label goes to "Searching…" but nothing was announced, so a
        non-sighted user got silence after pressing the main button and then a page
        that had quietly rearranged itself.

        `aria-live="polite"` rather than assertive: it must not interrupt someone
        mid-sentence in a field. Rendered but visually hidden, so it can never drift
        from the state it describes the way a duplicated visible label would.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {liveStatus}
      </p>

      {/* `key` on the step makes React remount the panel, which restarts the
          animation — a step change should read as a change, not a silent repaint.
          The class is directional so the motion says WHICH way you moved. */}
      <div key={step} className={`mt-8 step-panel-${nav.dir}`}>
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
            {/*
              Skeleton, not a spinner.
              It lives on step 1 rather than step 2 because step 2 is unreachable until
              results exist (`reachable`), so the wait genuinely happens here.
              A skeleton previews the SHAPE of what is coming and holds the height, so
              the results do not shove the page when they land. With the local mock this
              is invisible (~100ms); at a real provider's 300ms–2s it is the difference
              between a considered wait and a jump.
            */}
            {searching && <ResultSkeleton legs={itinerary.segments.length} />}
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
          className="mt-6 rounded-xl border border-amber-500/40 bg-amber-50 p-4"
        >
          {/* Amber-900 on amber-50, NOT the dark zone's amber-300 on amber-400/10:
              that pairing is a light cream on a pale wash, which measured under
              2:1 once this panel moved onto a white surface. */}
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Worth checking — none of these block your document
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
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

        They sit in a dark band that matches the hero, separating the "your work"
        zone above from the "about the tool" zone below. It is FULL BLEED with no
        border radius: the previous version was a `rounded-2xl` card stretched to
        the edges with negative margins, so its corners curved away from nothing
        and read as a mistake. A zone boundary is a straight edge — the rounding
        belongs on the cards inside it, not on the band.
      */}
      </div>
      </div>
      {/* ── Dark zone: inherits the root palette, no override needed ────────── */}
      <div className="border-t border-line">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <section id="how-it-works" className="scroll-mt-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Enter your route",
              d: "Pick airports from 4,565 with IATA codes. Add a return date for a round trip, or leave it blank for one-way.",
              icon: <RouteMark />,
            },
            {
              t: "Choose your flights",
              d: "Search returns carriers and times. Arrival is computed in the destination's timezone, so the document never prints a time that airport would not show.",
              icon: <ListMark />,
            },
            {
              t: "Save the PDF",
              d: "Add passengers and any terminal, cabin or baggage detail, then print. The preview is the PDF — there is no second template to drift.",
              icon: <PageMark />,
            },
          ].map((s2) => (
            <li
              key={s2.t}
              className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              {/*
                A mark, not the index. The <ol> already conveys order structurally, so
                the digit was carrying no information a screen reader did not already
                have — while a glyph of the actual action gives a sighted user something
                to scan by. Vector, currentColor, no emoji: emoji resolve to whichever
                colour-emoji font the machine has, so the same page prints differently
                on a different computer.
              */}
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-secondary"
              >
                {s2.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{s2.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s2.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className="mt-16 scroll-mt-20">
        {/*
          FAQPage structured data, built from the SAME array the list renders
          below. Google requires the schema to match the visible answers exactly;
          reading both from FAQ_ITEMS is what guarantees that (see lib/content.ts).
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_ITEMS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
          FAQ
        </h2>
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
          {FAQ_ITEMS.map((f) => (
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
      </div>
      </main>
    </>
  );
}

/**
 * Placeholder rows shown while a search is in flight.
 *
 * The geometry mirrors a real result row — same widths, same three-then-price rhythm,
 * same 26px pill on the right — so the layout does not shift when the real rows
 * replace it. A generic grey block would still cause the jump it exists to prevent.
 *
 * `aria-hidden`: the wait is announced once, properly, by the live region. A screen
 * reader reading out six empty placeholder boxes is noise, not information.
 */
function ResultSkeleton({ legs }: { legs: number }) {
  return (
    <div aria-hidden className="mt-4 grid gap-4">
      {Array.from({ length: legs }).map((_, legIndex) => (
        <div
          key={legIndex}
          className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          {legs > 1 && <div className="skeleton mb-3 h-3 w-40 rounded bg-muted" />}
          <div className="divide-y divide-line">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 px-3 py-3">
                <div className="skeleton h-3 w-16 rounded bg-muted" />
                <div className="skeleton h-3 w-36 rounded bg-muted" />
                <div className="skeleton h-3 w-12 rounded bg-muted" />
                <div className="skeleton h-3 w-14 rounded bg-muted" />
                <div className="skeleton ml-auto h-3 w-10 rounded bg-muted" />
                <div className="skeleton h-[26px] w-[86px] shrink-0 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
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

/*
 * Marks for the "How it works" band. 18px, `currentColor`, stroke-only so they inherit
 * the tile's text colour and stay legible in either theme zone without a second copy.
 */
function RouteMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <path d="M6.8 16.4C9 13 12 9.5 17 6.9" strokeDasharray="2.6 2.4" />
    </svg>
  );
}

function ListMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h11M4 12h11M4 17h7" />
      <path d="M17.5 16.2l1.7 1.7 3-3.4" />
    </svg>
  );
}

function PageMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
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
