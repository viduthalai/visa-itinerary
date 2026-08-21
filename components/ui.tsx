"use client";

/**
 * Shared primitives.
 *
 * These exist because the same button and card class strings were repeated in six
 * places and had already drifted — different paddings, different disabled colours,
 * one missing `cursor-pointer`. A component is the only way "hover states with
 * smooth transitions" and "44px minimum touch target" hold everywhere rather than
 * wherever someone remembered.
 *
 * `min-h-11` is 44px: the checklist's minimum touch target. It applies to every
 * variant, including the text-only one, because a small tap target is a small tap
 * target regardless of whether it looks like a button.
 */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "link";
};

const base =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg " +
  "text-sm font-medium transition-all duration-200 " +
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary px-4 text-on-primary shadow-[var(--shadow-card)] " +
    "hover:bg-primary-hover hover:shadow-[var(--shadow-lift)]",
  accent:
    "bg-accent px-4 text-white shadow-[var(--shadow-card)] " +
    "hover:bg-accent-hover hover:shadow-[var(--shadow-lift)]",
  secondary: "border border-line bg-elevated px-4 text-ink hover:bg-muted hover:border-ink-mute",
  ghost: "px-3 text-ink-soft hover:bg-muted hover:text-ink",
  link: "px-1 text-secondary underline-offset-4 hover:underline hover:text-ink",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  return <button {...rest} className={`${base} ${variants[variant]} ${className}`} />;
}

/** Surface container — one shadow and radius for every panel in the app. */
export function Card({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Field label + input wrapper, so every input in the app has a visible label. */
export const fieldClass =
  "mt-1.5 w-full min-h-11 rounded-lg border border-line bg-elevated px-3 py-2 text-sm " +
  "text-ink transition-colors duration-200 placeholder:text-ink-mute " +
  "hover:border-ink-mute focus:border-primary focus:outline-none " +
  // Every field lives in the light `.theme-light` zone, so the native date/time
  // picker widgets must be light too. Without this they inherit the dark root and
  // Chrome paints a dark widget inside a white field.
  "[color-scheme:light]";

export const labelClass = "block text-xs font-semibold text-ink-soft";
