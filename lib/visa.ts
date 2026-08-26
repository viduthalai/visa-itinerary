import { countryName } from "@/lib/countries";

/**
 * Passport visa-requirement lookup, backed by the bundled data/visa.json (built by
 * scripts/build-visa.mjs from imorte/passport-index-data, MIT).
 *
 * This is a HELPER, not a claim the itinerary document makes. It answers "for this
 * passport, going to this country, what does entry take?" as a pre-check. It is a
 * community dataset, updated periodically and not authoritative — the UI says so,
 * and nothing here is ever printed onto the generated document.
 *
 * The data file is loaded lazily (see loadVisaData) so its ~390 KB is a separate
 * chunk fetched only when the visa panel is opened, never in the initial bundle.
 */

/** The closed status vocabulary. Inverse of CODE_BY_STATUS in scripts/build-visa.mjs. */
export const STATUS_BY_CODE = {
  F: "visa free",
  A: "visa on arrival",
  E: "eta",
  V: "e-visa",
  R: "visa required",
  X: "no admission",
} as const;

export type VisaCode = keyof typeof STATUS_BY_CODE;
export type VisaStatus = (typeof STATUS_BY_CODE)[VisaCode];

/**
 * Tone drives the result's colour, and it is deliberately three-way rather than
 * per-status: the app has no green token, and a six-colour legend on a monochrome
 * shell is noise. "ok" = nothing to arrange, "notice" = arrange something (at the
 * border or online), "alert" = a full visa or a closed door.
 */
export type VisaTone = "ok" | "notice" | "alert";

export type VisaRequirement = {
  code: VisaCode;
  status: VisaStatus;
  /** Short chip label, e.g. "Visa-free", "e-Visa". */
  label: string;
  /** One-line plain-English explanation for the result body. */
  detail: string;
  /** Permitted stay in days when the dataset gives one, else null. */
  days: number | null;
  tone: VisaTone;
};

const PRESENTATION: Record<VisaCode, { label: string; tone: VisaTone; detail: string }> = {
  F: { label: "Visa-free", tone: "ok", detail: "No visa needed before you travel." },
  A: {
    label: "Visa on arrival",
    tone: "notice",
    detail: "A visa is issued at the border on arrival — nothing to arrange beforehand.",
  },
  E: {
    label: "eTA",
    tone: "notice",
    detail: "An electronic travel authorization is required before you travel.",
  },
  V: {
    label: "e-Visa",
    tone: "notice",
    detail: "An e-Visa must be obtained online before you travel.",
  },
  R: {
    label: "Visa required",
    tone: "alert",
    detail: "A visa must be arranged before you travel.",
  },
  X: {
    label: "No admission",
    tone: "alert",
    detail: "Entry is not permitted on this passport.",
  },
};

/** data/visa.json shape. */
export type VisaData = {
  meta: {
    source: string;
    sourceUrl: string;
    license: string;
    built: string;
    statusCodes: Record<string, string>;
  };
  /** matrix[PASSPORT_ISO2][DESTINATION_ISO2] = code + optional day count, e.g. "F180". */
  matrix: Record<string, Record<string, string>>;
};

/**
 * Split a stored cell into its status code and day count. A cell is one status
 * letter optionally followed by an integer: "F180" -> { code: "F", days: 180 },
 * "R" -> { code: "R", days: null }. Returns null for an unknown leading code so a
 * corrupt or future value degrades to "no data" rather than throwing in render.
 */
export function decodeCell(cell: string | undefined): { code: VisaCode; days: number | null } | null {
  if (!cell) return null;
  const code = cell[0] as VisaCode;
  if (!(code in STATUS_BY_CODE)) return null;
  const rest = cell.slice(1);
  const days = rest.length > 0 && Number.isFinite(Number(rest)) ? Number(rest) : null;
  return { code, days };
}

/** Build the full requirement object from a decoded cell. */
function toRequirement(code: VisaCode, days: number | null): VisaRequirement {
  const p = PRESENTATION[code];
  return { code, status: STATUS_BY_CODE[code], label: p.label, detail: p.detail, days, tone: p.tone };
}

/**
 * Requirement for `from` passport entering `to` country (both ISO 3166-1 alpha-2).
 *
 * Same-country is handled explicitly — the dataset omits the diagonal, and "your
 * own country" is the one answer a lookup should never come back empty on.
 * Returns null when the pair is genuinely absent, so the caller shows "no data"
 * rather than a wrong default.
 */
export function lookupVisa(
  data: VisaData,
  fromIso2: string | null | undefined,
  toIso2: string | null | undefined,
): VisaRequirement | null {
  const from = fromIso2?.trim().toUpperCase();
  const to = toIso2?.trim().toUpperCase();
  if (!from || !to) return null;
  if (from === to) {
    return {
      code: "F",
      status: "visa free",
      label: "Home country",
      detail: "This is the passport's own country — no visa needed.",
      days: null,
      tone: "ok",
    };
  }
  const decoded = decodeCell(data.matrix[from]?.[to]);
  return decoded ? toRequirement(decoded.code, decoded.days) : null;
}

/** Passport/destination options: every country in the matrix, named and sorted. */
export function visaCountries(data: VisaData): { iso2: string; name: string }[] {
  return Object.keys(data.matrix)
    .map((iso2) => ({ iso2, name: countryName(iso2) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** True when the matrix can offer this destination (so the UI can guard a default). */
export function hasCountry(data: VisaData, iso2: string | null | undefined): boolean {
  if (!iso2) return false;
  return iso2.trim().toUpperCase() in data.matrix;
}

/*
 * Lazy, cached load of the bundled data. import() makes data/visa.json its own
 * chunk, so the ~390 KB is fetched the first time the visa panel mounts and never
 * in the initial page bundle. The promise is memoised so remounts reuse it.
 */
let cache: Promise<VisaData> | null = null;
export function loadVisaData(): Promise<VisaData> {
  cache ??= import("@/data/visa.json").then((m) => m.default as unknown as VisaData);
  return cache;
}
