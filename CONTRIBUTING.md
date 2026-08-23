# Contributing to Visa Itinerary

Thanks for taking the time to contribute. This is a small, focused project — a
tool that builds an honestly-labelled travel itinerary document — and that focus
is worth protecting. The notes below keep contributions quick to review and
consistent with the rest of the codebase.

## The one non-negotiable

**The tool must never present itself as issuing a real ticket, booking,
reservation, or PNR.** It generates a *document* from details the user enters;
nothing is reserved and no payment is taken. Every user-facing string that
describes what the document *is* flows from a single place — `lib/documentVoice.ts`
— precisely so the surfaces cannot drift apart and start making a promise the
product can't stand behind. If a change touches that language, keep it honest and
keep it centralised. This isn't a style preference; it's the claim that carries
real legal exposure.

## Getting set up

```bash
git clone https://github.com/viduthalai/visa-itinerary.git
cd visa-itinerary
npm install
npm run dev          # http://localhost:3000
```

The app runs immediately with clearly-labelled sample flight data. Live search is
optional — see [Configuration](./README.md#configuration) for the free
`TRAVELPAYOUTS_TOKEN`.

## Before you open a pull request

Run the same gate CI will run:

```bash
npm run typecheck    # tsc --noEmit, strict
npm test             # vitest, once
npm run build        # production build must succeed
```

All three must pass. If your change adds logic, add a test for it — the `lib/`
directory is pure and well-covered, and that's where new logic belongs. Prefer a
failing test that your change makes pass.

### Conventions worth matching

- **TypeScript, strict.** No `any` escapes; model the types.
- **Logic in `lib/`, UI in `components/`.** Keep components thin; put anything
  testable (dates, timezones, the itinerary model) in `lib/` where it can be unit
  tested without a DOM.
- **Don't duplicate a source of truth.** If two surfaces must agree — copy, a
  gate and its warning, a schema and what it mirrors — read them from one
  constant. `lib/seo.ts`, `lib/content.ts`, and `lib/documentVoice.ts` all exist
  for exactly this reason.
- **Accessibility is part of "done."** Preserve keyboard reachability, live-region
  announcements, and WCAG-AA contrast. Measure contrast rather than eyeballing it.
- **The preview is the PDF.** There is one itinerary template. Don't add a second
  render path that can drift from what prints.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <imperative subject, ≤50 chars>

<body — what changed and why, wrapped at 72>
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`.
Example: `fix: recompute arrival in the destination timezone, not the origin's`.

## Reporting bugs and requesting features

Open an issue using the templates — a
[bug report](./.github/ISSUE_TEMPLATE/bug_report.yml) or a
[feature request](./.github/ISSUE_TEMPLATE/feature_request.yml). For anything
touching timezones, please include the exact route and dates: those bugs are
almost always specific to a particular origin/destination/date shape.

## Pull request checklist

The [PR template](./.github/PULL_REQUEST_TEMPLATE.md) has the full list, but in
short: describe the change and why, confirm `typecheck` / `test` / `build` pass,
add tests for new logic, and confirm the honest-document premise is intact.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](./LICENSE) that covers this project.
