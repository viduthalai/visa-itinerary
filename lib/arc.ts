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

/**
 * The aircraft silhouette that rides the arc. Nose-up, centred on (0,0), and exactly
 * mirror-symmetric about x = 0.
 *
 * It is here rather than inline in the component so its symmetry can be ASSERTED. The
 * glyph it replaces was malformed in a way no amount of checking its position could
 * catch: the right wing root sat at x=3 and the left at x=-5, the right tailplane at
 * x=5 and the left at x=-7, so the entire left half was displaced 2 units outward and
 * the fuselage centreline landed at x=-1 instead of 0. Measured: 15 of its 16 points
 * had no mirror partner. Rotating a lopsided shape about its bounding-box centre —
 * which is not its fuselage — is what made it read as broken however correctly it was
 * placed on the curve.
 *
 * Points, nose first, clockwise: nose, right shoulder, right wingtip (leading then
 * trailing), right wing root, rear fuselage, right tailplane, tail centre, then the
 * mirror of all of it.
 */
export const AIRCRAFT_GLYPH_D = [
  "M0 -14",
  "L2.5 -5",
  "L14 2",
  "L14 4.5",
  "L2.5 3.5",
  "L2 9.5",
  "L6 13",
  "L6 14.5",
  "L0 12.5",
  "L-6 14.5",
  "L-6 13",
  "L-2 9.5",
  "L-2.5 3.5",
  "L-14 4.5",
  "L-14 2",
  "L-2.5 -5",
  "Z",
].join(" ");

/**
 * Extract the vertices of a straight-edged path (`M`/`L` only, absolute).
 *
 * Exists so the glyph above can be checked rather than trusted. Returns null if the
 * path contains curves, relative commands or an odd number of coordinates, because a
 * parser that quietly half-understands a path is how a broken shape passes a test.
 */
export function polygonPoints(d: string): Point[] | null {
  // Whitelist, not blacklist. The first attempt stripped `MLZ` and then tested a
  // LOWERCASE character class, so an uppercase `C` passed straight through and a cubic
  // parsed as a polygon — the exact "quietly half-understands a path" failure this
  // guard exists to prevent, and it took a test to notice.
  const letters = d.match(/[a-zA-Z]/g) ?? [];
  if (letters.some((c) => !"MLZ".includes(c))) return null;
  const nums = d.match(/-?\d*\.?\d+/g);
  if (!nums || nums.length < 6 || nums.length % 2 !== 0) return null;
  const values = nums.map(Number);
  if (values.some((n) => !Number.isFinite(n))) return null;
  const pts: Point[] = [];
  for (let i = 0; i < values.length; i += 2) pts.push({ x: values[i], y: values[i + 1] });
  return pts;
}

/**
 * Every off-axis vertex that has no partner at (-x, y). Empty means the shape is truly
 * mirror-symmetric — the property the previous glyph lacked entirely.
 */
export function mirrorViolations(pts: Point[], epsilon = 0.001): Point[] {
  return pts.filter(
    (p) =>
      Math.abs(p.x) > epsilon &&
      !pts.some((q) => Math.abs(q.x + p.x) < epsilon && Math.abs(q.y - p.y) < epsilon),
  );
}
