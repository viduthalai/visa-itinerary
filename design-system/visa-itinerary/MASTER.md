# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Visa Itinerary
**Category:** Travel document generator (a tool, not a booking agency)
**Design Dials:** Variance 7/10 (Asymmetric on a strict grid) | Motion 6/10 (Standard) | Density 5/10

> **THIS FILE IS AN AS-BUILT RECORD, NOT A GENERATED RECOMMENDATION.**
>
> The previous version was produced by `ui-ux-pro-max/scripts/search.py --design-system
> --persist` and then never updated, so it drifted until almost nothing in it described
> the application. It specified a navy primary and a **green** CTA against a light
> background; the app ships a monochrome shell with an electric-blue accent. It
> specified 8px and 12px radii, cards with shadows, a modal component, Google Fonts by
> `@import`, and icons from Heroicons or Lucide. The app has 4px controls, square
> hairline panels, no modals at all, `next/font`, and Phosphor.
>
> It was regenerated rather than re-run deliberately. Re-running the generator would
> produce a fresh *recommendation*, which is a different artefact from a record of what
> exists, and it is the recommendation-versus-reality gap that caused the drift in the
> first place. `app/globals.css` and `components/Reveal.tsx` both cite this file, so
> when it is wrong they are wrong too.
>
> Values below were extracted from `app/globals.css` programmatically, not transcribed.
> Contrast ratios were measured in-browser through canvas colour resolution, because
> Tailwind v4 emits `oklch()` and a naive rgb parser misreads it. Two ratios were
> corrected during this work after hand calculation disagreed with measurement.

---

## Architecture: Two Zones, One Theme Family

The single most important structural fact about this app, and the thing the previous
version of this file omitted entirely.

| Zone | Where | Canvas | Why |
|---|---|---|---|
| **Dark shell** | header, hero, how-it-works, FAQ, footer | `#0b0b0d` | atmospheric; the printed document becomes the brightest thing on screen |
| **Light work surface** | the 5-step wizard, opt-in via `.theme-light` | `#f4f4f5` | extended data entry on a dark ground causes eye strain. A uniform-dark build was tried and reverted (`2d1050e`) |

The dark palette is declared **once**, in `@theme`. Anything not inside `.theme-light`
is dark for free. There is no `.theme-dark` class to drift out of sync, because there
is nothing to keep in sync. `.theme-light` overrides the **semantic tokens**, so every
component using `bg-surface` / `text-ink` / `border-line` resolves correctly with no
per-component branching.

This is a deliberate exception to the usual "one theme, sections do not invert" rule.
It is one full switch at a real zone boundary with a hairline edge, not alternation.

---

## Global Rules

### Colour: three namespaces, and they must stay separate

**1. App shell (`@theme`)** — brand choice, restyle freely.

| Role | Hex | Token |
|---|---|---|
| Canvas | `#0b0b0d` | `--color-canvas` |
| Surface | `#16161a` | `--color-surface` |
| Elevated | `#1e1e23` | `--color-elevated` |
| Primary (neutral progression) | `#3f3f46` | `--color-primary` |
| Primary hover | `#52525b` | `--color-primary-hover` |
| On primary | `#ffffff` | `--color-on-primary` |
| Secondary (links) | `#60a5fa` | `--color-secondary` |
| Accent | `#1d4ed8` | `--color-accent` |
| Accent hover | `#1a43b8` | `--color-accent-hover` |
| Accent on dark ground | `#2563eb` | `--color-accent-on-dark` |
| Accent on dark, hover | `#1d4ed8` | `--color-accent-on-dark-hover` |
| Ink | `#fafafa` | `--color-ink` |
| Ink soft | `#a1a1aa` | `--color-ink-soft` |
| Ink mute | `#7c7c86` | `--color-ink-mute` |
| Muted | `#1e1e23` | `--color-muted` |
| Line | `#2b2b32` | `--color-line` |
| Destructive | `#f87171` | `--color-destructive` |
| Notice surface / line / ink | `#2a2011` / `#5c4415` / `#fcd34d` | `--color-notice-*` |

**2. Light zone (`.theme-light`)** — overrides only.

| Token | Value |
|---|---|
| `--color-canvas` | `#f4f4f5` |
| `--color-surface` | `#ffffff` |
| `--color-elevated` | `#fafafa` |
| `--color-ink` / soft / mute | `#18181b` / `#3f3f46` / `#63636d` |
| `--color-muted` | `#ececee` |
| `--color-line` | `#d9d9de` |
| `--color-primary` / hover | `#18181b` / `#000000` |
| `--color-secondary` | `#2563eb` |
| `--color-destructive` | `#b3261e` |
| `--color-notice-*` | `#fffbeb` / `#c8912f` / `#713f12` |

`--color-accent` is deliberately **not** overridden here. Both zones want the same
blue, and re-stating a value is how the previous palette drifted: the light zone kept
pinning a superseded accent long after `@theme` had moved on.

**3. Document (`--color-doc-*`, 15 tokens)** — **FROZEN.** Sampled from a rendered
reference receipt, which is why they are odd numbers (greys are warm, the panel is
faintly green). Changing these makes the deliverable *wrong*, not merely different.
Two namespaces means a theme tweak can never silently repaint the output.

#### Colour rules

- **One accent.** `--color-accent` means "this action produces the document" and
  nothing else. The neutral progression (Search, Continue, Back) uses
  `--color-primary` and must never borrow it.
- **State colours are a separate class from brand colours.** `--color-destructive`
  and `--color-notice-*` are semantic state, not a second and third accent.
- **Raw hex and raw Tailwind palette classes are banned in the app shell.** Both are
  invisible to `@theme`, so a palette change cannot reach them. Eight named-class
  leaks and three raw-hex leaks were found this way, each surviving a full repaint.
  Grep for **both** forms; a scan for `bg-amber-500` will not find `bg-[#0d1830]`.

### Typography

- **Display:** EB Garamond via `next/font` (`--font-display`)
- **Body:** Lato via `next/font` (`--font-sans`)
- **Document:** system sans + system serif (`--font-doc`, `--font-doc-serif`)

The document keeps **system** faces deliberately. It must render identically on every
machine and in print; a webfont that failed to load would reflow the deliverable.

**Never** load fonts by `<link>` or CSS `@import` in production. The previous version
of this file specified a Google Fonts `@import`, which the project does not use.

### Spacing: 8px base

Permitted steps are multiples of 8px: `2, 4, 6, 8, 12, 16`. The **only** sub-unit is
4px (`1`), used solely for the gap between a label and its own control, where 8px
reads as detachment.

The wizard previously used fourteen distinct values including `mt-0.5`, `mt-1.5`,
`mt-3`, `mt-5`, `mt-7`, `px-2.5` and `px-3.5`, none on a common base.

### Shape: one rule, stated so it can be checked

- **Panels and containers: square.** Structure comes from 1px hairlines and the grid.
- **Interactive controls: 4px** (`rounded`).
- **Exactly one exception:** the chosen/select state chip in `FlightResults` stays a
  full pill, because it reads as a state chip rather than a control.

Measured on the work surface after the rebuild: **one** radius value painted (4px),
down from six (`xl`, `2xl`, `lg`, `md`, default, `full`).

Favicon corners are exempt. `app/icon.svg` is a platform-masked app icon, not a page
container.

### Grid: 12 columns

Every field and cell declares a span on one 12-column grid, so edges align between
rows **and** between steps. Collapses to a single column below `sm`, declared
explicitly rather than assumed.

Spans are a closed map in `components/ui.tsx`, never interpolated. Tailwind compiles by
scanning source text, so `sm:col-span-${n}` is never generated and the field silently
falls back to full width.

### Shadows

`--shadow-card`, `--shadow-lift`, `--shadow-paper`.

Only **`--shadow-paper`** is still in use, under the A4 document preview, where
elevation carries real meaning: it lifts the deliverable off the work surface. The
work surface itself measures **zero** shadowed elements.

**Shadows do not work on the dark shell.** Measured: `rgba(0,0,0,0.12)` composited
over `#0b0b0d` resolves to `#0a0a0b`, which is **1.006:1** against the canvas. A
one-per-channel delta is not a shadow. Any spec calling for a shadow on the dark zone
assumes a light ground and must be translated, not copied.

---

## Component Specs

### Panel (replaces Card)

A group of fields delimited by a hairline, not boxed. `border-t border-line` + `pt-4`.

Cards were removed because they did no work: each step rendered exactly one, so the
border, radius and shadow separated the content from nothing, and five steps read as
five identical rectangles.

`bg-surface` is absent from Panel on purpose. In the light zone the canvas is
`#f4f4f5` and the panel was `#ffffff`, a **1.06:1** step that needed a border and a
shadow to be perceptible at all. Fields keep their own white fill, so they read as the
raised elements. The footer hit the same thing on the dark side: `#16161a` on
`#0b0b0d` is **1.07:1**, so its fill was dropped for the hairline alone.

### Button

4px radius, `min-h-11` (44px touch target), one of five variants.

Tactile feedback is mandatory and was absent from the entire app until Stage 5:
`enabled:hover:-translate-y-px`, `enabled:active:translate-y-0`,
`enabled:active:scale-[0.98]`. Numbers from the Hover Micro-interaction **Subtle**
tier, which is correct for a 44px control; Standard's `y: -4` and `scale: 1.02` are
overshoot on a button.

`enabled:` not bare `hover:`. CSS `:hover` still matches a disabled button, so without
the guard a disabled Continue rises toward the pointer while showing 45% opacity and a
not-allowed cursor.

### Inputs

4px radius, `border-ink-mute`, `min-h-11`, label above, `mt-1` (the 4px sub-unit).

The border is `ink-mute` and not `line`: `--color-line` is the hairline used *between*
rows, and an input drawn in it measured **1.31:1** against the panel, reading as an
absence rather than a control. `ink-mute` is **5.94:1**, past the 3:1 floor for
control boundaries.

`[color-scheme:light]` on every field, or Chrome paints a dark native date picker
inside a white input.

### Modals

**None.** The app has no modal, dialog or overlay. The previous version of this file
specified one.

---

## Motion

**Tier: Standard.** Implemented with Motion (`motion/react`), not GSAP.

### Scroll reveal (`components/Reveal.tsx`)

| | Subtle (previous) | **Standard (current)** |
|---|---|---|
| offset | y 12px | **y 24px** |
| duration | 350ms | **500ms** |
| easing | `power1.out` (easeOutQuad) | **`power2.out` (easeOutCubic)** |
| stagger | 0.04s | **0.08s**, capped at 8 items |
| trigger | `top 90%` | **`top 85%`** (`amount: 0.2`) |

`power2.out` as cubic-bezier: `[0.215, 0.61, 0.355, 1]`.

The dataset has **two** conflicting Standard rows. Stagger List Standard adds
`scale: 0.92` and `back.out(1.4)`; Scroll Reveal Standard is a plain fade-and-rise.
This implements **Scroll Reveal**, because that is the row whose *trigger* matches
("scroll (viewport enter)") rather than load. Taking the overshoot from a
load-triggered row would also have put `back.out` on the FAQ accordion, and that row's
own note says not to use overshoot on informational UI.

### Hover

Bento cells: `y: -4` via Motion's `whileHover`, 200ms, `power2.out`, plus a border
brighten from `line` to `ink-mute`.

The Standard row's `boxShadow` is **dropped**, measured at 1.006:1 on this canvas (see
Shadows). The border brighten carries the affordance instead: `--color-line` is
**1.40:1** against the canvas and `--color-ink-mute` is **4.76:1**, a **3.4x jump**.
`scale: 1.02` is also dropped, because it renders a 1px border at 1.02px through the
whole tween and reads as a soft edge.

**The hover translate must go through Motion, not a Tailwind class.** Motion drives the
reveal by writing `transform` to inline style; Tailwind v4 emits the individual
`translate` property. Per spec those **compose**, verified here: `transform:
translateY(-4px)` plus `translate: 0 -10px` moved an element 14px. A hover class would
therefore stack on top of whatever Motion holds mid-reveal, with two systems each
owning part of one position.

### Reduced motion, and the trap in it

`whileInView` must be **unconditional**. Never put the animation target behind a
`prefers-reduced-motion` branch.

`useReducedMotion()` reads matchMedia in an effect, so it returns `null` on the server
and on the first client render. An early return that dropped all Motion props when
reduced produced this sequence: first render wrote `opacity: 0` and `translateY(24px)`
inline, then the effect resolved and swapped to a branch with no `whileInView`, and
nothing was left to drive the styles back. Measured: all three bento cells at opacity 0
on load **and still 0 after being scrolled to centre**. The section was invisible to
reduced-motion users.

Guard the **transition** and the **offset**, never the target. Zero the delay too: a
0-duration tween that still waits 160ms holds the start state for 160ms, which is the
same defect `globals.css` records for the hero's 1600ms delayed pin.

### The margin-rule hover language

State is marked from the margin with a 2px rule, not with a fill. Used by: the stepper
progress rule, the chosen result row, the search error, the warnings panel, the header
nav, and the FAQ summary rows.

This exists because fills do not work on the dark shell. `--color-muted` (`#1e1e23`)
against `#0b0b0d` is **1.18:1**; a full-ink rule is **18.84:1**.

### CSS keyframes (`globals.css`)

Hero arc draw, endpoint and aircraft pop-in, directional step-panel transitions,
skeleton pulse, ambient drift. All collapse under the global reduced-motion rule,
which zeroes **delays as well as durations**.

---

## Anti-Patterns (Do NOT Use)

- **Raw hex or Tailwind palette classes** in the app shell. Tokens only.
- **Three equal cards in a row.** Removed from how-it-works; use an asymmetric bento
  with exactly as many cells as there is content.
- **Cards where a hairline would do.** Elevation must communicate real hierarchy.
- **Shadows on the dark shell.** Measured at 1.006:1.
- **Fills as hover states on the dark shell.** Measured at 1.18:1. Use a rule.
- **Alpha-over-canvas to fake elevation** (`bg-surface/60`, `bg-primary/15`). Either
  the step is real or it is not there.
- **Hand-rolled SVG icons.** Phosphor only, one family, `regular` weight. Note the
  `/dist/ssr` entry is required in Server Components. The two hero illustrations are
  artwork with unit-tested geometry, not icons, and are exempt.
- **Heroicons or Lucide.** Named in the previous version of this file; not used here.
- **Emojis as icons.** They resolve to whatever font the machine has.
- **A double hyphen inside an XML comment** in any SVG asset. It is a parse error and
  it silently rendered `icon.svg` as nothing while every other check stayed green. Do
  not write CSS custom property names in an SVG comment. `lib/svgAssets.test.ts`
  guards this now.
- **`window.addEventListener("scroll")`.** Use IntersectionObserver via `whileInView`.
- **Modals**, unless a genuinely new need appears. There are none today.
- **Em-dashes and en-dashes** in user-visible strings.

---

## Pre-Delivery Checklist

- [ ] Colour audited for **both** raw hex `bg-[#...]` and named `bg-amber-500` leaks
- [ ] Contrast measured **in-browser via canvas**, in **both** zones, not calculated
      by hand and not parsed from `oklch()` with a regex
- [ ] One radius value on controls (4px), containers square, pill exception documented
- [ ] Spacing on the 8px scale; 4px only for label-to-control
- [ ] Every field and cell has a 12-column span; single column below `sm`
- [ ] `prefers-reduced-motion` verified with `emulateMedia`, checking that content is
      **visible**, not merely that it does not animate
- [ ] Hover and `:active` states present on every control, and visible on the dark
      shell (rule, not fill)
- [ ] Icons from Phosphor; `/dist/ssr` in Server Components
- [ ] Any SVG asset parses as XML (`npx vitest run lib/svgAssets.test.ts`)
- [ ] **Screenshot it.** Three real defects this cycle passed every numeric check and
      were only visible in a screenshot: a sticky header covering the stepper, an
      aircraft glyph painted outside its panel, and a favicon rendering nothing.
      Geometry checks describe an element; they say nothing about what is painted over
      it, or whether the file parsed.
- [ ] `tsc --noEmit`, `npm run build`, and the full test suite green
