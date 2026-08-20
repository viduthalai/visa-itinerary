import { getAirport } from "@/lib/airports";
import { arrivesNextDay, elapsedMinutes, type WallTime } from "@/lib/duration";

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

/**
 * Starts with an EMPTY pnr and generatedAt on purpose. Both are non-deterministic
 * (random / clock), so producing them during render makes the server and client
 * HTML disagree and trips a hydration mismatch. The page fills both in a mount
 * effect — see app/page.tsx.
 */
export function newItinerary(): Itinerary {
  return { pnr: "", generatedAt: "", passengers: [], segments: [emptySegment()] };
}

export type SegmentDerived = {
  durationMinutes: number | null;
  nextDay: boolean;
  originTz: string | null;
  destinationTz: string | null;
};

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
