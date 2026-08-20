/**
 * Wizard fill percentage.
 *
 * Uses `current / total`, NOT `(current - 1) / (total - 1)`.
 *
 * The zero-based form is the intuitive one — "you have completed 0 of the 4 gaps
 * between 5 steps" — and it is wrong as an interface. It renders an empty bar on
 * step 1, which reads as "nothing has happened" at exactly the moment the user
 * has arrived and started work. Being on a step is itself progress.
 *
 * So step 1 of 5 is 20% and step 5 of 5 is 100%: the bar is never empty and only
 * fills completely on the final step.
 */
export function progressPct(current: number, total: number): number {
  if (total <= 0) return 0;
  const clamped = Math.min(Math.max(current, 1), total);
  return (clamped / total) * 100;
}
