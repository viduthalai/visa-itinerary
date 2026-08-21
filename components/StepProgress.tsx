"use client";

import { progressPct } from "@/lib/progress";

export type StepDef = { n: number; title: string };

/**
 * Wizard progress bar.
 *
 * Two decisions worth knowing:
 *
 * 1. A completed step is a BUTTON, a future step is not. Rendering an unreachable
 *    step as a disabled button would announce it to a screen reader as an action
 *    the user cannot take; as plain text it is simply information. Reachability is
 *    driven by data (`reachable`), never by how far the user happened to click.
 *
 * 2. The fill is a separate absolutely-positioned bar rather than per-segment
 *    borders, so the progress reads as one continuous line at any step count.
 */
export function StepProgress({
  steps,
  current,
  reachable,
  onJump,
}: {
  steps: StepDef[];
  current: number;
  /** Highest step the current data allows. Steps above this are inert. */
  reachable: number;
  onJump: (n: number) => void;
}) {
  const pct = progressPct(current, steps.length);

  return (
    <nav aria-label="Progress" className="select-none">
      <ol className="flex items-start justify-between gap-1">
        {steps.map((s) => {
          const done = s.n < current;
          const active = s.n === current;
          const canGo = s.n <= reachable && !active;

          const dot = (
            <span
              aria-hidden
              className={[
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                "transition-all duration-200",
                active
                  ? "bg-primary text-on-primary ring-4 ring-primary/15"
                  : done
                    ? "bg-primary text-on-primary"
                    : s.n <= reachable
                      ? "border border-ink-mute bg-surface text-ink-soft"
                      : "border border-line bg-surface text-ink-mute",
              ].join(" ")}
            >
              {done ? "✓" : s.n}
            </span>
          );

          const label = (
            <span
              className={[
                "mt-1.5 block text-center text-xs leading-tight",
                // A future step is quieter than a reachable one, but it is still
                // INFORMATION — a stepper exists to say what is coming. Opacity was
                // the wrong tool for that: `ink-mute/50` measured 1.11:1, which is
                // not "de-emphasised", it is gone. Full-strength ink-mute is 4.71:1
                // on the surface and still visibly the quietest of the three tiers.
                active
                  ? "font-semibold text-ink"
                  : s.n <= reachable
                    ? "text-ink-soft"
                    : "text-ink-mute",
              ].join(" ")}
            >
              {s.title}
            </span>
          );

          return (
            <li key={s.n} className="flex-1">
              {canGo ? (
                <button
                  type="button"
                  onClick={() => onJump(s.n)}
                  className="flex w-full cursor-pointer flex-col items-center rounded-lg py-1
                             transition-colors duration-200 hover:bg-muted"
                >
                  {dot}
                  {label}
                </button>
              ) : (
                <div
                  className="flex w-full flex-col items-center"
                  aria-current={active ? "step" : undefined}
                >
                  {dot}
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="relative mt-3 h-1.5 rounded-full bg-line">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${current} of ${steps.length}`}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-ink-mute">
        Step {current} of {steps.length}
      </p>
    </nav>
  );
}
