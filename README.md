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

## Roadmap & pending features

Known gaps and things worth building next — a starting point if you'd like to
contribute. Items tagged **`good first issue`** are self-contained and don't
need deep context. Open an issue before starting anything larger so we can agree
on the approach.

### Functionality

- **End-to-end live flight search.** The sample provider currently returns the
  same flight for every route (so `BLR → DXB` shows the wrong carrier and a
  return leg can point the wrong way). Wire the Travelpayouts provider through so
  results are real per-route. _(medium)_
- **Multi-city itineraries** — support more than two legs. _(medium–large)_
- **Save / load a draft** — export the itinerary to JSON and re-import it, so a
  half-built document survives a closed tab. _(medium)_
- **Internationalisation (i18n)** of the UI copy. _(large)_

### Quality & tests

- **Component tests for `ItineraryDocument`** — the deliverable has none; every
  test today lives in `lib/`. This is the highest-value test gap. **`good first issue`**
- **Block Search on a typed past date** — a past date is flagged (`rangeUnderflow`)
  but not actually blocked from searching. **`good first issue`**

### Accessibility & UI polish

- **Footer heading levels** — the footer uses `<h2>`s that compete with real page
  sections in the document outline; demote them. **`good first issue`**
- **Step-2 results hierarchy** — eight undifferentiated columns with no headers;
  add labels so price and duration are scannable. _(small)_
- **Stepper affordance** — completed steps are clickable but give no visual hint. _(small)_
- **Mobile layout for step 2** — the results row overflows a 375px viewport
  (the app is desktop-first today). _(medium)_

### Design-system follow-ups

- **Separate destructive red from the accent red** — `#b3261e` and `#c9382e` sit
  ~1.27:1 apart. Fine today (they never co-occur), but a destructive action on a
  dark surface would force one to move. _(small)_
- **Glass header over the warm zone** reads muddy where the backdrop blur picks up
  the warm paper. _(small, cosmetic)_

### Before real-world use (research, not code)

- **Consulate acceptance.** The open product question: do target consulates accept
  a self-generated itinerary document, or do they require a verifiable
  reservation? This gates any real use and needs primary sources, not vendor
  marketing.

## Contributing

Issues and pull requests are welcome — start with **[CONTRIBUTING.md](./CONTRIBUTING.md)**
for setup, conventions, and the PR checklist. In short: run `npm run typecheck`,
`npm test`, and `npm run build` before opening a PR, add tests for new logic, and
keep the honest-document premise intact — the tool must never present itself as
issuing a real ticket, booking, or reservation.

## License

[MIT](./LICENSE) © 2026 Viduthalai Mani
