import { TOOL_NAME } from "@/lib/config";

/**
 * Site footer.
 *
 * The columns are deliberately not a link farm — this is a single-page tool, so
 * inventing About/Careers/Blog links that go nowhere would be worse than having
 * fewer. Everything here either scrolls to real content on this page or states a
 * fact about the product.
 *
 * The positioning line lives HERE and not on the document. The document has its own
 * voice (lib/documentVoice.ts) and the two are separate on purpose: the site can say
 * what the tool is without that text ending up printed on a customer's PDF.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * ASYMMETRIC, ON THE SAME 12 COLUMNS. This was `sm:grid-cols-3`, three equal
 * thirds, which is the same three-equal-columns shape the rest of the redesign is
 * removing, and it forced the brand paragraph into exactly the width of a two-item
 * link list. It is now 5 / 3 / 4 on the shared 12-column grid, so the column that
 * has prose gets the room and the footer aligns to the work surface above it.
 *
 * NO FILL. The footer was `bg-surface/60`. Two problems: alpha-over-canvas is the
 * navy build's trick for faking elevation, and the solid value it approximates
 * (#16161a on #0b0b0d) is a 1.07:1 step, which is not perceptible as a surface.
 * The top hairline is what separates the footer, so the hairline is all it needs.
 * The wizard's Panel learned the same thing about #ffffff on #f4f4f5.
 *
 * "Good to know" is now "Data sources", and it says what it holds. Two of its three
 * lines were attributions and the third ("No account, no payment") was a product
 * claim filed under a label that described neither. The claim moved into the
 * description, next to the other two sentences making the same point.
 */
export function SiteFooter() {
  const year = 2026; // Fixed, not new Date(): a clock read during render is a hydration mismatch.

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-ink">
              {TOOL_NAME}
            </h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-ink-soft">
              Build a clean, timezone-correct travel itinerary document and save it as a PDF.
              Runs in your browser. Nothing you type is sent to a server, and there is no
              account and no payment.
            </p>
          </div>

          <FooterColumn title="On this page" className="sm:col-span-3">
            <FooterLink href="#how-it-works">How it works</FooterLink>
            <FooterLink href="#faq">FAQ</FooterLink>
          </FooterColumn>

          <FooterColumn title="Data sources" className="sm:col-span-4">
            <li className="text-sm text-ink-soft">Airports from OurAirports</li>
            <li className="text-sm text-ink-soft">Carrier names from OpenFlights</li>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {TOOL_NAME}
          </p>
          <p className="max-w-[65ch]">
            Check each country&apos;s official requirements before you travel. This tool does
            not provide immigration advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * `h3`, not `h2`. The footer's brand name is the h2 here; these sit under it, and
 * the page already uses h2 for step and section titles with h3 for panel titles
 * inside them. Three sibling h2s in one footer flattened a real hierarchy.
 */
function FooterColumn({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-mute">{title}</h3>
      {/* mt-2 (8px), not mt-1. The 4px sub-unit is reserved for a label bound to its
          own control; a heading above a list is a normal 8px step. */}
      <ul className="mt-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex min-h-11 cursor-pointer items-center rounded text-sm text-ink-soft
                   underline-offset-4 transition-colors duration-200 hover:text-secondary
                   hover:underline"
      >
        {children}
      </a>
    </li>
  );
}
