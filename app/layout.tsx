import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visa Itinerary",
  description: "Generate a travel itinerary document.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
