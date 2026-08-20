"use client";

import { useState } from "react";
import { AirportPicker } from "@/components/AirportPicker";
import { AIRPORTS, getAirport } from "@/lib/airports";

export default function Page() {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const origin = getAirport(from);
  const destination = getAirport(to);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-xl font-semibold">Visa Itinerary</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Build step 2 — airport picker over {AIRPORTS.length.toLocaleString()} bundled
        airports. No network calls.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <AirportPicker label="From" value={from} onChange={setFrom} placeholder="JFK" />
        <AirportPicker label="To" value={to} onChange={setTo} placeholder="MUC" />
      </div>

      {(origin || destination) && (
        <dl className="mt-6 rounded-md border border-neutral-200 bg-white p-4 text-sm">
          {[
            ["Origin", origin],
            ["Destination", destination],
          ].map(([labelText, a]) => {
            const label = labelText as string;
            const airport = a as ReturnType<typeof getAirport>;
            if (!airport) return null;
            return (
              <div key={label} className="flex gap-2 py-0.5">
                <dt className="w-24 text-neutral-500">{label}</dt>
                <dd className="font-mono text-xs">
                  {airport.iata} · {airport.tz} · {airport.country}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </main>
  );
}
