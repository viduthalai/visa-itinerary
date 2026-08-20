"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type Airport, formatAirport, getAirport, searchAirports } from "@/lib/airports";

type Props = {
  label: string;
  value: string | null;
  onChange: (iata: string | null) => void;
  placeholder?: string;
};

/**
 * Airport combobox over the bundled dataset. No network call — the whole list is
 * in memory, so filtering is synchronous and works offline.
 *
 * Keyboard: ArrowUp/Down to move, Enter to select, Escape to close.
 */
export function AirportPicker({ label, value, onChange, placeholder = "JFK" }: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = getAirport(value);
  const results = useMemo(() => searchAirports(query), [query]);

  // Reset the highlighted row whenever the result set changes, so Enter never
  // selects a stale index from the previous query.
  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function commit(a: Airport) {
    onChange(a.iata);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(results[active]);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-xs font-medium text-ink-soft">
        {label}
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="mt-1.5 min-h-11 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm
                     transition-colors duration-200 hover:border-ink-mute
                     focus:border-primary focus:outline-none"
          placeholder={placeholder}
          value={open ? query : selected ? formatAirport(selected) : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </label>

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border
                     border-line bg-elevated py-1 shadow-[var(--shadow-lift)]"
        >
          {results.map((a, i) => (
            <li key={a.iata} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => commit(a)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left text-sm ${
                  i === active ? "bg-muted" : ""
                }`}
              >
                <span className="w-9 font-mono text-xs font-semibold">{a.iata}</span>
                <span className="truncate">{a.name}</span>
                <span className="ml-auto shrink-0 text-xs text-ink-mute">
                  {a.city ?? a.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-line bg-elevated
                        px-2.5 py-2 text-sm text-ink-mute shadow-[var(--shadow-lift)]">
          No airport matches “{query}”
        </div>
      )}
    </div>
  );
}
