import { describe, expect, it } from "vitest";
import { noseUpRotationDeg, parseQuadratic, quadPointAt, quadTangentDeg } from "./arc";

/** The hero's actual arc, so these tests fail if the curve changes shape. */
const ARC_D = "M118 176 Q210 34 302 118";

describe("parseQuadratic", () => {
  it("reads M/Q control points", () => {
    expect(parseQuadratic(ARC_D)).toEqual({
      p0: { x: 118, y: 176 },
      c: { x: 210, y: 34 },
      p1: { x: 302, y: 118 },
    });
  });

  it("accepts comma separators and extra whitespace", () => {
    expect(parseQuadratic(" M 0,0 Q 5,10  10,0 ")).toEqual({
      p0: { x: 0, y: 0 },
      c: { x: 5, y: 10 },
      p1: { x: 10, y: 0 },
    });
  });

  it("returns null rather than guessing at a shape it does not handle", () => {
    // A cubic must fail loudly: silently treating C as Q would place the aircraft
    // somewhere plausible-looking but wrong, which is the bug this module replaces.
    expect(parseQuadratic("M0 0 C1 1 2 2 3 3")).toBeNull();
    expect(parseQuadratic("M0 0 L10 10")).toBeNull();
    expect(parseQuadratic("")).toBeNull();
  });
});

describe("quadPointAt", () => {
  const q = parseQuadratic(ARC_D)!;

  it("hits the endpoints exactly at t=0 and t=1", () => {
    expect(quadPointAt(q, 0)).toEqual({ x: 118, y: 176 });
    expect(quadPointAt(q, 1)).toEqual({ x: 302, y: 118 });
  });

  it("puts the midpoint ON the curve, not at the control point", () => {
    // (P0 + 2C + P1)/4 — NOT the control point (210,34), which is the mistake that
    // put the aircraft 34.6 units above the route.
    expect(quadPointAt(q, 0.5)).toEqual({ x: 210, y: 90.5 });
  });
});

describe("quadTangentDeg", () => {
  const q = parseQuadratic(ARC_D)!;

  it("is the P0->P1 chord direction at the midpoint", () => {
    // For a quadratic the t=0.5 tangent is parallel to P1-P0 = (184,-58).
    expect(quadTangentDeg(q, 0.5)).toBeCloseTo(
      (Math.atan2(-58, 184) * 180) / Math.PI,
      6,
    );
  });

  it("climbs at the start and descends at the end of an arc", () => {
    // SVG y grows downward, so a negative angle is upward travel.
    expect(quadTangentDeg(q, 0)).toBeLessThan(0);
    expect(quadTangentDeg(q, 1)).toBeGreaterThan(0);
  });
});

describe("noseUpRotationDeg", () => {
  const q = parseQuadratic(ARC_D)!;

  it("adds the 90° the hand-placed transform was missing", () => {
    expect(noseUpRotationDeg(q, 0.5)).toBeCloseTo(quadTangentDeg(q, 0.5) + 90, 6);
  });

  it("resolves to ~72.5° at the apex, not the 28° that was there", () => {
    const r = noseUpRotationDeg(q, 0.5);
    expect(r).toBeGreaterThan(70);
    expect(r).toBeLessThan(75);
    expect(Math.abs(r - 28)).toBeGreaterThan(30); // the original error
  });

  it("keeps a symmetric arc's apex level", () => {
    // Apex tangent is horizontal, so a nose-up glyph turns exactly 90° to fly along it.
    const sym = parseQuadratic("M0 100 Q50 0 100 100")!;
    expect(noseUpRotationDeg(sym, 0.5)).toBeCloseTo(90, 6);
  });
});
