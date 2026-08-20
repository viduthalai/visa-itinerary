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

          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.08] text-ink sm:text-5xl">
            Build a travel itinerary
            <span className="block bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              that gets the times right
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
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

        <FlightArc />
      </div>
    </section>
  );
}

function Stat({ value, label, mono }: { value: string; label: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-ink-mute">{label}</dt>
      <dd
        className={`text-lg font-semibold text-ink ${mono ? "font-[family-name:var(--font-sans)] tracking-wide" : ""}`}
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
      aria-hidden
      className="glass relative hidden overflow-hidden rounded-2xl border border-line p-6 shadow-[var(--shadow-lift)] lg:block"
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

        {/* The route itself, drawn on top so it reads as the subject. */}
        <path
          d="M118 176 Q210 34 302 118"
          fill="none"
          stroke="url(#arc)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="6 5"
        />
        <circle cx="118" cy="176" r="5" fill="#7dd3fc" />
        <circle cx="302" cy="118" r="5" fill="#e14b3f" />

        {/* Aircraft at the apex, rotated along the tangent. */}
        <g transform="translate(206 62) rotate(28) scale(0.85)">
          <path
            d="M0-9 3-2 13 1 13 4 3 3 1 10 5 12 5 14-1 13-7 14-7 12-3 10-5 3-15 4-15 1-5-2Z"
            fill="#e9eef7"
          />
        </g>

        <text x="96" y="200" fill="#a9b7cd" fontSize="11" fontFamily="system-ui">
          BLR
        </text>
        <text x="292" y="106" fill="#a9b7cd" fontSize="11" fontFamily="system-ui">
          DXB
        </text>
      </svg>

      <p className="mt-3 text-center text-xs text-ink-mute">
        17:30 GMT+5:30 → 23:50 GMT+4 · 7h 50m elapsed
      </p>
    </div>
  );
}
