import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Serves /robots.txt. Everything is allowed — this is a public tool — and the
 * file points crawlers at the sitemap so they discover the routes without
 * guessing. The one disallow keeps the sample-data API endpoint out of the
 * index; it returns JSON, not a page anyone should land on from search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
