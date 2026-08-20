"use client";

import { useEffect, useMemo, useState } from "react";
import { SegmentRow } from "@/components/SegmentRow";
import { AIRPORTS } from "@/lib/airports";
import {
  emptySegment,
  generatePnr,
  newItinerary,
  type Segment,
  warningsFor,
} from "@/lib/itinerary";

export default function Page() {
  const [itinerary, setItinerary] = useState(newItinerary);

  // The PNR is random, so it must be generated on the client only — generating
  // it during render makes the server and client HTML disagree. Generated once
  // and then left alone, so re-rendering never changes it.
  useEffect(() => {
    setItinerary((it) => (it.pnr ? it : { ...it, pnr: generatePnr() }));
  }, []);

  const warnings = useMemo(() => warningsFor(itinerary.segments), [itinerary.segments]);

  function patchSegment(id: string, patch: Partial<Segment>) {
    setItinerary((it) => ({
      ...it,
      segments: it.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function addSegment() {
    setItinerary((it) => {
      const last = it.segments[it.segments.length - 1];
      const next = emptySegment();
      // Chain the next leg from where the previous one landed — the common case
      // is a return or onward flight, and it removes a warning before it fires.
      if (last?.destinationIata) next.originIata = last.destinationIata;
      return { ...it, segments: [...it.segments, next] };
    });
  }

  function removeSegment(id: string) {
    setItinerary((it) => ({ ...it, segments: it.segments.filter((s) => s.id !== id) }));
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Visa Itinerary</h1>
        <span className="font-mono text-xs text-neutral-500">PNR {itinerary.pnr || "—"}</span>
      </header>
      <p className="mt-1 text-sm text-neutral-600">
        Build step 3 — flight rows with calculated duration.{" "}
        {AIRPORTS.length.toLocaleString()} airports bundled, no network calls.
      </p>

      <div className="mt-6 space-y-4">
        {itinerary.segments.map((s, i) => (
          <SegmentRow
            key={s.id}
            index={i}
            segment={s}
            onChange={(patch) => patchSegment(s.id, patch)}
            onRemove={itinerary.segments.length > 1 ? () => removeSegment(s.id) : null}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addSegment}
        className="mt-4 rounded-md border border-dashed border-neutral-400 px-3.5 py-2 text-sm
                   text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
      >
        + Add flight
      </button>

      {warnings.length > 0 && (
        <section
          aria-label="Warnings"
          className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Check these — they do not block generating the document
          </h2>
          <ul className="mt-1.5 space-y-0.5 text-sm text-amber-900">
            {warnings.map((w, i) => {
              const idx = itinerary.segments.findIndex((s) => s.id === w.segmentId);
              return (
                <li key={`${w.segmentId}-${i}`}>
                  {idx >= 0 && <span className="font-medium">Flight {idx + 1}: </span>}
                  {w.text}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
