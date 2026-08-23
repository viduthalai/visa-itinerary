import type { Metadata, Viewport } from "next";
import { EB_Garamond, Lato } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  absoluteUrl,
  AUTHOR_NAME,
  AUTHOR_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/seo";
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

/*
 * metadataBase makes every relative URL below (canonical, OG image, icons)
 * resolve to an absolute one. Without it Next emits a build warning and social
 * scrapers get relative image paths they cannot fetch. It is the load-bearing
 * line of this whole block — see lib/seo.ts for how SITE_URL is sourced.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // Any child route that sets its own title gets the brand appended for free.
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  category: "travel",
  // One canonical per page keeps duplicate query-string variants from splitting
  // ranking signal. Home is the root; the OG image comes from the file-based
  // convention in app/opengraph-image.tsx, so it is not restated here.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    creator: "@viduthalai",
  },
  // Explicit and permissive: this is a public tool we want indexed. The nested
  // googleBot block lets rich snippets and full-size image previews through.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

/*
 * Viewport is its own export in Next's App Router (moving it out of `metadata`
 * silences the deprecation warning). themeColor is dark to match the header/hero
 * shell so mobile browser chrome does not flash white against the dark band.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171310",
  colorScheme: "light dark",
};

/*
 * WebApplication JSON-LD. This is the single highest-value SEO addition here:
 * it tells search engines the page is a free browser tool, not an article,
 * which is what makes it eligible for the right result treatments. The FAQPage
 * schema lives in page.tsx alongside the FAQ it mirrors.
 */
const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: absoluteUrl("/"),
  description: SITE_DESCRIPTION,
  applicationCategory: "TravelApplication",
  operatingSystem: "Any (web browser)",
  browserRequirements: "Requires JavaScript. Modern browser.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
  inLanguage: "en",
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
          Structured data. `dangerouslySetInnerHTML` is the standard, safe way to
          emit JSON-LD in React: the payload is a constant we author here, never
          user input, and JSON.stringify escapes it, so there is no injection
          surface. A crawler reads this; a human never sees it.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
        />
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
