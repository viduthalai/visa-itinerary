import type { Metadata } from "next";
import { EB_Garamond, Lato } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

/*
 * next/font downloads these at BUILD time and self-hosts the files, so the running
 * page makes no request to Google — no third-party runtime dependency and no
 * layout shift from a late webfont. `display: "swap"` keeps text visible while
 * they load.
 *
 * Pairing comes from the ui-ux-pro-max design system: EB Garamond + Lato, scored
 * for "legal, professional, formal documents". It also happens to echo the
 * document's own serif headings, so the tool and its output read as one thing.
 */
const display = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const body = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Visa Itinerary — build a travel itinerary document",
  description:
    "Build a clean, timezone-correct travel itinerary document and save it as a PDF. " +
    "Runs entirely in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * suppressHydrationWarning is here for ONE specific reason: browser extensions
     * write attributes onto <html> before React hydrates. A real report showed
     * `data-quip2chorus-version="0.4.1"` on this element, which the server can
     * never have rendered, and React treats it as a hydration mismatch and bails
     * out of hydrating the whole tree.
     *
     * Scope matters and is the reason this is safe: the flag only covers THIS
     * element's own attributes and text — it does not extend to descendants. A
     * genuine mismatch anywhere inside the app still reports normally, so this
     * silences the extension noise without hiding our own bugs.
     */
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body className="min-h-full font-sans text-ink antialiased">
        {/*
          Skip link — the first tab stop. The wizard puts a header and a progress
          bar ahead of the form, so without this a keyboard user tabs through the
          chrome on every step.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                     focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2
                     focus:text-sm focus:text-on-primary"
        >
          Skip to content
        </a>
        <div className="flex min-h-full flex-col">
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
