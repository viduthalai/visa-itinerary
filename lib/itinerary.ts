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

export type Itinerary = {
  /** 5 digits, generated once so re-rendering the document keeps the same value. */
  pnr: string;
  /** 13-digit document number, generated once. Cosmetic — resolves nowhere. */
  ticketNumber: string;
  /** ISO string, set on the client at mount — see app/page.tsx. */
  generatedAt: string;
  passengers: Passenger[];
  segments: Segment[];
};

let seq = 0;
function nextId(): string {
  seq += 1;
  return `seg-${seq}`;
}

export function emptySegment(): Segment {
  return {
    id: nextId(),
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

export function emptyPassenger(): Passenger {
  seq += 1;
  return { id: `pax-${seq}`, title: "", givenNames: "", surname: "" };
}

/** `MR JOHN SMITH` — surname last, uppercase, the way travel documents print it. */
export function formatPassenger(p: Passenger): string {
  return [p.title, p.givenNames, p.surname]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

/** 5 numeric digits, 10000-99999. No leading zero. */
export function generatePnr(): string {
  return String(10000 + Math.floor(Math.random() * 90000));
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
    passengers: [emptyPassenger()],
    segments: [emptySegment()],
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
