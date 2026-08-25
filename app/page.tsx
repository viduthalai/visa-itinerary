"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CaretDown,
  DownloadSimple,
  FileText,
  ListChecks,
  Path,
} from "@phosphor-icons/react";
import { FlightDetails, RouteFields } from "@/components/FlightDetails";
import { FlightResults } from "@/components/FlightResults";
import { FareFields } from "@/components/FareFields";
import { ItineraryDocument } from "@/components/ItineraryDocument";
import { PassengerFields } from "@/components/PassengerFields";
import { StepProgress, type StepDef } from "@/components/StepProgress";
import { HeroBand } from "@/components/HeroBand";
import { Reveal } from "@/components/Reveal";
import { Button, Panel } from "@/components/ui";
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
      {/*
        `scroll-mt-20` matches #how-it-works and #faq, which both already carry it.
        Without it this anchor had scroll-margin-top: 0 against a 65px sticky header,
        so both controls that target it — the hero's "Get my itinerary" CTA and the
        skip link, which is the FIRST tab stop on the page — parked the stepper
        underneath the header and hid step 1 behind the wordmark.

        Worth recording how this was found: every measurement passed. The grid
        resolved to exact 12-column tracks, one radius, spacing all on the 8px scale.
        The overlap only appeared in a screenshot, because the fault was not in any
        element's own geometry but in where the viewport came to rest relative to it.
      */}
      <main id="main" className="scroll-mt-20">
      {/* ── Light zone: the work surface ───────────────────────────────────── */}
      <div className="theme-light">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <StepProgress steps={STEPS} current={step} reachable={reachable} onJump={setStep} />

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
        {/* The step title is the page's second-level heading and sits ABOVE the
            panel hairline, so the rule reads as underlining the title rather than
            as a stray divider. */}
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink">
          {STEPS[step - 1].title}
        </h2>

        {step === 1 && (
          <Panel>
            <RouteFields
              segment={segment}
              onChange={patchRoute}
              returnDate={returnDate}
              onReturnDateChange={setReturnDate}
            />
            <div className="mt-6 flex flex-wrap items-center gap-4">
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
                Skip search, enter flights manually
              </Button>
            </div>
            {!canSearch && (
              <p className="mt-4 text-xs text-ink-mute">
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
                  /* Square, and a solid left rule instead of a 25%-alpha box: the
                     same "marked from the margin" language the chosen result row and
                     the stepper use, so severity reads without a second shape. */
                  className="mt-4 border-l-2 border-l-destructive bg-muted px-4 py-2 text-xs text-destructive"
                >
                  {legLabel(itinerary.segments, i)}: {st.message}
                </p>
              ) : null,
            )}
          </Panel>
        )}

        {step === 2 && (
          <div className="grid gap-8">
            {itinerary.segments.map((leg, i) => {
              const st = searches[i];
              const legOrigin = getAirport(leg.originIata);
              if (!st || st.status !== "done" || !legOrigin) {
                return (
                  <p key={leg.id} className="text-sm text-ink-mute">
                    {legLabel(itinerary.segments, i)}: no results.{" "}
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
          <div className="grid gap-8">
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
          <div className="grid gap-8">
            <FareFields fare={itinerary.fare} onChange={patchFare} />
            {/*
              `headerRight` puts the primary action on the panel's own header row.
              It was previously a hand-built `flex justify-between` inside the card,
              which is the pattern Panel exists to own so every step's header has the
              same geometry.
            */}
            <Panel
              title="Live preview"
              hint="What you download is this exact page. There is no second template."
              headerRight={
                <Button type="button" variant="accent" onClick={() => window.print()}>
                  <DownloadIcon />
                  Save as PDF
                </Button>
              }
            >
              {/*
                No radius on the document wrapper. This is an A4 page: paper does not
                have rounded corners, and `rounded-lg` here was clipping the real
                document's own square edge. The paper shadow stays, since that is the
                one place in the app where elevation carries real meaning — it lifts
                the deliverable off the work surface.
              */}
              <div className="shadow-[var(--shadow-paper)]">
                <ItineraryDocument itinerary={itinerary} />
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/*
        Step navigation. Back is ABSENT on step 1 rather than disabled — a disabled
        control still occupies attention and invites a click that does nothing.
        The empty span keeps Continue right-aligned without it.
      */}
      <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
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
          /* Square, like every other panel in the wizard. Stage 1 recoloured this box
             through the token system but left its `rounded-xl`, so once the rest of
             the wizard went square it became the only 12px corner on the work
             surface. Left rule in the notice ink for the same margin-marking language
             the stepper, the chosen result row and the search error all use. */
          className="mt-8 border-l-2 border-l-notice-line bg-notice-surface p-4"
        >
          {/* Tokens, not raw `amber-*` utilities. Raw Tailwind palette classes are
              invisible to @theme, so the monochrome repaint swept the whole app and
              left this panel painting the previous warm-paper build. --color-notice-*
              resolves per zone and measures 8.36:1 here. */}
          <h2 className="text-xs font-bold uppercase tracking-wider text-notice-ink">
            Worth checking. None of these block your document
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-notice-ink">
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
        {/*
          BENTO, not three equal cards.
          ────────────────────────────────────────────────────────────────────────
          This was `sm:grid-cols-3` with three visually identical cards, which is a
          banned shape: the generic three-across feature row. It is now 3 items in 3
          cells (the cell count must equal the content count, no blank tiles), laid
          out as one tall lead cell beside two stacked ones: 7 + 5 columns, the lead
          spanning both rows.

          The asymmetry carries meaning rather than just breaking symmetry. Step one
          is where every visitor actually starts, and it is the only step reachable
          without data, so it gets the large cell and the bigger glyph. Steps two and
          three are consequences of it.

          FILL DIVERSITY. The lead cell is filled and carries the grid texture; the
          two stacked cells sit on the bare canvas. A multi-cell grid where every
          cell is the same flat text box is the thing the bento is supposed to
          replace, so the variation is the point, and it is a pattern plus a tint
          rather than a photograph. This app ships no raster imagery by an earlier
          deliberate decision.

          SQUARE, no shadow. Same shape rule as the wizard (containers square,
          controls 4px), which the previous `rounded-xl` cards broke across the zone
          boundary. Elevation here comes from the hairline and the fill, so the card
          shadow is gone: on a #0b0b0d canvas it was doing nothing visible anyway.
        */}
        <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:grid-rows-2">
          {[
            {
              t: "Enter your route",
              d: "Pick airports from 4,565 with IATA codes. Add a return date for a round trip, or leave it blank for one-way.",
              Icon: Path,
            },
            {
              t: "Choose your flights",
              d: "Search returns carriers and times. Arrival is computed in the destination's timezone, so the document never prints a time that airport would not show.",
              Icon: ListChecks,
            },
            {
              t: "Save the PDF",
              d: "Add passengers and any terminal, cabin or baggage detail, then print. The preview is the PDF, so there is no second template to drift.",
              Icon: FileText,
            },
          ].map((s2, i2) => {
            const lead = i2 === 0;
            return (
              /*
                Staggered per cell at the Standard tier's 0.08s, so with three cells
                the last one starts 160ms after the first. That still reads as one
                gesture rather than three events, which is what the stagger is for.
                (It was 0.04s at the Subtle tier, an 80ms spread.)

                HOVER LIFT, with the dataset's shadow deliberately dropped.

                The Standard Hover Micro-interaction row is `y: -4, scale: 1.02,
                boxShadow: 0 12px 24px rgba(0,0,0,0.12), 250ms, power2.out`. The
                translate and the duration are taken as specified. The shadow is not,
                because it was measured against this canvas: 12% black composited
                over #0b0b0d resolves to #0a0a0b, which is 1.006:1 against the
                canvas. A one-per-channel delta is not a shadow, it is nothing. That
                spec assumes a light ground.

                Brightening the border carries the affordance instead, and it is the
                app's own material: --color-line is 1.40:1 against the canvas and
                --color-ink-mute is 4.76:1, a 3.4x jump, which is unmissable.

                `scale: 1.02` is also dropped. These cells have a 1px border, and
                scaling the box renders that border at 1.02px through the whole
                tween, which reads as a soft edge rather than a lift.

                The translate goes through `hoverLift`, not a Tailwind class, because
                Motion's inline `transform` and Tailwind v4's `translate` are separate
                CSS properties that COMPOSE rather than override. A hover class here
                would stack on top of whatever Motion holds mid-reveal. The prop's own
                note in Reveal.tsx has the measurement.
              */
              <Reveal
                as="li"
                key={s2.t}
                index={i2}
                hoverLift
                className={`flex flex-col border border-line transition-colors
                            duration-200 ease-out hover:border-ink-mute ${
                  lead
                    ? "grid-texture justify-end bg-surface p-8 sm:col-span-7 sm:row-span-2"
                    : "justify-between p-6 sm:col-span-5"
                }`}
              >
                {/*
                  A mark, not the index. The <ol> already conveys order structurally,
                  so the digit carried no information a screen reader did not already
                  have, while a glyph of the actual action gives a sighted user
                  something to scan by.

                  NO TILE. The glyph used to sit in a `bg-primary/15 rounded-lg`
                  square tinted `text-secondary`. Three problems in one container: a
                  15%-alpha fill of a near-neutral is invisible on this canvas, the
                  link blue is not an icon colour, and `rounded-lg` was a third
                  radius in a two-radius system. Deleting the container fixed all
                  three, and the glyph reads better without a box around it.
                */}
                <s2.Icon
                  aria-hidden
                  size={lead ? 28 : 20}
                  weight={ICON_WEIGHT}
                  className="text-ink-soft"
                />
                <h3
                  className={`mt-4 font-semibold text-ink ${
                    lead ? "font-[family-name:var(--font-display)] text-xl" : "text-sm"
                  }`}
                >
                  {s2.t}
                </h3>
                <p
                  className={`mt-2 max-w-[65ch] leading-relaxed text-ink-soft ${
                    lead ? "text-base" : "text-sm"
                  }`}
                >
                  {s2.d}
                </p>
              </Reveal>
            );
          })}
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
        {/*
          A DIFFERENT LAYOUT FAMILY from the section above, deliberately. Two
          consecutive "headline then one block" sections is the templated rhythm the
          layout-repetition rule exists to stop, and the bento already used that
          shape. This is a split instead: heading in a narrow column, content in a
          wide one.

          This is the permitted case for a split header, not the banned one. The ban
          is on a big left headline paired with a small explainer paragraph floating
          on the right; here the wide column carries the interactive accordion, and
          the narrow column carries the heading and nothing else. No invented
          marketing sentence was added to fill it, which is what would have turned
          this back into the banned pattern.

          `sticky` is the functional reason the split earns its keep: the heading
          stays anchored beside the answers while they are read and opened, instead
          of scrolling away above them. top-24 clears the 65px sticky header.
        */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-ink sm:sticky sm:top-24">
              FAQ
            </h2>
          </div>

          {/* One reveal for the whole accordion, not per row: the rows are a single
              object here, and staggering four <details> made the panel look like it
              was assembling itself. */}
          <Reveal className="divide-y divide-line border-y border-line sm:col-span-8">
            {FAQ_ITEMS.map((f) => (
              <details key={f.q} className="group">
                {/*
                  Hover is a left rule, not a fill. `hover:bg-muted` was the same
                  invisible state the header nav had: in the dark shell --color-muted
                  is #1e1e23 against a #0b0b0d canvas, roughly 1.07:1, so the hover
                  was very nearly nothing. The rule also matches how every other
                  row-like thing in the app now marks itself, from the stepper to the
                  chosen flight to the warnings panel.
                */}
                <summary
                  className="flex cursor-pointer items-center justify-between gap-4 border-l-2
                             border-l-transparent py-4 pl-4 pr-4 text-sm font-medium text-ink
                             transition-colors duration-200 hover:border-l-ink"
                >
                  {f.q}
                  <span
                    aria-hidden
                    className="shrink-0 text-ink-mute transition-transform duration-200 group-open:rotate-180"
                  >
                    <ChevronIcon />
                  </span>
                </summary>
                <p className="max-w-[65ch] border-l-2 border-l-transparent pb-4 pl-4 pr-4 text-sm leading-relaxed text-ink-soft">
                  {f.a}
                </p>
              </details>
            ))}
          </Reveal>
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
    <div aria-hidden className="mt-8 grid gap-8">
      {Array.from({ length: legs }).map((_, legIndex) => (
        <div key={legIndex} className="border-t border-line pt-4">
          {legs > 1 && <div className="skeleton mb-4 h-3 w-40 bg-muted" />}
          {/*
            Every width below tracks a real cell in FlightResults: w-16 code,
            w-36 airline, w-12 time, w-16 offset, w-16 duration, w-16 transfers,
            then the price and the 86px chip. The gap, padding and hairlines match
            too. If a column changes there, it has to change here, which is the
            price of a skeleton that genuinely holds the layout.
          */}
          <div className="divide-y divide-line border-y border-line">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 border-l-2 border-l-transparent py-4 pl-4 pr-4">
                <div className="skeleton h-3 w-16 bg-muted" />
                <div className="skeleton h-3 w-36 bg-muted" />
                <div className="skeleton h-3 w-12 bg-muted" />
                <div className="skeleton h-3 w-16 bg-muted" />
                <div className="skeleton h-3 w-16 bg-muted" />
                <div className="skeleton h-3 w-16 bg-muted" />
                <div className="skeleton ml-auto h-3 w-10 bg-muted" />
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
  return `${i === 0 ? "Outbound" : "Return"}: ${route}`;
}

/*
 * Icons come from Phosphor, one family for the whole app, at a single weight.
 * These were hand-drawn SVG paths, which is the thing an icon library exists to
 * stop: five sets of stroke widths and cap styles maintained by hand, none of
 * them checked against each other. `currentColor` is Phosphor's default, so the
 * marks still inherit the tile's text colour in either theme zone.
 */
const ICON_WEIGHT = "regular" as const;

function DownloadIcon() {
  return <DownloadSimple aria-hidden size={15} weight={ICON_WEIGHT} />;
}

/*
 * RouteMark / ListMark / PageMark were here: three one-line wrappers that each
 * returned a single Phosphor glyph at a fixed 18px. They existed only to hold the
 * size, and the bento needs two sizes (28px for the lead cell, 20px for the other
 * two), so the size moved to the call site and the indirection went away. The
 * components are referenced directly from the step data now.
 */

function ChevronIcon() {
  return <CaretDown size={16} weight={ICON_WEIGHT} />;
}
