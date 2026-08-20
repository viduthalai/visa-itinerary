/**
 * Build step 1 — bundle airport reference data.
 *
 * Downloads OurAirports (public domain) and produces a trimmed JSON file the app
 * ships with. Raw OurAirports is ~85k rows including heliports, closed fields and
 * airstrips with no IATA code — far too large to load in a browser and mostly
 * useless for an itinerary. We keep only rows that have an IATA code and are a
 * large_ or medium_ airport, which is roughly 4-9k rows.
 *
 * Timezone is NOT taken from OpenFlights (that dataset has no update process and
 * an unconfirmed snapshot date). Instead we derive the IANA zone from the
 * airport's coordinates with tz-lookup, and let Intl handle DST at render time.
 *
 * Run: npm run data:airports
 * Output: data/airports.json  (committed, so the app has no build-time network need)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tzlookup from "tz-lookup";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "data", "airports.json");
const SRC = "https://davidmegginson.github.io/ourairports-data/airports.csv";

const KEEP_TYPES = new Set(["large_airport", "medium_airport"]);

/** Minimal RFC4180-ish CSV row parser — OurAirports quotes fields containing commas. */
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
  if (!res.ok) throw new Error(`OurAirports fetch failed: HTTP ${res.status}`);
  const csv = await res.text();

  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  const header = parseCsvLine(lines[0]);
  const col = (name) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`OurAirports schema changed: no "${name}" column`);
    return i;
  };

  const iIata = col("iata_code");
  const iType = col("type");
  const iName = col("name");
  const iMuni = col("municipality");
  const iIso = col("iso_country");
  const iLat = col("latitude_deg");
  const iLon = col("longitude_deg");
  const iIcao = col("ident");

  const airports = [];
  let skippedNoTz = 0;

  for (let n = 1; n < lines.length; n++) {
    const r = parseCsvLine(lines[n]);
    const iata = r[iIata]?.trim().toUpperCase();
    if (!iata || iata.length !== 3) continue;
    if (!KEEP_TYPES.has(r[iType])) continue;

    const lat = Number(r[iLat]);
    const lon = Number(r[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    let tz;
    try {
      tz = tzlookup(lat, lon);
    } catch {
      skippedNoTz++;
      continue; // no zone means we cannot compute a correct local time — drop it
    }

    airports.push({
      iata,
      icao: r[iIcao]?.trim() || null,
      name: r[iName]?.trim(),
      city: r[iMuni]?.trim() || null,
      country: r[iIso]?.trim(),
      tz,
      lat,
      lon,
    });
  }

  airports.sort((a, b) => a.iata.localeCompare(b.iata));

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(airports));

  const kb = Math.round(Buffer.byteLength(JSON.stringify(airports)) / 1024);
  process.stdout.write(
    `Wrote ${airports.length} airports to data/airports.json (${kb} KB)\n` +
      `Source rows: ${lines.length - 1}. Dropped for missing timezone: ${skippedNoTz}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
