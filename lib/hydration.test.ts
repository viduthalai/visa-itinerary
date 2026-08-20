import { describe, expect, it } from "vitest";
import { emptyPassenger, emptySegment, newItinerary } from "@/lib/itinerary";

/**
 * `newItinerary()` is a `useState` initializer, so it runs once during SSR and
 * again in the browser. Anything it produces that differs between those two calls
 * is a hydration mismatch waiting to happen — the ids used to come from a
 * module-scoped counter and did exactly that.
 *
 * `pnr`, `ticketNumber` and `generatedAt` are the deliberate exception: they are
 * random/clock-based, so they start EMPTY and are filled in a mount effect. The
 * test asserts that too, because moving them into the initializer would look
 * harmless and reintroduce the original hydration bug.
 */
describe("newItinerary determinism (SSR/CSR safety)", () => {
  it("produces identical output on repeated calls", () => {
    expect(JSON.stringify(newItinerary())).toBe(JSON.stringify(newItinerary()));
  });

  it("gives the initial segment and passenger stable ids", () => {
    const a = newItinerary();
    const b = newItinerary();
    expect(a.segments[0].id).toBe(b.segments[0].id);
    expect(a.passengers[0].id).toBe(b.passengers[0].id);
  });

  it("leaves the non-deterministic fields empty for the mount effect to fill", () => {
    const it0 = newItinerary();
    expect(it0.pnr).toBe("");
    expect(it0.ticketNumber).toBe("");
    expect(it0.generatedAt).toBe("");
  });

  it("still gives user-added rows unique ids", () => {
    const ids = [emptyPassenger().id, emptyPassenger().id, emptySegment().id, emptySegment().id];
    expect(new Set(ids).size).toBe(4);
  });

  it("keeps added-row ids distinct from the initial ones", () => {
    const initial = newItinerary();
    expect(emptyPassenger().id).not.toBe(initial.passengers[0].id);
    expect(emptySegment().id).not.toBe(initial.segments[0].id);
  });
});
