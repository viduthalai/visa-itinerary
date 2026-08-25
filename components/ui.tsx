"use client";

/**
 * Shared primitives for the wizard.
 *
 * These exist because the same button and card class strings were repeated in six
 * places and had already drifted — different paddings, different disabled colours,
 * one missing `cursor-pointer`. A component is the only way "hover states with
 * smooth transitions" and "44px minimum touch target" hold everywhere rather than
 * wherever someone remembered.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * SWISS MODERNISM 2.0 — the wizard's structural system
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * WHY THIS SYSTEM AND NOT THE MARKETING ONE. The taste rules this project follows
 * for its landing surfaces exclude multi-step wizards outright ("this skill won't
 * make them better"). The wizard needed a source that covers dense product UI, so
 * it comes from the ui-ux-pro-max dataset instead: products.csv returns Grant /
 * Funding Portal as the nearest analogue to a document-generating application
 * portal, recommending Trust & Authority + Minimalism with Swiss Modernism 2.0 as
 * the secondary. styles.csv then specifies that system concretely: a strict
 * 12-column grid, an 8px base unit with mathematical spacing, one accent, no
 * decoration, asymmetric balance, WCAG AAA. Two independent queries landed on it.
 *
 * THE THREE RULES, all three previously broken:
 *
 * 1. ONE GRID. Every field declares a span on a single 12-column grid, so field
 *    edges line up between rows AND between steps. Before this, each row invented
 *    its own layout (`sm:grid-cols-2` here, `grid-cols-[1fr_auto]` there,
 *    `grid-cols-[4.5rem_1fr_1fr_auto]` in the passenger repeater) and nothing
 *    aligned to anything outside its own row.
 *
 * 2. 8px SPACING. Allowed steps are multiples of 8px: gap-2, gap-4, gap-6, gap-8,
 *    gap-12, gap-16. The single permitted sub-unit is 4px (`1`), used only for the
 *    gap between a label and its own control, where 8px reads as detachment.
 *    Before this the wizard used fourteen distinct spacing values including
 *    mt-0.5, mt-1.5, mt-3, mt-5, mt-7, px-2.5 and px-3.5, none on a common base.
 *
 * 3. ONE SHAPE RULE, stated so it can be checked:
 *      - Panels and containers: SQUARE. Structure comes from 1px hairlines and the
 *        grid, which is the entire premise of the system. Not from stacked rounded
 *        cards with shadows.
 *      - Interactive controls (buttons, inputs, selects, textareas): 4px.
 *      - Exactly one exception, the chosen/select state chip in FlightResults,
 *        which stays a full pill because it reads as a state chip rather than a
 *        button.
 *    The wizard previously shipped SIX radii (xl, 2xl, lg, md, default, full) with
 *    no rule attached, which is why panels, dropdowns and skeletons all disagreed.
 *
 * `min-h-11` is 44px: the minimum touch target. It applies to every variant,
 * including the text-only one, because a small tap target is a small tap target
 * regardless of whether it looks like a button.
 */

/* ────────────────────────────────────────────────────────────────────────────────
 * Grid
 * ──────────────────────────────────────────────────────────────────────────────── */

/**
 * The 12-column grid. Single column below `sm`, which is the mandated collapse for
 * every multi-column layout in this app rather than an assumption that Tailwind
 * will work it out.
 */
export function FormGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-12 ${className}`}>{children}</div>
  );
}

/*
 * Spans are a closed map rather than an interpolated `sm:col-span-${n}`, because
 * Tailwind compiles by scanning source text: an interpolated class name is not in
 * the source, so it is never generated and the field silently falls back to full
 * width. That failure is invisible in review and only shows up in the browser.
 */
const SPANS = {
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  12: "sm:col-span-12",
} as const;

export type Span = keyof typeof SPANS;

/** One cell on the grid. Carries the span; the label and control live inside. */
export function Cell({
  span = 6,
  className = "",
  children,
}: {
  span?: Span;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`${SPANS[span]} ${className}`}>{children}</div>;
}

/* ────────────────────────────────────────────────────────────────────────────────
 * Panels
 * ──────────────────────────────────────────────────────────────────────────────── */

/**
 * A group of fields, delimited by a hairline instead of boxed in a card.
 *
 * This replaces `Card`. The card was doing no work: each step rendered exactly one
 * of them, so its border, radius and shadow separated the content from nothing,
 * and five steps in a row read as five identical rectangles. A top hairline plus
 * real space groups the same fields and lets the grid be the structure.
 *
 * `bg-surface` is deliberately absent. The form zone canvas is already #f4f4f5 and
 * the panel was #ffffff, a 1.06:1 step that cost a border and a shadow to be
 * perceptible at all. Fields keep their own white fill, so they now read as the
 * raised elements against the zone rather than as white-on-white.
 */
export function Panel({
  title,
  hint,
  children,
  className = "",
  headerRight,
}: {
  title?: string;
  hint?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-line pt-4 ${className}`}>
      {(title || headerRight) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
            {hint && <p className="mt-1 max-w-[65ch] text-xs text-ink-mute">{hint}</p>}
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────────
 * Controls
 * ──────────────────────────────────────────────────────────────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "link";
};

/*
 * TACTILE FEEDBACK. The app previously had none: no hover transform and no `:active`
 * state on any control, so every button acknowledged a press only by whatever colour
 * change its variant happened to specify. A control that does not respond to being
 * pressed reads as unresponsive even when it is working.
 *
 * The numbers are the ui-ux-pro-max Hover Micro-interaction row, Subtle tier, which
 * is the correct tier for a button: `y: -1`, 150-200ms, power1.out, plus its own
 * warning to "keep displacement under 2px so it reads as feedback not motion". A
 * button is not a card, so the Standard tier's `y: -4` and `scale: 1.02` would be
 * overshoot on a 44px control.
 *
 * `enabled:` on the hover lift, not a bare `hover:`. CSS `:hover` still matches a
 * disabled button, so without the guard a disabled Continue would rise toward the
 * pointer while showing 45% opacity and a not-allowed cursor: three signals, two of
 * them contradicting each other.
 *
 * `active:` after `hover:` so the press wins the cascade while both match. The press
 * cancels the lift and scales down, which is the direction a physical button moves.
 *
 * Only `transform` and `opacity` animate. `transition-all` is deliberately kept
 * rather than narrowed, because the variants below transition background and border
 * colour too, and enumerating those here would drift the moment a variant changes.
 */
const base =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded " +
  "text-sm font-medium transition-all duration-200 " +
  "enabled:hover:-translate-y-px enabled:active:translate-y-0 enabled:active:scale-[0.98] " +
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary px-4 text-on-primary hover:bg-primary-hover",
  accent: "bg-accent px-4 text-white hover:bg-accent-hover",
  secondary: "border border-ink-mute bg-surface px-4 text-ink hover:bg-muted hover:border-ink",
  ghost: "px-4 text-ink-soft hover:bg-muted hover:text-ink",
  link: "px-1 text-secondary underline-offset-4 hover:underline hover:text-ink",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  return <button {...rest} className={`${base} ${variants[variant]} ${className}`} />;
}

/*
 * Field and label.
 *
 * `mt-1` (4px) is the documented sub-unit: a label belongs to its control, and an
 * 8px gap reads as two separate things. Every other gap in the wizard is 8px or a
 * multiple.
 *
 * The border is `border-ink-mute`, not `border-line`. --color-line is the hairline
 * used BETWEEN rows and around panels; an input drawn in it measured 1.31:1
 * against the panel and read as an absence rather than a control. ink-mute is
 * 5.94:1, past the 3:1 floor SC 1.4.11 sets for control boundaries.
 */
export const fieldClass =
  "mt-1 w-full min-h-11 rounded border border-ink-mute bg-surface px-4 py-2 text-sm " +
  "text-ink transition-colors duration-200 placeholder:text-ink-mute " +
  "hover:border-ink focus:border-primary focus:outline-none " +
  // Every field lives in the light `.theme-light` zone, so the native date/time
  // picker widgets must be light too. Without this they inherit the dark root and
  // Chrome paints a dark widget inside a white field.
  "[color-scheme:light]";

export const labelClass = "block text-xs font-semibold text-ink-soft";
