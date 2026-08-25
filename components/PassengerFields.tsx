"use client";

import { Plus } from "@phosphor-icons/react";
import { Cell, FormGrid, Panel, fieldClass, labelClass } from "@/components/ui";

import { formatPassenger, type Passenger } from "@/lib/itinerary";

type Props = {
  passengers: Passenger[];
  onChange: (id: string, patch: Partial<Passenger>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

// Field styling and the grid are shared — see components/ui.tsx. Local copies had
// already drifted apart (different padding, one missing a hover state).

/** Common titles. Free text is still allowed — this is a convenience, not a gate. */
const TITLES = ["", "MR", "MRS", "MS", "MISS", "DR"];

/**
 * Given names and surname are separate fields on purpose. A single "full name"
 * box cannot be rendered surname-last reliably, and it makes matching a passport
 * impossible to check. keyflight uses one box; that is a shortcut that costs
 * correctness.
 *
 * GRID. Each passenger row is 2 + 4 + 4 + 2 on the shared 12 columns, replacing
 * `grid-cols-[4.5rem_1fr_1fr_auto]`. That old track list was the worst offender in
 * the wizard: a 72px title column and an `auto` remove column meant the two name
 * fields were sized by whatever was left, so they lined up with no other field on
 * the page and shifted width when the Remove button appeared at two passengers.
 *
 * Rows are separated by hairlines rather than by whitespace alone. With three or
 * more passengers the previous 12px gap left it ambiguous which preview line
 * belonged to which set of names.
 */
export function PassengerFields({ passengers, onChange, onAdd, onRemove }: Props) {
  return (
    <Panel title="Passengers" hint="Enter names exactly as they appear in the passport.">
      <ul className="divide-y divide-line">
        {passengers.map((p, i) => (
          <li key={p.id} className="py-4 first:pt-0">
            <FormGrid>
              <Cell span={2}>
                <label className={labelClass}>
                  Title
                  <select
                    className={fieldClass}
                    value={p.title}
                    onChange={(e) => onChange(p.id, { title: e.target.value })}
                  >
                    {TITLES.map((t) => (
                      <option key={t || "none"} value={t}>
                        {t || "-"}
                      </option>
                    ))}
                  </select>
                </label>
              </Cell>

              <Cell span={4}>
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
              </Cell>

              <Cell span={4}>
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
              </Cell>

              {/*
                The Remove column is always present, and empty rather than absent for
                a single passenger. Removing the cell entirely would reflow the three
                name fields the moment a second passenger is added, which is exactly
                the jump the grid exists to prevent.
              */}
              <Cell span={2} className="flex flex-col justify-end">
                {passengers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label={`Remove passenger ${i + 1}`}
                    className="mt-1 min-h-11 rounded px-4 text-xs text-ink-mute transition-colors
                               duration-200 hover:bg-muted hover:text-destructive"
                  >
                    Remove
                  </button>
                ) : (
                  <span aria-hidden className="mt-1 block min-h-11" />
                )}
              </Cell>

              {/*
                The document rendering of this passenger, echoed back. It is derived
                output, so it is filled and mono rather than bordered like a field.
              */}
              <Cell span={12}>
                <p className="bg-muted px-4 py-2 font-mono text-xs text-ink-mute">
                  {formatPassenger(p) || " "}
                </p>
              </Cell>
            </FormGrid>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        /* border-ink-mute rather than border-line for the resting state: this is an
           affordance, and --color-line (#d9d9de here) is the hairline used BETWEEN
           rows, so a dashed button drawn in it reads as a divider rather than a
           control. Measured in-browser: #63636d on #ffffff is 5.94:1, comfortably
           past the 3:1 control floor. It replaces raw `neutral-400` /
           `neutral-900`, which @theme could not reach. */
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border
                   border-dashed border-ink-mute px-4 text-xs text-ink-soft transition-colors
                   duration-200 hover:border-ink hover:text-ink"
      >
        <Plus aria-hidden size={14} weight="regular" />
        Add passenger
      </button>
    </Panel>
  );
}
