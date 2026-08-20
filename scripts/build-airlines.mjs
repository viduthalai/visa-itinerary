/**
 * Build airline reference data: IATA code -> airline name.
 *
 * Source is OpenFlights `airlines.dat`, which is a snapshot with no ongoing
 * update process. That was a good reason to reject it for ROUTES (carriers drop
 * routes constantly) and for TIMEZONES (a wrong zone is silently wrong). It is
 * not a good reason to reject it for NAMES: an IATA carrier code maps to the
 * same airline for decades. LH has been Lufthansa since the code existed.
 *
 * Only rows marked active with a 2-character IATA code are kept.
 *
 * Run: npm run data:airlines
 * Output: data/airlines.json (committed)
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "data", "airlines.json");
const SRC =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat";

/** airlines.dat is quoted CSV: id,name,alias,iata,icao,callsign,country,active */
function parseCsvLine(line) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

async function main() {
  process.stdout.write(`Fetching ${SRC}\n`);
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`OpenFlights fetch failed: HTTP ${res.status}`);
  const text = await res.text();

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  /** @type {Record<string,string>} */
  const byIata = {};
  let considered = 0;

  for (const line of lines) {
    const r = parseCsvLine(line);
    if (r.length < 8) continue;

    const name = r[1]?.trim();
    const iata = r[3]?.trim().toUpperCase();
    const active = r[7]?.trim().toUpperCase() === "Y";

    if (!active) continue;
    if (!iata || iata.length !== 2 || iata === "\\N" || iata === "-") continue;
    if (!name || name === "\\N" || name.toLowerCase().includes("unknown")) continue;

    considered++;
    // First active row wins. The file is roughly id-ordered and legacy duplicates
    // trail the primary carrier, so this keeps the better-known name.
    if (!byIata[iata]) byIata[iata] = name;
  }

  const sorted = Object.fromEntries(Object.entries(byIata).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify(sorted));

  const kb = Math.round(Buffer.byteLength(JSON.stringify(sorted)) / 1024);
  process.stdout.write(
    `Wrote ${Object.keys(sorted).length} airlines to data/airlines.json (${kb} KB)\n` +
      `Source rows: ${lines.length}. Active rows with an IATA code: ${considered}\n` +
      `Spot check: LH=${sorted.LH} UA=${sorted.UA} DE=${sorted.DE} BA=${sorted.BA}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
