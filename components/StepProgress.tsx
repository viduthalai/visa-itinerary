"use client";

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
  const pct = steps.length > 1 ? ((current - 1) / (steps.length - 1)) * 100 : 100;

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
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium",
                active
                  ? "bg-neutral-900 text-white ring-4 ring-neutral-900/10"
                  : done
                    ? "bg-neutral-900 text-white"
                    : s.n <= reachable
                      ? "border border-neutral-400 bg-white text-neutral-600"
                      : "border border-neutral-200 bg-white text-neutral-300",
              ].join(" ")}
            >
              {done ? "✓" : s.n}
            </span>
          );

          const label = (
            <span
              className={[
                "mt-1.5 block text-center text-[10px] leading-tight",
                active
                  ? "font-medium text-neutral-900"
                  : s.n <= reachable
                    ? "text-neutral-600"
                    : "text-neutral-300",
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
                  className="flex w-full flex-col items-center rounded focus:outline-none
                             focus-visible:ring-2 focus-visible:ring-neutral-900"
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

      <div className="relative mt-2 h-1 rounded-full bg-neutral-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-neutral-900 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-500">
        Step {current} of {steps.length}
      </p>
    </nav>
  );
}
