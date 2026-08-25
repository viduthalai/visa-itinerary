"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll reveal, one implementation for the whole page.
 *
 * The numbers are NOT invented. They come from the ui-ux-pro-max motion dataset,
 * Scroll Reveal, and this now implements the STANDARD tier rather than Subtle:
 *
 *              Subtle (was)              Standard (now)
 *   offset     y 12px                    y 24px
 *   duration   300-400ms  -> 350ms       400-600ms  -> 500ms
 *   easing     power1.out (easeOutQuad)  power2.out (easeOutCubic)
 *   stagger    0.02-0.04s -> 0.04s       0.08s
 *   trigger    start "top 90%"           start "top 85%"
 *
 * WHICH STANDARD ROW, and why it matters. The dataset has two Standard-tier rows
 * that could apply here and they disagree: Stagger List Standard adds `scale: 0.92`
 * and `ease: back.out(1.4)`, while Scroll Reveal Standard is a plain fade-and-rise
 * on power2.out. This implements Scroll Reveal, because that is the row whose
 * TRIGGER matches what this component does ("scroll (viewport enter)"); Stagger List
 * is specified for load. Taking the overshoot from a load-triggered row would also
 * have put `back.out` on the FAQ accordion, and the dataset's own note on that row
 * says not to use overshoot on informational UI because it "reads as sloppy".
 *
 * The spec has existed since the design system was written and had never been
 * implemented, which is why the page had entry animations in the hero and nothing at
 * all below it.
 *
 * WHY MOTION AND NOT GSAP. The dataset states the preset as a `gsap.from` +
 * ScrollTrigger snippet. MASTER.md used to copy that snippet verbatim, at the Subtle
 * values, which made it look like the app ran GSAP at the old tier; it now records
 * this Motion implementation at Standard instead. Implementing it with GSAP would
 * mean three new dependencies (gsap, ScrollTrigger, @gsap/react) to fade
 * things up 24px, and the taste rules are explicit that Motion's `whileInView` is
 * the right tool for reveals with no pin or scrub, with GSAP reserved for actual
 * scroll-hijack work. Mixing the two in one tree is also forbidden outright: they
 * fight over the same frames. So the PARAMETERS are the dataset's; the mechanism is
 * the lighter one. `power2.out` maps to the cubic-bezier below.
 *
 * No scroll listener anywhere: `whileInView` uses IntersectionObserver internally.
 * A `window.addEventListener("scroll", ...)` implementation is a hard ban, since it
 * runs on every scroll frame unbatched.
 *
 * KNOWN TRADE-OFF. `initial` renders the element at opacity 0 in the SSR HTML, so a
 * client with JS disabled never sees it fade in. The text is still present in the
 * markup for anything parsing HTML, and Google renders JS, but this is the dataset's
 * own documented caveat ("don't reveal below-the-fold content needed for SEO as
 * invisible-by-default without a no-JS fallback"). It is applied only to the two
 * explainer sections, never to the wizard or the document, so nothing a user needs
 * in order to complete the task depends on it.
 */

/**
 * `power2.out` from the dataset, expressed as a cubic-bezier. GSAP's power2 is a
 * cubic curve, so this is easeOutCubic. (The previous revision used power1.out,
 * [0.25, 0.46, 0.45, 0.94], which is easeOutQuad: a shallower deceleration.)
 */
const POWER2_OUT = [0.215, 0.61, 0.355, 1] as const;

/**
 * Dataset guidance is "don't stagger more than ~8 children; beyond that the last
 * items feel laggy". At 0.08s that is a 0.64s tail, which is already the outer edge
 * of tolerable. The cap is here rather than at the call site because this component
 * is shared and a future caller will not remember.
 */
const MAX_STAGGER_INDEX = 8;

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Index within a staggered group. Clamped to MAX_STAGGER_INDEX. */
  index?: number;
  as?: "div" | "section" | "li";
  /**
   * Raise the element on pointer hover.
   *
   * THIS HAS TO LIVE HERE rather than as a `hover:-translate-y-1` class on the
   * caller, and the reason is measured rather than assumed.
   *
   * Motion drives this element's reveal by writing `transform` to inline style.
   * Tailwind v4 does NOT emit the `transform` shorthand for its translate utilities;
   * it emits the individual `translate` property (`translate: var(--tw-translate-x)
   * var(--tw-translate-y)`). Those are two different CSS properties, and per spec the
   * individual transform properties apply IN ADDITION to `transform`. Verified in
   * this app: setting `transform: translateY(-4px)` and `translate: 0 -10px` on one
   * cell moved it 14px, not 4px and not 10px.
   *
   * So the failure mode is not that the class loses. It is that both would apply.
   * With a hover class, a pointer resting on a cell mid-reveal would add its offset
   * on top of whatever Motion currently holds, and the cell would settle 4px high
   * with Motion believing it is at 0. Two systems would each own part of one
   * position, neither aware of the other. `whileHover` keeps it to one owner, and
   * gets interruption handling and the automatic reverse tween with it.
   *
   * Border colour still belongs in the caller's className. It is a paint property
   * that neither system contests.
   */
  hoverLift?: boolean;
};

export function Reveal({
  children,
  className,
  index = 0,
  as = "div",
  hoverLift = false,
}: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  /*
   * ────────────────────────────────────────────────────────────────────────────────
   * REDUCED MOTION: `whileInView` IS ALWAYS PRESENT. Do not put it behind a branch.
   * ────────────────────────────────────────────────────────────────────────────────
   *
   * The previous shape of this component early-returned a bare `<Tag>` with no
   * animation props when `reduce` was true, on the reasoning that content which never
   * animates never needs a target to animate to. That shipped the bento invisible.
   *
   * `useReducedMotion()` reads matchMedia in an effect, so it returns NULL on the
   * server and on the first client render, and only resolves to `true` a tick later.
   * The sequence was:
   *
   *   1. first render, reduce === null (falsy)  -> animated branch renders,
   *      Motion writes opacity 0 and translateY(24px) to inline style
   *   2. effect resolves, reduce === true       -> the bare branch renders, which has
   *      no `whileInView`, so nothing is left to drive those inline styles back
   *   3. the section sits at opacity 0 permanently, before AND after scrolling it
   *      into view
   *
   * Measured under `prefers-reduced-motion: reduce`: all three cells at opacity 0 on
   * load and still 0 after being scrolled to centre. A reduced-motion user could not
   * see "How it works" at all.
   *
   * So the guard is now on the TRANSITION and the OFFSET, never on the target. When
   * motion is not wanted the element starts at its final position and the transition
   * is zero-length, so it is simply there. When `reduce` is still null we render the
   * animated start state, but `whileInView` is present in both cases, which means the
   * worst possible outcome is an instant appearance rather than a stranded section.
   *
   * This is the same class of defect globals.css records for the hero's 1600ms
   * delayed pin, where collapsing the duration but not the delay held the FROM
   * keyframe and left a blank space. Losing content is always worse than the
   * animation someone opted out of.
   *
   * The hover lift IS still dropped when reduced. That is a real movement request and
   * suppressing it strands nothing: the border-colour change in the caller's
   * className still fires, so the affordance survives without the motion.
   */
  const animate = reduce !== true;

  return (
    <Tag
      className={className}
      initial={animate ? { opacity: 0, y: 24 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      /*
       * `once` so a section does not re-animate every time it scrolls back past.
       * `amount: 0.15` was the equivalent of the dataset's Subtle `start: "top 90%"`.
       * Standard specifies `start: "top 85%"`, so the element should be slightly
       * further in before it fires: 0.2 rather than 0.15.
       */
      viewport={{ once: true, amount: 0.2 }}
      /*
       * Standard-tier hover displacement is `y: -4`, with the transition declared
       * INSIDE the variant. It has to be: the root `transition` below carries the
       * reveal's 500ms duration and its per-item stagger delay, and Motion would
       * apply both to the hover as well. Cell three would then wait 160ms before
       * starting a half-second crawl toward the pointer. The dataset specifies
       * 200-300ms for this interaction, with no delay.
       *
       * No matching "leave" tween is written by hand. Motion reverses `whileHover`
       * automatically when the pointer leaves, which is what the dataset's warning
       * about a stuck hover state ("always attach the reverse tween") is asking for.
       */
      {...(animate && hoverLift
        ? { whileHover: { y: -4, transition: { duration: 0.2, ease: POWER2_OUT } } }
        : {})}
      transition={
        animate
          ? {
              duration: 0.5,
              delay: Math.min(index, MAX_STAGGER_INDEX) * 0.08,
              ease: POWER2_OUT,
            }
          : /* Zero-length and undelayed. The delay has to go too: a 0-duration tween
               that still waits 160ms would hold the start state for those 160ms,
               which is the hero-pin defect in miniature. */
            { duration: 0, delay: 0 }
      }
    >
      {children}
    </Tag>
  );
}
