import { AirplaneTakeoff } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { TOOL_NAME } from "@/lib/config";

/**
 * Site header.
 *
 * The mark is a Phosphor glyph, not a hand-drawn path. The previous comment here
 * defended "inline SVG, never emoji", which argued against the wrong thing: the
 * rule is one icon library for the whole project, and this file was the last place
 * in the app shell still carrying a hand-rolled icon path. Every other icon moved
 * to Phosphor earlier; this one was missed because it lives in the chrome rather
 * than in a section.
 *
 * IMPORT PATH MATTERS. `@phosphor-icons/react/dist/ssr`, not the package root.
 * This component is a Server Component (no "use client"), and the root entry's
 * icons call `useContext(IconContext)` for their default props, which throws
 * outside a client boundary. The `/ssr` entry exists precisely for this case. The
 * client components in the wizard import from the root, correctly.
 *
 * `aria-hidden` on the glyph with the meaning carried by the adjacent wordmark, so
 * a screen reader gets the label once rather than twice.
 *
 * SOLID, NOT FROSTED. This was `.glass`, a 72%-opaque fill plus a 12px backdrop
 * blur. That was the last surviving piece of the "Modern Dark (Cinema Mobile)"
 * navy build: the rule's own comment in globals.css recorded that its alpha was
 * inherited from that palette. A frosted bar reads as decoration over the flat
 * Swiss grid the work surface now uses, and the header was its only consumer, so
 * the class is gone from globals.css rather than left behind as dead CSS.
 *
 * Hidden from print by the rule in globals.css — the PDF is the document alone.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      {/* h-16 is 64px, inside the 80px cap for desktop chrome, and on the 8px scale. */}
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex min-h-11 items-center gap-2 rounded transition-opacity
                     duration-200 hover:opacity-80"
        >
          {/*
            MONOCHROME MARK. This tile was `bg-gradient-to-br from-primary to-accent`,
            a grey-to-blue gradient blending the two tokens that carry the most
            specific meanings in the palette: primary is the neutral progression
            (Search, Continue, Back) and accent means "this produces the document".
            A gradient across both says neither, and the hero headline's gradient was
            already removed for exactly this reason. This one survived that pass
            because it is in the chrome.

            Inverted ink instead: near-white tile, near-black glyph. It reads as a
            deliberate wordmark, it is unmistakably not a button, and it leaves the
            accent free to mean the one thing it means.

            SQUARE, per the shape rule in ui.tsx: containers are square, controls are
            4px. This is a mark, not a control.
          */}
          {/*
            AirplaneTakeoff, kept deliberately. The alternatives were measured, and
            for the record they are geometrically better suited to a square tile.
            Ink bounding boxes inside Phosphor's 256-unit viewBox:

              AirplaneTakeoff   94% wide x 69% tall, ink centre 8 units low
              Airplane          88% x 88%, ink centre exactly 0,0
              AirplaneTilt      78% x 78%, ink centre -4,+4

            This one is the only candidate that is not ink-square, so it cannot fill
            the tile's height without overrunning its width, and its ink centre sits
            below the box centre. It is kept because "takeoff" is the right idea for
            a departure document and the runway line is part of that reading.

            SIZE IS SET BY WIDTH, not by the nominal box. At 94% ink width this glyph
            hits the tile's left and right edges long before its height matters, so
            sizing it like a square glyph is what produced the original problem from
            the other direction. 20px gave an effective ink of 18.8 x 13.8px in a
            40px tile: 47% wide, 34% tall, a small mark adrift in a large square.
            26px gives 24.4 x 17.9px, so 61% wide with ~8px of clear space each side.
            Going further would crowd the tile horizontally while the height still
            looked short, which is the trade this glyph forces.
          */}
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center bg-ink text-canvas"
          >
            <AirplaneTakeoff size={26} weight="regular" />
          </span>
          <span className="leading-tight">
            <span className="block font-[family-name:var(--font-display)] text-base font-semibold text-ink">
              {TOOL_NAME}
            </span>
            <span className="block text-xs text-ink-mute">Travel document builder</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-2 text-sm">
          <HeaderLink href="/passport">Passports</HeaderLink>
          {/* Absolute (/#…), not page-relative (#…): the header is shared with the
              /passport pages, where a bare #how-it-works would resolve to nothing. */}
          <HeaderLink href="/#how-it-works">How it works</HeaderLink>
          <HeaderLink href="/#faq">FAQ</HeaderLink>
        </nav>
      </div>
    </header>
  );
}

/**
 * min-h-11 = the 44px touch minimum. A nav link is a touch target even though it
 * does not look like a button. `px-4` puts it on the wizard's spacing system.
 *
 * HOVER IS A RULE, NOT A FILL. This was `hover:bg-muted`, and on this header that
 * was very nearly nothing: in the dark shell --color-muted is #1e1e23 against a
 * #0b0b0d canvas, a ~1.07:1 step, which is the same imperceptible-surface problem
 * the wizard's Panel and the footer's fill both hit. (--color-elevated is the same
 * #1e1e23, so swapping tokens would not have helped.)
 *
 * A 2px bottom rule that goes from transparent to full ink is unmissable, costs no
 * layout shift because the border occupies its box in both states, and speaks the
 * language the rest of the redesign settled on: the stepper's progress rule, the
 * chosen result row, the search error and the warnings panel are all marked by a
 * rule rather than a wash.
 */
function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 cursor-pointer items-center border-b-2 border-b-transparent
                 px-4 text-ink-soft transition-colors duration-200 hover:border-b-ink
                 hover:text-ink"
    >
      {children}
    </a>
  );
}
