"use client";

import type { Fare } from "@/lib/itinerary";

/**
 * Fare information inputs — collapsed by default and entirely optional.
 *
 * Everything here is free text on purpose. Fare notation is not standardised
 * across carriers or GDSs (`INR35365`, `1350MILES + INR68145`, a bare `-`), so a
 * currency picker plus a number field would reject valid values and invent a
 * precision the document does not have. There is deliberately NO generator: the
 * app makes up a PNR and a document number, but it will not make up a price.
 */
export function FareFields({
  fare,
  onChange,
}: {
  fare: Fare;
  onChange: (p: Partial<Fare>) => void;
}) {
  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Fare information — optional
      </summary>

      <p className="mt-2 text-xs text-neutral-500">
        Left blank, the fare block does not appear on the document at all. Nothing here
        is generated — the document prints exactly what you type.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Text
          label="Fare"
          value={fare.base}
          placeholder="INR35365"
          onChange={(v) => onChange({ base: v })}
        />
        <Text
          label="Equivalent fare"
          value={fare.equivalent}
          placeholder="–"
          onChange={(v) => onChange({ equivalent: v })}
        />
        <Text
          label="Total fare (Incl. TFC)"
          value={fare.total}
          placeholder="INR68145"
          onChange={(v) => onChange({ total: v })}
        />
        <Text
          label="Form of payment"
          value={fare.formOfPayment}
          placeholder="CREDIT CARD"
          onChange={(v) => onChange({ formOfPayment: v })}
        />
      </div>

      <div className="mt-3 grid gap-3">
        <Area
          label="Taxes / Fees / Charges (TFC)"
          value={fare.taxes}
          placeholder={"INR24200-YQ\nINR2576-F6\nINR1770-IN"}
          rows={3}
          hint="One per line — the document keeps your line breaks."
          onChange={(v) => onChange({ taxes: v })}
        />
        <Area
          label="Fare calculation"
          value={fare.calculation}
          placeholder="BLR EK X/DXB EK DUB Q BLRDUB12.31 205.21…"
          rows={2}
          onChange={(v) => onChange({ calculation: v })}
        />
        <Text
          label="Additional information"
          value={fare.additionalInfo}
          placeholder="NON-END/SAVER"
          onChange={(v) => onChange({ additionalInfo: v })}
        />
      </div>
    </details>
  );
}

function Text({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-neutral-600">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm
                   focus:border-neutral-900 focus:outline-none"
      />
    </label>
  );
}

function Area({
  label,
  value,
  placeholder,
  rows,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows: number;
  hint?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-neutral-600">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-2.5 py-2 font-mono text-xs
                   focus:border-neutral-900 focus:outline-none"
      />
      {hint && <span className="text-[11px] text-neutral-500">{hint}</span>}
    </label>
  );
}
