import { TOOL_NAME } from "@/lib/config";

/**
 * Site footer.
 *
 * The three columns are deliberately not a link farm — this is a single-page tool,
 * so inventing About/Careers/Blog links that go nowhere would be worse than having
 * fewer. Everything here either scrolls to real content on this page or states a
 * fact about the product.
 *
 * The positioning line lives HERE and not on the document. The document has its own
 * voice (lib/documentVoice.ts) and the two are separate on purpose: the site can say
 * what the tool is without that text ending up printed on a customer's PDF.
 */
export function SiteFooter() {
  const year = 2026; // Fixed, not new Date(): a clock read during render is a hydration mismatch.

  return (
    <footer className="mt-24 border-t border-line bg-surface/60">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-ink">
              {TOOL_NAME}
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
              Build a clean, timezone-correct travel itinerary document and save it as a PDF.
              Runs in your browser — nothing you type is sent to a server.
            </p>
          </div>

          <FooterColumn title="On this page">
            <FooterLink href="#how-it-works">How it works</FooterLink>
            <FooterLink href="#faq">FAQ</FooterLink>
          </FooterColumn>

          <FooterColumn title="Good to know">
            <li className="text-sm text-ink-soft">Airport data from OurAirports</li>
            <li className="text-sm text-ink-soft">Carrier names from OpenFlights</li>
            <li className="text-sm text-ink-soft">No account, no payment</li>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {TOOL_NAME}
          </p>
          <p>
            Check each country&apos;s official requirements before you travel — this tool does
            not provide immigration advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-mute">{title}</h2>
      <ul className="mt-1">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex min-h-11 cursor-pointer items-center text-sm text-ink-soft
                   underline-offset-4 transition-colors duration-200 hover:text-secondary
                   hover:underline"
      >
        {children}
      </a>
    </li>
  );
}
