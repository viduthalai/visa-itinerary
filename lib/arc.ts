/**
 * Quadratic-bezier geometry for the hero route arc.
 *
 * This exists because the aircraft glyph was placed by eye and was wrong in both
 * respects: 34.6 units off the curve, and rotated 28° where the tangent needed 64°,
 * so it floated above the route pointing across it rather than along it.
 *
 * Hardcoding the corrected numbers would have fixed this instance and kept the bug —
 * the moment anyone nudges the curve, the plane silently detaches again. Deriving both
 * from the path data means the curve is the single source of truth, the same reason
 * the reveal mask reads its `d` from one shared constant.
 *
 * Closed-form rather than `getPointAtLength`: that needs a live SVG element, which
 * would push this into an effect and reintroduce a server/client split for something
 * fully determined by four numbers.
 */

export type Point = { x: number; y: number };
export type Quadratic = { p0: Point; c: Point; p1: Point };

/**
 * Parse `M x0 y0 Q cx cy x1 y1` — the one path shape the hero uses. Returns null for
 * anything else rather than guessing, so a future cubic fails at the call site instead
 * of rendering a plane at NaN.
 */
export function parseQuadratic(d: string): Quadratic | null {
  const m = d
    .trim()
    .match(
      /^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*Q\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)$/i,
    );
  if (!m) return null;
  const [x0, y0, cx, cy, x1, y1] = m.slice(1, 7).map(Number);
  if ([x0, y0, cx, cy, x1, y1].some((n) => !Number.isFinite(n))) return null;
  return { p0: { x: x0, y: y0 }, c: { x: cx, y: cy }, p1: { x: x1, y: y1 } };
}

/** Point at parameter `t` (0 = start, 1 = end): (1-t)²P₀ + 2(1-t)tC + t²P₁. */
export function quadPointAt(q: Quadratic, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * q.p0.x + 2 * u * t * q.c.x + t * t * q.p1.x,
    y: u * u * q.p0.y + 2 * u * t * q.c.y + t * t * q.p1.y,
  };
}

/**
 * Heading of the curve at `t`, in degrees, measured the SVG way — clockwise from the
 * positive x-axis, because y grows downward. Derivative: 2(1-t)(C-P₀) + 2t(P₁-C).
 */
export function quadTangentDeg(q: Quadratic, t: number): number {
  const u = 1 - t;
  const dx = 2 * u * (q.c.x - q.p0.x) + 2 * t * (q.p1.x - q.c.x);
  const dy = 2 * u * (q.c.y - q.p0.y) + 2 * t * (q.p1.y - q.c.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Rotation for a glyph drawn NOSE-UP (pointing toward -y in its own space) so that it
 * faces along the curve. The +90 converts "up" to "along +x", and it is precisely the
 * term the original hand-placed transform was missing.
 */
export function noseUpRotationDeg(q: Quadratic, t: number): number {
  return quadTangentDeg(q, t) + 90;
}
