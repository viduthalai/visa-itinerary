import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import visaData from "@/data/visa.json";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { passportProfile, type VisaData, type VisaTone } from "@/lib/visa";

/*
 * Per-passport explorer: /passport/in, /passport/us, … one statically-generated
 * page per passport in the bundled matrix (199 of them).
 *
 * This is a SERVER component and imports data/visa.json directly, so the whole
 * page renders to static HTML at build time — the 390 KB dataset never reaches
 * the client here (unlike the wizard's VisaCheck panel, which lazy-loads it in the
 * browser). Static HTML + no client JS is exactly what makes these pages fast and
 * indexable: the SEO reason the subpage exists.
 */
const data = visaData as unknown as VisaData;

// Every passport is known at build time; anything not in the matrix is a real 404,
// not an on-demand render.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(data.matrix).map((iso2) => ({ code: iso2.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const profile = passportProfile(data, code);
  if (!profile) return {};

  const { name, counts } = profile;
  const title = `${name} passport: visa-free and visa-required countries`;
  const description =
    `Visa requirements for ${name} passport holders, by destination. ` +
    `${counts.F} visa-free, ${counts.A} visa on arrival, ${counts.E} eTA, ` +
    `${counts.V} e-visa, ${counts.R} visa required. ` +
    `Community data; confirm with the destination's embassy before you travel.`;
  const path = `/passport/${profile.iso2.toLowerCase()}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · ${SITE_NAME}`, description, url: path, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** ISO-2 -> flag emoji via regional-indicator symbols. Matches VisaCheck's helper. */
function flagEmoji(iso2: string): string {
  const cc = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/* Tone -> the marker colour, the same three-way scheme VisaCheck uses (the shell is
 * monochrome and has no green, so "ok" is strong ink, "notice" the amber state
 * token, "alert" destructive). */
const TONE_DOT: Record<VisaTone, string> = {
  ok: "bg-ink",
  notice: "bg-notice-ink",
  alert: "bg-destructive",
};

export default async function PassportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const profile = passportProfile(data, code);
  if (!profile) notFound();

  const { name, iso2, counts, noAdvanceVisa } = profile;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: `${name} passport`,
        item: absoluteUrl(`/passport/${iso2.toLowerCase()}`),
      },
    ],
  };

  const stats = [
    { n: counts.F, label: "Visa-free", tone: "ok" as VisaTone },
    { n: noAdvanceVisa, label: "No advance visa", tone: "ok" as VisaTone },
    { n: counts.R, label: "Visa required", tone: "alert" as VisaTone },
  ];

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Link
        href="/"
        className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-secondary hover:underline"
      >
        Back to the itinerary builder
      </Link>

      <header className="mt-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-ink sm:text-4xl">
          <span aria-hidden>{flagEmoji(iso2)}</span> {name} passport
        </h1>
        <p className="mt-2 max-w-[65ch] text-ink-soft">
          Where {name} passport holders can go, by destination. Each row shows what entry
          takes and the permitted stay when the dataset gives one.
        </p>
      </header>

      {/* Headline numbers, separated by hairlines rather than boxed into cards. */}
      <div className="mt-8 grid grid-cols-3 divide-x divide-line border-y border-line">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-5">
            <div className="flex items-baseline gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${TONE_DOT[s.tone]}`} aria-hidden />
              <span className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-ink sm:text-4xl">
                {s.n}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-mute">{s.label}</p>
          </div>
        ))}
      </div>

      {/* One section per status, easiest entry first. */}
      <div className="mt-12 space-y-10">
        {profile.groups.map((group) => (
          <section key={group.code} className="border-t border-line pt-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className={`inline-block h-2 w-2 rounded-full ${TONE_DOT[group.tone]}`} aria-hidden />
              {group.label}
              <span className="text-ink-mute">· {group.destinations.length}</span>
            </h2>

            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {group.destinations.map((d) => (
                <li key={d.iso2} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-ink-soft">
                    <span aria-hidden>{flagEmoji(d.iso2)}</span> {d.name}
                  </span>
                  {d.days !== null && (
                    <span className="shrink-0 tabular-nums text-xs text-ink-mute">{d.days}d</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/*
        Honesty footnote — the same load-bearing disclaimer VisaCheck carries. The
        dataset is a periodically-updated community source, so the page never lets a
        cell stand as a fact to act on unchecked.
      */}
      <p className="mt-12 max-w-[65ch] text-xs leading-relaxed text-ink-mute">
        Community data ({data.meta.source}, updated {data.meta.built}). Visa rules change,
        and a day count is the general allowance, not a guarantee. Always confirm with the
        destination&rsquo;s official embassy or consulate before you travel. This is guidance,
        not immigration advice.
      </p>
    </main>
  );
}
