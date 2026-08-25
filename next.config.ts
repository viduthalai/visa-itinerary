import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
   * No `images.remotePatterns` on purpose. There are zero remote images, so an
   * allowlist entry here would be dead config AND a small live surface: every
   * host listed can be fetched and re-served through our own /_next/image
   * endpoint by anyone who constructs the URL. Add a pattern only when a remote
   * source actually ships.
   *
   * If photography is added later, prefer self-hosted files under /public: no
   * allowlist, no upstream dependency, and next/image still optimises them.
   */
};

export default nextConfig;
