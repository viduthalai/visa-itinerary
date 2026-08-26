"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fieldClass } from "@/components/ui";

/**
 * Client-side filter for the /passport index.
 *
 * The full country list is passed in as a prop from the server page, so it is
 * server-rendered into the initial HTML in full — a crawler still sees all 199
 * links, and the page stays statically generated. The filtering is a pure
 * client-side narrowing of an already-present list; it adds interactivity without
 * costing indexability or a data fetch.
 */
type Country = { iso2: string; name: string };

/** ISO-2 -> flag emoji via regional-indicator symbols. Matches the detail page. */
function flagEmoji(iso2: string): string {
  const cc = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function PassportFilter({ countries }: { countries: Country[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  // Match on country name OR ISO code, so "gb" and "united" both find the UK.
  const filtered = useMemo(
    () =>
      query
        ? countries.filter(
            (c) => c.name.toLowerCase().includes(query) || c.iso2.toLowerCase().includes(query),
          )
        : countries,
    [countries, query],
  );

  return (
    <div className="mt-8">
      <div className="max-w-sm">
        <label htmlFor="passport-search" className="sr-only">
          Search passports
        </label>
        <input
          id="passport-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a country or code…"
          autoComplete="off"
          className={fieldClass}
        />
      </div>

      {/* aria-live so a screen reader hears the result count change as they type. */}
      <p aria-live="polite" className="mt-2 text-xs text-ink-mute">
        {filtered.length} {filtered.length === 1 ? "passport" : "passports"}
        {query && ` matching “${q.trim()}”`}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 border-l-2 border-l-line bg-muted px-4 py-3 text-sm text-ink-mute">
          No passport matches “{q.trim()}”.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line pt-6 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((c) => (
            <li key={c.iso2}>
              <Link
                href={`/passport/${c.iso2.toLowerCase()}`}
                className="flex min-h-9 items-center gap-2 truncate text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                <span aria-hidden>{flagEmoji(c.iso2)}</span>
                <span className="truncate">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
