import type { Metadata } from "next";
import Link from "next/link";
import { PassportFilter } from "@/components/PassportFilter";
import visaData from "@/data/visa.json";
import { SITE_NAME } from "@/lib/seo";
import { visaCountries, type VisaData } from "@/lib/visa";

/*
 * /passport — the index/hub for the per-passport explorer. Static server component:
 * it lists every passport in the bundled matrix, each linking to its own
 * /passport/[code] page. This is what the header's "Passports" nav points at, and
 * it gives the 199 detail pages a real parent for both humans and crawlers.
 */
const data = visaData as unknown as VisaData;

export const metadata: Metadata = {
  title: "Visa requirements by passport",
  description:
    "Pick your passport to see where it can go: visa-free, visa on arrival, eTA, " +
    "e-visa and visa-required destinations, with permitted stays. Community data.",
  alternates: { canonical: "/passport" },
  openGraph: {
    title: `Visa requirements by passport · ${SITE_NAME}`,
    description: "Where every passport can travel, by destination.",
    url: "/passport",
    type: "website",
  },
};

export default function PassportIndexPage() {
  const countries = visaCountries(data); // { iso2, name }, alphabetised

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-secondary hover:underline"
      >
        Back to the itinerary builder
      </Link>

      <header className="mt-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-ink sm:text-4xl">
          Visa requirements by passport
        </h1>
        <p className="mt-2 max-w-[65ch] text-ink-soft">
          Pick a passport to see everywhere it can go, grouped by what entry takes, with the
          permitted stay when the dataset gives one.
        </p>
      </header>

      <PassportFilter countries={countries} />

      <p className="mt-12 max-w-[65ch] text-xs leading-relaxed text-ink-mute">
        Community data ({data.meta.source}, updated {data.meta.built}). Visa rules change;
        always confirm with the destination&rsquo;s official embassy or consulate before you
        travel. This is guidance, not immigration advice.
      </p>
    </main>
  );
}
