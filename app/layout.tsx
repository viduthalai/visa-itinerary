import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visa Itinerary",
  description: "Generate a travel itinerary document.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
