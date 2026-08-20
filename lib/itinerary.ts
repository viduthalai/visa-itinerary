import { getAirport } from "@/lib/airports";
import { arrivesNextDay, elapsedMinutes, shiftWallTime, type WallTime } from "@/lib/duration";

export type Segment = {
  id: string;
  originIata: string | null;
  destinationIata: string | null;
  depart: WallTime;
  arrive: WallTime;
  /** IATA carrier code, e.g. `LH`. The display name is looked up from it. */
  airlineCode: string;
  /** e.g. `LH411`. */
  flightNumber: string;
  /** Document detail fields — free text, all optional. */
  departTerminal: string;
  arriveTerminal: string;
  cabinClass: string;
  fareBasis: string;
  baggage: string;
  /**
   * Left blank by default on purpose. "Confirmed" is a factual claim about a
   * booking, so the app does not assert it — the user sets it if they want it.
   */
  seatStatus: string;
};

export type Passenger = {
  id: string;
  title: string;
  givenNames: string;
  surname: string;
};

/**
 * Fare information block. Every field is USER-ENTERED and every one defaults to
 * empty — nothing here is generated.
 *
 * That is a deliberate difference from the pnr and ticketNumber, which the app
 * does invent. A fare is a monetary amount and a fare-calculation string is a
 * priced construction; manufacturing either means the document states a price
 * that was never quoted and a payment that never happened. The app will render
 * whatever is typed and will not produce a number on its own.
 *
 * The whole block is hidden when every field is blank, so a document with no
 * fare information has no empty fare section rather than a row of dashes.
 */
export type Fare = {
  /** Base fare, e.g. `INR35365`. Free text so any currency notation works. */
  base: string;
  equivalent: string;
  /** Taxes / fees / charges. Multi-line free text — real ones are itemised. */
  taxes: string;
  total: string;
  formOfPayment: string;
  /** GDS fare-construction line. Long, monospace-ish, wraps. */
  calculation: string;
  additionalInfo: string;
};

export function emptyFare(): Fare {
  return {
    base: "",
    equivalent: "",
    taxes: "",
    total: "",
    formOfPayment: "",
    calculation: "",
    additionalInfo: "",
  };
}

/** True when at least one fare field has content — drives whether the block renders. */
export function hasFare(f: Fare): boolean {
  return Object.values(f).some((v) => v.trim().length > 0);
}

export type Itinerary = {
  /** 5 digits, generated once so re-rendering the document keeps the same value. */
  pnr: string;
  /** 13-digit document number, generated once. Cosmetic — resolves nowhere. */
  ticketNumber: string;
  /** ISO string, set on the client at mount — see app/page.tsx. */
  generatedAt: string;
  passengers: Passenger[];
  segments: Segment[];
  /** Optional, user-entered. See the Fare type — nothing here is generated. */
  fare: Fare;
};

/*
 * Ids for rows the USER adds. Deliberately not used for the initial row.
 *
 * A module-scoped counter is non-deterministic across a server/client boundary:
 * `newItinerary()` runs once during SSR and again in the browser's `useState`
 * initializer, so the first segment was `seg-1` on the server and a different
 * value on the client. That is the same class of hazard as `Math.random()` — the
 * one React's hydration error names explicitly.
 *
 * Those ids only become React keys today, not DOM attributes, so they were not
 * the cause of any reported mismatch. Fixing it anyway: "currently invisible
 * nondeterminism in the initial render" is a bug waiting for the first id that
 * does reach the DOM.
 */
let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-added-${seq}`;
}

/** The initial segment/passenger use FIXED ids — identical on server and client. */
const INITIAL_SEGMENT_ID = "seg-initial";
const INITIAL_PASSENGER_ID = "pax-initial";

export function emptySegment(id: string = nextId("seg")): Segment {
  return {
    id,
    originIata: null,
    destinationIata: null,
    depart: { date: "", time: "" },
    arrive: { date: "", time: "" },
    airlineCode: "",
    flightNumber: "",
    departTerminal: "",
    arriveTerminal: "",
    cabinClass: "Economy",
    fareBasis: "",
    baggage: "",
    seatStatus: "",
  };
}

export function emptyPassenger(id: string = nextId("pax")): Passenger {
  return { id, title: "", givenNames: "", surname: "" };
}

/** `MR JOHN SMITH` — surname last, uppercase, the way travel documents print it. */
export function formatPassenger(p: Passenger): string {
  return [p.title, p.givenNames, p.surname]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

/**
 * 6 characters, uppercase alphanumeric — the real record-locator shape. Vidu's
 * call 2026-08-20 (reversing the earlier 5-digit decision).
 *
 * `I` and `O` are excluded from the alphabet: every GDS omits them because they
 * are indistinguishable from `1` and `0` in the fonts these documents get printed
 * and faxed in, and a locator that cannot be read back reliably is worse than no
 * locator. At least two letters are guaranteed, because an all-numeric string
 * would not read as a locator at all.
 *
 * Reference shapes captured earlier: PQ7XNR, 3EK527, J1MUKK, ZYQB40.
 */
const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"; // no I, no O
const PNR_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generatePnr(): string {
  const pick = (from: string) => from[Math.floor(Math.random() * from.length)];
  const chars = Array.from({ length: 6 }, () => pick(PNR_ALPHABET));

  // Guarantee two letters without biasing which positions they land in.
  const letterCount = chars.filter((c) => PNR_LETTERS.includes(c)).length;
  for (let need = 2 - letterCount; need > 0; need--) {
    let at = Math.floor(Math.random() * 6);
    while (PNR_LETTERS.includes(chars[at])) at = (at + 1) % 6;
    chars[at] = pick(PNR_LETTERS);
  }
  return chars.join("");
}

/** 13 digits, rendered `NNN NNNNNNNNNN`. Cosmetic only — resolves nowhere. */
export function generateTicketNumber(): string {
  let s = "";
  for (let i = 0; i < 13; i++) s += Math.floor(Math.random() * 10);
  return s.replace(/^(\d{3})(\d{10})$/, "$1 $2");
}

/**
 * Starts with an EMPTY pnr, ticketNumber and generatedAt on purpose. All three are
 * non-deterministic (random / clock), so producing them during render makes the
 * server and client HTML disagree and trips a hydration mismatch. The page fills
 * them in a mount effect — see app/page.tsx.
 */
export function newItinerary(): Itinerary {
  return {
    pnr: "",
    ticketNumber: "",
    generatedAt: "",
    // Fixed ids: newItinerary() runs on BOTH the server and the client, so the
    // initial tree must not depend on a counter.
    passengers: [emptyPassenger(INITIAL_PASSENGER_ID)],
    segments: [emptySegment(INITIAL_SEGMENT_ID)],
    fare: emptyFare(),
  };
}

/** Passenger-level checks. Non-blocking, same as the flight warnings. */
export function passengerWarnings(passengers: Passenger[]): Warning[] {
  const out: Warning[] = [];

  const named = passengers.filter((p) => p.surname.trim() || p.givenNames.trim());
  if (named.length === 0) {
    out.push({ segmentId: null, text: "No passenger name entered." });
  }

  passengers.forEach((p, i) => {
    const hasSomething = p.surname.trim() || p.givenNames.trim();
    if (hasSomething && !p.surname.trim()) {
      out.push({ segmentId: null, text: `Passenger ${i + 1} has no surname.` });
    }
    if (hasSomething && !p.givenNames.trim()) {
      out.push({ segmentId: null, text: `Passenger ${i + 1} has no given names.` });
    }
  });

  // Identity is given names + surname. Title is NOT part of it — "MR JOHN SMITH"
  // and "JOHN SMITH" are the same person entered twice, which is exactly the
  // mistake worth catching. (Found in the browser; the unit test originally used
  // identical titles and so never exercised this.)
  const key = (p: Passenger) =>
    `${p.givenNames.trim().toUpperCase()}|${p.surname.trim().toUpperCase()}`;

  const keys = named.map(key);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  for (const d of new Set(dupes)) {
    const label = d.split("|").filter(Boolean).join(" ");
    out.push({ segmentId: null, text: `Two passengers have the same name (${label}).` });
  }

  return out;
}

export type SegmentDerived = {
  durationMinutes: number | null;
  nextDay: boolean;
  originTz: string | null;
  destinationTz: string | null;
  /**
   * Guidance only: departure minus CHECK_IN_LEAD_MINUTES, in the origin's local
   * wall clock. Derived, never entered — so it cannot contradict the departure
   * time the way a free-text field would.
   */
  checkIn: WallTime | null;
};

/** Common international check-in lead. Named so the document and the timing band agree. */
export const CHECK_IN_LEAD_MINUTES = 180;

export function deriveSegment(s: Segment): SegmentDerived {
  const origin = getAirport(s.originIata);
  const destination = getAirport(s.destinationIata);

  const durationMinutes =
    origin && destination
      ? elapsedMinutes(s.depart, origin.tz, s.arrive, destination.tz)
      : null;

  return {
    durationMinutes,
    nextDay: Boolean(s.depart.date && s.arrive.date) && arrivesNextDay(s.depart, s.arrive),
    originTz: origin?.tz ?? null,
    destinationTz: destination?.tz ?? null,
    checkIn: shiftWallTime(s.depart, -CHECK_IN_LEAD_MINUTES),
  };
}

export type Warning = { segmentId: string | null; text: string };

/**
 * Non-blocking checks. These exist to catch the shapes a consular officer would
 * notice — a leg that arrives before it departs, an impossible duration, a
 * journey that teleports between airports. They never prevent generating a
 * document and they never appear on the document itself.
 */
export function warningsFor(segments: Segment[]): Warning[] {
  const out: Warning[] = [];

  segments.forEach((s, i) => {
    const d = deriveSegment(s);

    if (d.durationMinutes !== null) {
      if (d.durationMinutes < 0) {
        out.push({ segmentId: s.id, text: "Arrives before it departs." });
      } else if (d.durationMinutes < 20) {
        out.push({ segmentId: s.id, text: "Under 20 minutes — check the times and timezones." });
      } else if (d.durationMinutes > 24 * 60) {
        out.push({ segmentId: s.id, text: "Over 24 hours for a single flight." });
      }
    }

    if (s.originIata && s.originIata === s.destinationIata) {
      out.push({ segmentId: s.id, text: "Origin and destination are the same airport." });
    }

    const prev = segments[i - 1];
    if (prev?.destinationIata && s.originIata && prev.destinationIata !== s.originIata) {
      out.push({
        segmentId: s.id,
        text: `Starts at ${s.originIata} but the previous flight landed at ${prev.destinationIata}.`,
      });
    }

    if (prev?.arrive.date && s.depart.date) {
      const prevKey = `${prev.arrive.date}T${prev.arrive.time || "00:00"}`;
      const thisKey = `${s.depart.date}T${s.depart.time || "00:00"}`;
      if (thisKey < prevKey) {
        out.push({ segmentId: s.id, text: "Departs before the previous flight arrives." });
      }
    }
  });

  return out;
}
