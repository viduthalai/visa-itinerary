import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Serves /sitemap.xml. The app is a single indexable route — the tool itself,
 * with #how-it-works and #faq as in-page anchors rather than separate URLs, so
 * they do not belong here (a fragment is not a distinct page to a crawler).
 *
 * lastModified is stamped at build time. That is honest: a fresh build is when
 * the deployed content last changed, so the date a crawler sees moves only when
 * something actually shipped.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
