import type { MetadataRoute } from "next";
import visaData from "@/data/visa.json";
import { absoluteUrl } from "@/lib/seo";
import type { VisaData } from "@/lib/visa";

/**
 * Serves /sitemap.xml. The tool itself is one indexable route (with #how-it-works
 * and #faq as in-page anchors, not separate URLs — a fragment is not a distinct
 * page to a crawler). The /passport/[code] explorer adds one real page per passport
 * in the bundled matrix; those ARE distinct URLs, so they belong here.
 *
 * lastModified is stamped at build time. That is honest: a fresh build is when the
 * deployed content last changed, so the date a crawler sees moves only when
 * something actually shipped.
 */
const data = visaData as unknown as VisaData;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const passportRoutes: MetadataRoute.Sitemap = Object.keys(data.matrix).map((iso2) => ({
    url: absoluteUrl(`/passport/${iso2.toLowerCase()}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/passport"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...passportRoutes,
  ];
}
