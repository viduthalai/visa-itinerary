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

/**
 * Whole calendar days from `startDate` to `endDate` (both `YYYY-MM-DD`), used to
 * estimate how long a round trip keeps a traveller in the destination so the
 * overstay guard can weigh it against a visa-free day cap.
 *
 * Returns null when either date is malformed or `endDate` is not strictly after
 * `startDate`: a one-way or open-jaw trip has no computable stay, and the guard
 * stays silent rather than guess. Parsed at UTC midnight so it is a pure
 * calendar-day span, immune to DST — 2026-10-01 → 2026-10-10 is 9.
 *
 * This is the trip SPAN (outbound departure → return departure). It over-counts
 * actual in-country presence by at most the outbound travel day, which is the
 * safe direction for a guard to err: warn slightly early, never miss.
 */
export function stayLengthDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): number | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!startDate || !endDate || !iso.test(startDate) || !iso.test(endDate)) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round((end - start) / 86_400_000);
}

export type StayAssessment = {
  /** Estimated length of stay in days (the trip span). */
  stayDays: number;
  /** Days the requirement permits. */
  allowedDays: number;
  /** stayDays − allowedDays; positive when the trip runs past the limit. */
  overBy: number;
  /** True when the trip exceeds the permitted stay. */
  exceeds: boolean;
};

/**
 * Weigh an intended stay against what a requirement permits.
 *
 * Returns null unless there is genuinely something to check: the requirement must
 * carry a day cap (`req.days`) AND the stay must be a known positive number. A
 * status the dataset gives no day count for — many "visa required" cells, or a
 * visa-free entry with no stated limit — yields no assessment rather than a false
 * all-clear. The comparison is status-agnostic: exceeding a visa-free, on-arrival
 * or e-visa allowance all matter, and the caller phrases the message.
 */
export function assessStay(
  req: VisaRequirement | null,
  stayDays: number | null,
): StayAssessment | null {
  if (!req || req.days === null || stayDays === null || stayDays <= 0) return null;
  const overBy = stayDays - req.days;
  return { stayDays, allowedDays: req.days, overBy, exceeds: overBy > 0 };
}

/*
 * Passport explorer: everywhere a single passport can go, grouped by status.
 *
 * This is the whole-row read that powers the /passport/[code] pages — the inverse
 * of lookupVisa's single-pair read. It runs SERVER-SIDE at build time (the pages
 * are statically generated), so it takes `data` as an argument rather than the
 * lazy client loader.
 */

/** Group order: easiest entry first, mirroring the ok → notice → alert tone ramp. */
const CODE_ORDER: VisaCode[] = ["F", "A", "E", "V", "R", "X"];

export type PassportDestination = {
  iso2: string;
  name: string;
  code: VisaCode;
  /** Permitted stay in days when the dataset gives one, else null. */
  days: number | null;
};

export type PassportGroup = {
  code: VisaCode;
  label: string;
  tone: VisaTone;
  /** Destinations in this status, sorted by country name. */
  destinations: PassportDestination[];
};

export type PassportProfile = {
  iso2: string;
  name: string;
  /** Non-empty groups only, in CODE_ORDER. */
  groups: PassportGroup[];
  counts: Record<VisaCode, number>;
  /** Total destinations the dataset has an entry for (the diagonal is omitted). */
  total: number;
  /** Destinations needing no visa arranged in advance: visa-free + visa-on-arrival. */
  noAdvanceVisa: number;
};

/**
 * Full destination profile for one passport (ISO 3166-1 alpha-2), or null when the
 * matrix has no such passport. Case-insensitive. The home country is naturally
 * absent because the dataset omits the diagonal.
 */
export function passportProfile(
  data: VisaData,
  iso2: string | null | undefined,
): PassportProfile | null {
  const code = iso2?.trim().toUpperCase();
  if (!code) return null;
  const row = data.matrix[code];
  if (!row) return null;

  const counts: Record<VisaCode, number> = { F: 0, A: 0, E: 0, V: 0, R: 0, X: 0 };
  const byCode: Record<VisaCode, PassportDestination[]> = { F: [], A: [], E: [], V: [], R: [], X: [] };

  for (const [dest, cell] of Object.entries(row)) {
    const decoded = decodeCell(cell);
    if (!decoded) continue;
    counts[decoded.code]++;
    byCode[decoded.code].push({ iso2: dest, name: countryName(dest), code: decoded.code, days: decoded.days });
  }

  const groups: PassportGroup[] = CODE_ORDER.filter((c) => byCode[c].length > 0).map((c) => ({
    code: c,
    label: PRESENTATION[c].label,
    tone: PRESENTATION[c].tone,
    destinations: byCode[c].sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { iso2: code, name: countryName(code), groups, counts, total, noAdvanceVisa: counts.F + counts.A };
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
