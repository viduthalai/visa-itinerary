import Link from "next/link";
import { TOOL_NAME } from "@/lib/config";

/**
 * Site header.
 *
 * Icons are inline SVG, never emoji: emoji resolve to whatever font the machine
 * has, so the same header renders differently per OS — and they carry no
 * accessible name. Every icon here is `aria-hidden` with the meaning carried by
 * adjacent text, so a screen reader gets the label once, not twice.
 *
 * Hidden from print by the rule in globals.css — the PDF is the document alone.
 */
export function SiteHeader() {
  return (
    <header className="glass sticky top-0 z-30 border-b border-line">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex min-h-11 items-center gap-2.5 rounded-lg transition-opacity
                     duration-200 hover:opacity-80"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br
                       from-primary to-accent text-on-primary shadow-[var(--shadow-card)]"
          >
            <PlaneIcon />
          </span>
          <span className="leading-tight">
            <span className="block font-[family-name:var(--font-display)] text-[17px] font-semibold text-ink">
              {TOOL_NAME}
            </span>
            <span className="block text-[11px] text-ink-mute">Travel document builder</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <HeaderLink href="#how-it-works">How it works</HeaderLink>
          <HeaderLink href="#faq">FAQ</HeaderLink>
        </nav>
      </div>
    </header>
  );
}

/** min-h-11 = the 44px touch minimum. A nav link is a touch target even though it
 *  does not look like a button. */
function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-ink-soft
                 transition-colors duration-200 hover:bg-muted hover:text-ink"
    >
      {children}
    </a>
  );
}

function PlaneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l3.2 3.9-2 2-2.3-.6a.5.5 0 0 0-.5.8L5 16l1.9 2.3a.5.5 0 0 0 .8-.5l-.6-2.3 2-2 3.9 3.2a.5.5 0 0 0 .8-.5Z" />
    </svg>
  );
}
