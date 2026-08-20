"use client";

import { formatPassenger, type Passenger } from "@/lib/itinerary";

type Props = {
  passengers: Passenger[];
  onChange: (id: string, patch: Partial<Passenger>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

const fieldClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm " +
  "focus:border-neutral-900 focus:outline-none";
const labelClass = "block text-xs font-medium text-neutral-600";

/** Common titles. Free text is still allowed — this is a convenience, not a gate. */
const TITLES = ["", "MR", "MRS", "MS", "MISS", "DR"];

/**
 * Given names and surname are separate fields on purpose. A single "full name"
 * box cannot be rendered surname-last reliably, and it makes matching a passport
 * impossible to check. keyflight uses one box; that is a shortcut that costs
 * correctness.
 */
export function PassengerFields({ passengers, onChange, onAdd, onRemove }: Props) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-medium">Passengers</h2>
      <p className="mt-0.5 text-xs text-neutral-500">
        Enter names exactly as they appear in the passport.
      </p>

      <ul className="mt-3 space-y-3">
        {passengers.map((p, i) => (
          <li key={p.id}>
            <div className="grid grid-cols-[4.5rem_1fr_1fr_auto] items-start gap-2">
              <label className={labelClass}>
                Title
                <select
                  className={fieldClass}
                  value={p.title}
                  onChange={(e) => onChange(p.id, { title: e.target.value })}
                >
                  {TITLES.map((t) => (
                    <option key={t || "none"} value={t}>
                      {t || "—"}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Given names
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="John"
                  value={p.givenNames}
                  onChange={(e) => onChange(p.id, { givenNames: e.target.value })}
                />
              </label>

              <label className={labelClass}>
                Surname
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="Smith"
                  value={p.surname}
                  onChange={(e) => onChange(p.id, { surname: e.target.value })}
                />
              </label>

              {passengers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove passenger ${i + 1}`}
                  className="mt-6 rounded-md px-2 py-1.5 text-xs text-neutral-500
                             hover:bg-neutral-100 hover:text-red-600"
                >
                  Remove
                </button>
              ) : (
                <span className="mt-6 block px-2 py-1.5 text-xs text-transparent select-none">
                  Remove
                </span>
              )}
            </div>

            <p className="mt-1 font-mono text-xs text-neutral-500">
              {formatPassenger(p) || "\u00a0"}
            </p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 rounded-md border border-dashed border-neutral-400 px-3.5 py-1.5 text-xs
                   text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
      >
        + Add passenger
      </button>
    </div>
  );
}
