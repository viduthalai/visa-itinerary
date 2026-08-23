# Visa Itinerary

**Build a travel itinerary document that gets the times right.**

Search a route, choose your flights, add passengers — then save a clean PDF.
Every arrival is calculated in the destination airport's own timezone, so the
document never prints a time that airport would not show. It runs entirely in
your browser: no account, no database, nothing leaves the tab.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-vitest-6da75d?logo=vitest)](https://vitest.dev/)

> **What this is not.** This tool produces an honestly-labelled *itinerary
> document* — not a ticket, a booking, or a reservation. Nothing is reserved
> with any airline and no payment is taken. If you need a verifiable reservation
> for a visa application, confirm your consulate's requirements first.

---

## Features

- **Timezone-correct times.** Arrival is computed in the destination's own
  timezone via `tz-lookup`, so a red-eye never prints an impossible clock time.
- **4,565 airports, real airlines.** Bundled IATA airport and airline data, built
  from open datasets at build time — no runtime lookup, no third-party call.
- **One-way or round trip.** Add a return date and the return leg is derived for
  you; leave it blank for one-way.
- **Optional real flight search.** With a free Travelpayouts token the search
  returns live carriers and times. Without one it returns clearly-labelled
  sample data, so the app is fully usable offline.
- **The preview is the PDF.** What you see on the final step is exactly what
  prints — there is no second template to drift out of sync.
- **Private by design.** No account, no database, no analytics. State lives in
  the browser and is discarded when the tab closes.
- **Accessible.** Skip link, live-region announcements, keyboard-navigable
  wizard, and WCAG-AA-checked contrast throughout.

## Tech stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org/) (App Router)     |
| UI         | [React 19](https://react.dev/), TypeScript (strict)|
| Styling    | [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first `@theme`) |
| Dates/TZ   | `date-fns`, `tz-lookup`                            |
| Testing    | [Vitest](https://vitest.dev/) + Testing Library    |
| Fonts      | EB Garamond + Lato, self-hosted via `next/font`    |

## Getting started

```bash
git clone https://github.com/viduthalai/visa-itinerary.git
cd visa-itinerary
npm install
npm run dev          # http://localhost:3000
```

The app works immediately with sample flight data. To enable live flight
search, add a token (see [Configuration](#configuration)).

### Scripts

| Command                 | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Start the dev server                            |
| `npm run build`         | Production build                                |
| `npm start`             | Serve the production build                      |
| `npm test`              | Run the test suite once                         |
| `npm run test:watch`    | Run tests in watch mode                         |
| `npm run typecheck`     | Type-check without emitting                     |
| `npm run data:airports` | Rebuild `data/airports.json` from the source set |
| `npm run data:airlines` | Rebuild `data/airlines.json` from the source set |

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need:

```env
# Optional: live flight search. Free — register as a Travelpayouts partner,
# then Profile → API token. Omit it and the search returns sample data.
TRAVELPAYOUTS_TOKEN=

# Required for a real deploy: your public origin, no trailing slash.
# Drives canonical URLs, the sitemap, and Open Graph image links.
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

> **Set `NEXT_PUBLIC_SITE_URL` before you deploy.** Canonical tags, `sitemap.xml`,
> `robots.txt` and the social-share image are all built from it. The default is a
> placeholder that is only correct for local development.

## Project structure

```
app/
  layout.tsx            Root layout, SEO metadata, WebApplication JSON-LD
  page.tsx              The 5-step wizard + How-it-works + FAQ
  opengraph-image.tsx   Generated social-share card (next/og)
  twitter-image.tsx     Re-exports the OG card
  robots.ts             /robots.txt
  sitemap.ts            /sitemap.xml
  manifest.ts           /manifest.webmanifest (PWA)
  api/flights/route.ts  Flight search (Travelpayouts or sample data)
components/             Hero, wizard steps, and the itinerary document
lib/                    Pure logic — timezone math, itinerary model, SEO config
  seo.ts                Single source of truth for site URL, name, keywords
  content.ts            FAQ copy shared by the page and its FAQPage schema
data/                   Bundled airport and airline JSON
scripts/                Build the data/ JSON from open datasets
```

## SEO

The app ships a complete metadata stack, all sourced from `lib/seo.ts` so the
site URL, name and description are stated exactly once:

- Rich `metadata` — title template, description, keywords, canonical, authors
- Open Graph + Twitter cards with a generated 1200×630 image
- `robots.txt` and `sitemap.xml` route handlers
- A PWA web manifest with theme colours matching the app shell
- `WebApplication` and `FAQPage` JSON-LD structured data

After a build, verify with any structured-data / OG validator against your
deployed `NEXT_PUBLIC_SITE_URL`.

## Testing

```bash
npm test
```

Logic is covered by unit tests in `lib/` — timezone boundaries, the itinerary
model, duration math, and the arc geometry for the hero artwork.

## Contributing

Issues and pull requests are welcome. Please run `npm run typecheck` and
`npm test` before opening a PR, and keep the honest-document premise intact:
the tool must never present itself as issuing a real ticket or reservation.

## License

[MIT](./LICENSE) © 2026 Viduthalai Mani
