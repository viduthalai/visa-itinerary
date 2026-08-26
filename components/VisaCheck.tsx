"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, Info, Prohibit, Warning } from "@phosphor-icons/react";
import { Cell, FormGrid, Panel, fieldClass, labelClass } from "@/components/ui";
import { countryName } from "@/lib/countries";
import {
  assessStay,
  hasCountry,
  loadVisaData,
  lookupVisa,
  visaCountries,
  type VisaCode,
  type VisaData,
  type VisaTone,
} from "@/lib/visa";

/**
 * Visa pre-check — a helper, not a document field.
 *
 * It answers "for this passport, going to this country, what does entry take?" from
 * the bundled dataset (data/visa.json, MIT). It is intentionally OUTSIDE the
 * itinerary: nothing here is printed on the generated document, because the document
 * asserts a travel plan and this is advisory guidance from a periodically-updated
 * community source. The disclaimer at the foot says exactly that.
 *
 * The data is lazy-loaded (lib/visa.ts) so its ~390 KB is a chunk fetched when this
 * panel mounts, not part of the initial bundle.
 */

const ICON_WEIGHT = "regular" as const;

/*
 * Three tones, not six. The shell is monochrome with no green token, so "ok" reads
 * as strong neutral ink, "notice" borrows the amber notice tokens (same as the
 * wizard's warnings), and "alert" uses destructive — the exact language the search
 * error already uses (left rule + bg-muted + destructive text).
 */
const TONE_CLASS: Record<VisaTone, string> = {
  ok: "border-l-ink bg-muted text-ink",
  notice: "border-l-notice-line bg-notice-surface text-notice-ink",
  alert: "border-l-destructive bg-muted text-destructive",
};

function ResultIcon({ code, tone }: { code: VisaCode; tone: VisaTone }) {
  if (code === "X") return <Prohibit aria-hidden size={18} weight={ICON_WEIGHT} />;
  if (tone === "ok") return <CheckCircle aria-hidden size={18} weight={ICON_WEIGHT} />;
  if (tone === "alert") return <Warning aria-hidden size={18} weight={ICON_WEIGHT} />;
  return <Info aria-hidden size={18} weight={ICON_WEIGHT} />;
}

/** ISO-2 -> flag emoji via regional-indicator symbols. Empty string if not two letters. */
function flagEmoji(iso2: string): string {
  const cc = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

type Props = {
  /** The trip's outbound destination country (ISO-2), used to seed the selector. */
  destinationIso2?: string | null;
  /**
   * The trip's length in days (return departure − outbound departure), or null for
   * a one-way trip. Drives the overstay guard, which only fires when the selected
   * destination is still the trip's own destination — the dates belong to THAT
   * country, so applying them to a country the user is merely exploring would be
   * wrong.
   */
  tripStayDays?: number | null;
};

export function VisaCheck({ destinationIso2, tripStayDays }: Props) {
  const [data, setData] = useState<VisaData | null>(null);
  const [passport, setPassport] = useState("");
  const [dest, setDest] = useState("");

  useEffect(() => {
    let live = true;
    loadVisaData()
      .then((d) => {
        if (live) setData(d);
      })
      .catch(() => {
        // A failed chunk load leaves `data` null, which renders the disabled
        // loading state — the panel degrades to inert rather than crashing.
      });
    return () => {
      live = false;
    };
  }, []);

  // Seed the destination from the trip once data is in and the country is one the
  // matrix offers. `prev ||` so it never clobbers a destination the user chose.
  useEffect(() => {
    if (data && destinationIso2 && hasCountry(data, destinationIso2)) {
      setDest((prev) => prev || destinationIso2.toUpperCase());
    }
  }, [data, destinationIso2]);

  const countries = useMemo(() => (data ? visaCountries(data) : []), [data]);
  const result = useMemo(
    () => (data && passport && dest ? lookupVisa(data, passport, dest) : null),
    [data, passport, dest],
  );

  // The trip's dates only describe the trip's own destination. Weigh the stay only
  // while the selected destination still matches it; if the user switches the
  // dropdown to explore elsewhere, the guard falls silent rather than applying
  // this trip's length to a different country.
  const stay = useMemo(() => {
    const forThisTrip =
      dest && destinationIso2 && dest.toUpperCase() === destinationIso2.toUpperCase();
    return forThisTrip ? assessStay(result, tripStayDays ?? null) : null;
  }, [result, dest, destinationIso2, tripStayDays]);

  const ready = Boolean(data);

  return (
    <Panel
      title="Visa pre-check"
      hint="See what entry takes for your passport. Guidance only — not part of your document."
    >
      <FormGrid>
        <Cell span={6}>
          <label className={labelClass}>
            Your passport
            <select
              className={fieldClass}
              value={passport}
              disabled={!ready}
              onChange={(e) => setPassport(e.target.value)}
            >
              <option value="">{ready ? "Select country…" : "Loading…"}</option>
              {countries.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </Cell>

        <Cell span={6}>
          <label className={labelClass}>
            Destination
            <select
              className={fieldClass}
              value={dest}
              disabled={!ready}
              onChange={(e) => setDest(e.target.value)}
            >
              <option value="">{ready ? "Select country…" : "Loading…"}</option>
              {countries.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </Cell>
      </FormGrid>

      {/* Result region. `aria-live` so a screen reader hears the outcome when the
          selections resolve, the same pattern the wizard's search status uses. */}
      <div aria-live="polite" className="mt-6">
        {result ? (
          <>
            <div className={`border-l-2 px-4 py-3 ${TONE_CLASS[result.tone]}`}>
              <div className="flex items-center gap-2">
                <ResultIcon code={result.code} tone={result.tone} />
                <span className="text-sm font-semibold">{result.label}</span>
              </div>
              <p className="mt-1 text-sm">
                {flagEmoji(passport)} {countryName(passport)} → {flagEmoji(dest)}{" "}
                {countryName(dest)}: {result.detail}
                {result.days !== null && ` Stay of up to ${result.days} days.`}
              </p>
            </div>

            {/*
              Overstay guard. Only rendered when this trip's dates apply to the
              selected destination (see `stay`), so it can safely speak about "this
              trip". The exceed case borrows the alert tokens; the within-limit case
              is a quiet confirmation that the check ran, not a second warning.
            */}
            {stay &&
              (stay.exceeds ? (
                <div className={`mt-2 border-l-2 px-4 py-3 ${TONE_CLASS.alert}`}>
                  <div className="flex items-center gap-2">
                    <Warning aria-hidden size={18} weight={ICON_WEIGHT} />
                    <span className="text-sm font-semibold">
                      Trip is longer than the allowed stay
                    </span>
                  </div>
                  <p className="mt-1 text-sm">
                    This trip spans about {stay.stayDays} days, but entry here permits a stay of up
                    to {stay.allowedDays}. You&rsquo;ll likely need a visa or long-stay permit for
                    the extra {stay.overBy} day{stay.overBy === 1 ? "" : "s"} — confirm with the
                    consulate.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink-soft">
                  Your {stay.stayDays}-day trip is within the {stay.allowedDays}-day limit.
                </p>
              ))}
          </>
        ) : passport && dest ? (
          <p className="border-l-2 border-l-line bg-muted px-4 py-3 text-sm text-ink-mute">
            No visa data for this route in the dataset.
          </p>
        ) : (
          <p className="text-xs text-ink-mute">
            Pick a passport and a destination to see the requirement.
          </p>
        )}
      </div>

      {/* Cross-link to the full per-passport explorer. Also the internal link that
          keeps the statically-generated /passport/[code] pages from being orphaned. */}
      {passport && (
        <p className="mt-4 text-sm">
          <Link
            href={`/passport/${passport.toLowerCase()}`}
            className="text-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            See everywhere a {countryName(passport)} passport can go →
          </Link>
        </p>
      )}

      {/*
        Honesty footnote — the load-bearing line of this feature. The dataset is a
        community source, updated periodically and not authoritative, so the panel
        never lets its answer stand as a fact the user should act on unchecked.
      */}
      {data && (
        <p className="mt-4 text-xs leading-relaxed text-ink-mute">
          Community data ({data.meta.source}, updated {data.meta.built}). Visa rules
          change — always confirm with the destination&rsquo;s official embassy or
          consulate before you travel.
        </p>
      )}
    </Panel>
  );
}
