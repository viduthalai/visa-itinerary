"use client";

import { progressPct } from "@/lib/progress";

export type StepDef = { n: number; title: string };

/**
 * Wizard stepper.
 *
 * Two decisions carried over from the previous version, both still right:
 *
 * 1. A completed step is a BUTTON, a future step is not. Rendering an unreachable
 *    step as a disabled button would announce it to a screen reader as an action
 *    the user cannot take; as plain text it is simply information. Reachability is
 *    driven by data (`reachable`), never by how far the user happened to click.
 *
 * 2. The fill is a separate absolutely-positioned bar rather than per-segment
 *    borders, so the progress reads as one continuous line at any step count.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED, and why
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * THREE MECHANISMS SAYING ONE THING. This component previously stated the same
 * fact three separate ways: numbered circular dots, a filled progress track, and a
 * "Step 3 of 5" caption underneath. Swiss Modernism carries hierarchy with weight
 * and position, not with redundant ornament, so the count is now stated once
 * visually (the numerals, with the active one at full ink and full weight) plus
 * once for assistive tech (the bar's `aria-label`). The caption is gone; the
 * numerals answer "where am I" and the columns answer "how many".
 *
 * NO DOTS. The 24px filled circles were the decorative-status-dot pattern: a
 * coloured disc whose only job was to hold a numeral that could simply be set in
 * type. Removing them also removes the `✓` glyph, which was a bare text character
 * standing in for an icon in an app that otherwise uses one icon family.
 *
 * SQUARE RULE, NOT A PILL. The track was `h-1.5 rounded-full` with a pill fill,
 * which is dashboard ornament. It is now a 2px square rule: same continuous line,
 * same `progressPct` (which has its own test pinning the "progress must show on
 * step 1" fix, so it stays the source of the width), no rounded ends.
 *
 * `progressPct` is deliberately still the input rather than a per-step boolean.
 * Driving the rule from a percentage keeps one number describing progress, and
 * keeps lib/progress.test.ts pinning something the app actually renders.
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
      {/*
        The rule sits ABOVE the labels now. It reads as the spine the steps hang
        from, which is the Swiss convention, and it means the active numeral is
        adjacent to its own filled segment instead of separated from it by a row
        of titles.
      */}
      <div className="relative h-0.5 bg-line">
        <div
          className="absolute inset-y-0 left-0 bg-ink transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${current} of ${steps.length}`}
        />
      </div>

      <ol className="mt-2 flex items-start">
        {steps.map((s) => {
          const active = s.n === current;
          const done = s.n < current;
          const canGo = s.n <= reachable && !active;

          /*
           * Three tiers, carried entirely by weight and ink:
           *   active   full ink, semibold
           *   done or reachable   ink-soft
           *   future   ink-mute
           * A future step stays full-strength ink-mute rather than a faded
           * variant. It is still INFORMATION, and the previous build's
           * `ink-mute/50` measured 1.11:1, which is not de-emphasis, it is gone.
           */
          const tone = active
            ? "text-ink font-semibold"
            : done || s.n <= reachable
              ? "text-ink-soft"
              : "text-ink-mute";

          const content = (
            <>
              <span className="font-mono text-xs tabular-nums">{s.n}</span>
              <span className="mt-1 block text-xs leading-tight">{s.title}</span>
            </>
          );

          return (
            <li key={s.n} className="min-w-0 flex-1 pr-4">
              {canGo ? (
                <button
                  type="button"
                  onClick={() => onJump(s.n)}
                  className={`w-full cursor-pointer text-left transition-colors duration-200
                              hover:text-ink ${tone}`}
                >
                  {content}
                </button>
              ) : (
                <div className={tone} aria-current={active ? "step" : undefined}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
