"use client";

import { Cell, FormGrid, fieldClass, labelClass } from "@/components/ui";
import type { Fare } from "@/lib/itinerary";

/**
 * Fare information inputs — collapsed by default and entirely optional.
 *
 * Everything here is free text on purpose. Fare notation is not standardised
 * across carriers or GDSs (`INR35365`, `1350MILES + INR68145`, a bare `-`), so a
 * currency picker plus a number field would reject valid values and invent a
 * precision the document does not have. There is deliberately NO generator: the
 * app makes up a PNR and a document number, but it will not make up a price.
 *
 * GRID. The four short fields are 3 columns each, so they form one even row of
 * four instead of a 2x2 block on a private `grid-cols-2`. The two long text areas
 * are 4 and 8, giving the fare calculation the width it actually needs: it holds a
 * single long unbroken string, and at half width it wrapped mid-token every time.
 *
 * Both areas are `rows={4}` so their boxes are the same height and the row has a
 * flat baseline. They were 3 and 2, which left a ragged 24px step between two
 * fields sitting side by side.
 */
export function FareFields({
  fare,
  onChange,
}: {
  fare: Fare;
  onChange: (p: Partial<Fare>) => void;
}) {
  return (
    <details className="border-t border-line pt-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Fare information (optional)
      </summary>

      <p className="mt-1 max-w-[65ch] text-xs text-ink-mute">
        Left blank, the fare block does not appear on the document at all. Nothing here
        is generated. The document prints exactly what you type.
      </p>

      <FormGrid className="mt-4">
        <Cell span={3}>
          <Text
            label="Fare"
            value={fare.base}
            placeholder="INR35365"
            onChange={(v) => onChange({ base: v })}
          />
        </Cell>
        <Cell span={3}>
          <Text
            label="Equivalent fare"
            value={fare.equivalent}
            placeholder="-"
            onChange={(v) => onChange({ equivalent: v })}
          />
        </Cell>
        <Cell span={3}>
          <Text
            label="Total fare (Incl. TFC)"
            value={fare.total}
            placeholder="INR68145"
            onChange={(v) => onChange({ total: v })}
          />
        </Cell>
        <Cell span={3}>
          <Text
            label="Form of payment"
            value={fare.formOfPayment}
            placeholder="CREDIT CARD"
            onChange={(v) => onChange({ formOfPayment: v })}
          />
        </Cell>

        <Cell span={4}>
          <Area
            label="Taxes / Fees / Charges (TFC)"
            value={fare.taxes}
            placeholder={"INR24200-YQ\nINR2576-F6\nINR1770-IN"}
            rows={4}
            hint="One per line. The document keeps your line breaks."
            onChange={(v) => onChange({ taxes: v })}
          />
        </Cell>
        <Cell span={8}>
          <Area
            label="Fare calculation"
            value={fare.calculation}
            placeholder="BLR EK X/DXB EK DUB Q BLRDUB12.31 205.21…"
            rows={4}
            onChange={(v) => onChange({ calculation: v })}
          />
        </Cell>

        <Cell span={4}>
          <Text
            label="Additional information"
            value={fare.additionalInfo}
            placeholder="NON-END/SAVER"
            onChange={(v) => onChange({ additionalInfo: v })}
          />
        </Cell>
      </FormGrid>
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
    <label className={labelClass}>
      {label}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
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
    <label className={labelClass}>
      {label}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} font-mono`}
      />
      {hint && <span className="mt-1 block text-xs font-normal text-ink-mute">{hint}</span>}
    </label>
  );
}
