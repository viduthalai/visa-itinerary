import { noseUpRotationDeg, parseQuadratic, quadPointAt } from "@/lib/arc";

/**
 * Hero band.
 *
 * The "image" here is drawn, not downloaded: a great-circle flight arc over a dotted
 * globe grid, plus two CSS ambient light washes. That was a deliberate choice over a
 * stock travel photo — a photo needs a licence, adds a large download on the
 * critical path, and would be a generic airport shot that says nothing this tool
 * does. Vector art costs ~2KB inline, scales to any viewport, and is on-topic.
 *
 * `aria-hidden` on the whole illustration: it is decoration, and the headline beside
 * it already carries the meaning. Announcing it would just add noise.
 */
/**
 * The route curve, declared once. The visible dotted arc and the reveal mask must
 * trace the IDENTICAL path or the mask will clip the arc short, so they read from one
 * constant rather than two copies of a `d` string that would drift apart on the first
 * tweak to the curve.
 */
const ARC_D = "M118 176 Q210 34 302 118";

/*
 * The aircraft rides the curve at its parametric midpoint. Computed once at module
 * level: it is pure arithmetic over four constants, so it is identical on the server
 * and in the browser and cannot cause a hydration mismatch — unlike sampling the live
 * path with `getPointAtLength`, which would need an effect.
 *
 * The non-null assertion is safe and deliberate: ARC_D is a literal in this file, and
 * lib/arc.test.ts asserts it parses. If someone replaces it with a cubic, the parse
 * returns null and this throws at import — which is the correct outcome, since the
 * alternative is an aircraft silently rendered at NaN.
 */
const ARC = parseQuadratic(ARC_D)!;
const PLANE_T = 0.5;
const PLANE = quadPointAt(ARC, PLANE_T);
const PLANE_ROT = Math.round(noseUpRotationDeg(ARC, PLANE_T) * 10) / 10;

export function HeroBand({ reference }: { reference: string }) {
  return (
    <section className="ambient grid-texture relative isolate overflow-hidden border-b border-line bg-canvas">
      {/* Depth wash — keeps the band from reading as one flat block of colour. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0d1830] via-canvas to-canvas"
      />

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs font-medium text-ink-soft">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            Runs in your browser · no account
          </span>

          <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.08] text-ink sm:text-5xl">
            Build a travel itinerary
            <span className="block bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              that gets the times right
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
            Search a route, choose your flights, add passengers — then save a clean PDF.
            Every arrival is calculated in the destination airport&apos;s own timezone, so the
            document never prints a time that airport would not show.
          </p>

          <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
            <Stat value="4,565" label="airports" />
            <Stat value="992" label="carriers" />
            <Stat value={reference || "—"} label="your reference" mono />
          </dl>
        </div>

        <HeroArtwork />
      </div>
    </section>
  );
}

/**
 * The two hero objects, stacked.
 *
 * Before this there was exactly ONE illustration in the whole app — the 10-shape
 * flight arc — with everything else being 16px icons. That is why the page read as
 * sparse: not a shortage of photography, a shortage of a second focal object.
 *
 * The added object is deliberately an abstraction of the OUTPUT rather than more
 * travel imagery. For a generator, showing the artefact you get is the strongest
 * possible hero: it answers "what do I end up with" before any copy is read. It is
 * also honest — the proportions, the red title band and the leg/fare blocks are the
 * real document's, just below legibility.
 *
 * Still zero raster assets: no licence, no bytes on the critical path, no layout
 * shift, and it stays sharp at any DPR.
 */
function HeroArtwork() {
  return (
    <div aria-hidden className="relative hidden lg:block">
      {/* Behind and tilted — reads as the artefact the tool produces, sitting under it. */}
      <DocumentSilhouette />
      <FlightArc />
    </div>
  );
}

/**
 * Abstracted itinerary document. Rectangles standing in for text, at the real
 * document's proportions and palette — never readable, so it cannot be mistaken for a
 * specimen of the output or scraped as one.
 */
function DocumentSilhouette() {
  const line = (x: number, y: number, w: number, h = 4, fill = "#d9dce0") => (
    <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />
  );

  return (
    <div
      /* The right offset is responsive because it must not clip: at exactly 1024px —
         the narrow end of `lg`, where this first appears — a flat -24px pushed 17px
         past the hero's `overflow-hidden` edge. Flush until `xl`, peeking out only
         once there is room for it. */
      className="absolute right-0 -top-10 w-[230px] rotate-[7deg] overflow-hidden rounded-lg
                 bg-white shadow-[var(--shadow-paper)] ring-1 ring-black/10 xl:-right-6"
    >
      <svg viewBox="0 0 230 300" className="h-auto w-full">
        {/* Title band — the document's own #cb3333, sampled from the reference. */}
        <rect x="0" y="0" width="230" height="26" fill="#cb3333" />
        {line(12, 9, 78, 8, "#ffffff")}
        {line(168, 11, 50, 5, "#f4c9c9")}

        {/* Passenger / reference row */}
        {line(12, 40, 44, 4, "#9c9385")}
        {line(12, 50, 92, 5)}
        {line(140, 40, 34, 4, "#9c9385")}
        {line(140, 50, 62, 5)}

        {/* Booking-reference band */}
        <rect x="0" y="66" width="230" height="18" fill="#f0f1f0" />
        {line(12, 72, 56, 5, "#656665")}
        {line(150, 72, 52, 5, "#656665")}

        {/* Check-in chevron strip */}
        <g fill="#d5cac3">
          {[12, 68, 124, 180].map((x) => (
            <rect key={x} x={x} y={92} width={38} height={12} rx={2} />
          ))}
        </g>

        {/* Leg block: the strip, then two columns of times */}
        <rect x="0" y="114" width="230" height="14" fill="#efede9" />
        {line(10, 118, 68, 6, "#656665")}
        {line(150, 119, 44, 4, "#91a05b")}

        {line(12, 140, 30, 9, "#656665")}
        {line(12, 155, 58, 4)}
        {line(128, 140, 30, 9, "#656665")}
        {line(128, 155, 58, 4)}
        {/* route glyph between the two columns */}
        <path d="M78 146 h40" stroke="#d9ccaa" strokeWidth="2" strokeDasharray="3 3" />

        {line(12, 174, 96, 4, "#9c9385")}

        {/* Fare block */}
        <rect x="0" y="192" width="230" height="1" fill="#e3e3e1" />
        {[202, 214, 226, 238].map((y, i) => (
          <g key={y}>
            {line(12, y, 46, 4, "#929392")}
            {line(160, y, i === 3 ? 52 : 38, 4, i === 3 ? "#504e4c" : "#929392")}
          </g>
        ))}

        {/* Policy prose at the foot */}
        <rect x="0" y="256" width="230" height="1" fill="#e3e3e1" />
        {line(12, 266, 206, 3, "#dcdfe3")}
        {line(12, 274, 190, 3, "#dcdfe3")}
        {line(12, 282, 148, 3, "#dcdfe3")}
      </svg>
    </div>
  );
}

function Stat({ value, label, mono }: { value: string; label: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-mute">{label}</dt>
      <dd
        className={`text-xl font-semibold text-ink ${mono ? "font-[family-name:var(--font-sans)] tracking-wide" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Great-circle arc between two points over a dotted grid. Pure SVG, ~2KB. */
function FlightArc() {
  return (
    <div
      /* aria-hidden and the lg gate live on HeroArtwork now — one decoration, one
         place that declares it decorative. `relative` keeps it above the tilted
         silhouette without needing a z-index. */
      className="glass relative overflow-hidden rounded-2xl border border-line p-6 shadow-[var(--shadow-lift)]"
    >
      <svg viewBox="0 0 420 260" className="h-auto w-full" role="presentation">
        <defs>
          <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>

          {/*
            Reveal mask. A solid white stroke sweeping the SAME curve as the visible
            arc; whatever it has covered so far is what shows. This is why the dotted
            arc can animate on without its dash pattern crawling — see .arc-reveal in
            globals.css. `pathLength="1"` normalises the curve so the CSS needs no
            magic length that could drift from the `d` below.
          */}
          <mask id="arc-mask">
            <path
              className="arc-reveal"
              d={ARC_D}
              fill="none"
              stroke="#fff"
              strokeWidth="14"
              strokeLinecap="round"
              pathLength="1"
            />
          </mask>
        </defs>

        <circle cx="210" cy="140" r="120" fill="url(#glow)" />

        {/* Dotted globe: latitude ellipses + meridians, clipped to a circle. */}
        <g stroke="rgba(233,238,247,0.18)" fill="none" strokeDasharray="2 4">
          <circle cx="210" cy="140" r="104" />
          <ellipse cx="210" cy="140" rx="104" ry="34" />
          <ellipse cx="210" cy="140" rx="104" ry="68" />
          <ellipse cx="210" cy="140" rx="38" ry="104" />
          <ellipse cx="210" cy="140" rx="72" ry="104" />
        </g>

        {/* Origin is present from the start — you are already there. */}
        <circle cx="118" cy="176" r="5" fill="#7dd3fc" />

        {/* The route itself, drawn on top so it reads as the subject. */}
        <g mask="url(#arc-mask)">
          <path
            d={ARC_D}
            fill="none"
            stroke="url(#arc)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 5"
          />
        </g>

        {/* Destination and aircraft land as the arc reaches them, not before. */}
        <circle className="arc-arrival" cx="302" cy="118" r="5" fill="#c93a30" />
        {/*
          Position and heading are DERIVED from the curve (lib/arc.ts), not tuned by
          eye. The previous transform was `translate(206 62) rotate(28)` — measured at
          34.6 units off the path and 36° away from its tangent, so the aircraft hovered
          above the route pointing across it. Reading both from ARC_D means the glyph
          follows the curve if the curve ever moves.
        */}
        <g
          className="arc-midway"
          transform={`translate(${PLANE.x} ${PLANE.y}) rotate(${PLANE_ROT}) scale(0.85)`}
        >
          <path
            d="M0-9 3-2 13 1 13 4 3 3 1 10 5 12 5 14-1 13-7 14-7 12-3 10-5 3-15 4-15 1-5-2Z"
            fill="#e9eef7"
          />
        </g>

        <text x="96" y="200" fill="#a9b7cd" fontSize="12" fontFamily="system-ui">
          BLR
        </text>
        <text className="arc-arrival" x="292" y="106" fill="#a9b7cd" fontSize="12" fontFamily="system-ui">
          DXB
        </text>
      </svg>

      <p className="mt-3 text-center text-xs text-ink-mute">
        17:30 GMT+5:30 → 23:50 GMT+4 · 7h 50m elapsed
      </p>
    </div>
  );
}
