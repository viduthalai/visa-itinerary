import airlinesRaw from "@/data/airlines.json";

/**
 * IATA carrier code -> airline name, built from OpenFlights (see
 * scripts/build-airlines.mjs for why a stale snapshot is acceptable for names
 * but was rejected for routes and timezones).
 */
export const AIRLINES = airlinesRaw as Record<string, string>;

export function airlineName(code: string | null | undefined): string | null {
  if (!code) return null;
  return AIRLINES[code.trim().toUpperCase()] ?? null;
}

/** `Lufthansa (LH)`, or just the code when the name is unknown. */
export function formatAirline(code: string | null | undefined): string {
  if (!code) return "";
  const c = code.trim().toUpperCase();
  const name = AIRLINES[c];
  return name ? `${name} (${c})` : c;
}
