/**
 * Build step 3 — bundle passport visa-requirement data.
 *
 * Downloads the Passport Index dataset (imorte/passport-index-data, MIT) and
 * writes a compact JSON the app ships with, so the visa check runs entirely in the
 * browser with no key, no backend and no runtime network — the same premise as the
 * airport and airline bundles.
 *
 * SIZE. The raw file is a ~2.3 MB nested object where every cell is
 * `{"status":"visa free","days":180}` (~35 bytes). We re-encode each cell as a
 * single status letter plus an optional day count — `"F180"`, `"R"`, `"V30"` —
 * which is ~6x smaller and lands near airports.json. lib/visa.ts decodes it and
 * lazy-loads the file, so it is a separate chunk fetched only when the visa panel
 * is opened.
 *
 * The status vocabulary is CLOSED: an unrecognised status is a hard error, not a
 * silently dropped cell. If the upstream dataset adds a status, this build fails
 * loudly so lib/visa.ts is updated in lockstep rather than rendering a blank.
 *
 * Run: npm run data:visa
 * Output: data/visa.json  (committed, so the app has no build-time network need)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "data", "visa.json");
const SRC = "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index.json";

/*
 * status string -> single-letter code. This map is the contract between the build
 * and lib/visa.ts (STATUS_BY_CODE is its inverse). Keep the two in sync.
 */
const CODE_BY_STATUS = {
  "visa free": "F",
  "visa on arrival": "A",
  eta: "E",
  "e-visa": "V",
  "visa required": "R",
  "no admission": "X",
};

async function main() {
  process.stdout.write(`Fetching ${SRC}\n`);
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`Passport Index fetch failed: HTTP ${res.status}`);
  const raw = await res.json();

  const matrix = {};
  let cells = 0;
  const seenStatus = new Set();

  for (const passport of Object.keys(raw)) {
    const pp = passport.trim().toUpperCase();
    const dests = raw[passport];
    const row = {};

    for (const destination of Object.keys(dests)) {
      const dd = destination.trim().toUpperCase();
      const v = dests[destination];
      // The dataset stores {status, days?}. Older mirrors stored a bare string or
      // a number of days; accept both so a source swap does not break silently.
      const status = typeof v === "object" && v ? v.status : v;
      const daysRaw = typeof v === "object" && v ? v.days : undefined;

      seenStatus.add(status);
      const code = CODE_BY_STATUS[status];
      if (!code) {
        throw new Error(
          `Unknown visa status "${status}" for ${pp}->${dd}. ` +
            `Add it to CODE_BY_STATUS here AND STATUS_BY_CODE in lib/visa.ts.`,
        );
      }

      const days = Number.isFinite(Number(daysRaw)) ? Number(daysRaw) : null;
      row[dd] = days !== null ? `${code}${days}` : code;
      cells++;
    }

    matrix[pp] = row;
  }

  const out = {
    meta: {
      source: "imorte/passport-index-data",
      sourceUrl: "https://github.com/imorte/passport-index-data",
      license: "MIT",
      // The upstream dataset is dated in its README; this records when we pulled it.
      built: new Date().toISOString().slice(0, 10),
      statusCodes: CODE_BY_STATUS,
    },
    matrix,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));

  const kb = Math.round(Buffer.byteLength(JSON.stringify(out)) / 1024);
  process.stdout.write(
    `Wrote ${Object.keys(matrix).length} passports, ${cells} routes to data/visa.json (${kb} KB)\n` +
      `Statuses seen: ${[...seenStatus].sort().join(", ")}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
