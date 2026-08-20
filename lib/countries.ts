/**
 * ISO 3166-1 alpha-2 -> country name.
 *
 * Intl.DisplayNames ships with the runtime, so this needs no bundled dataset and
 * no maintenance. Pinned to "en" so the document renders identically everywhere —
 * the same reason lib/formatDate.ts avoids toLocaleString.
 */
let display: Intl.DisplayNames | null = null;

export function countryName(iso2: string | null | undefined): string {
  if (!iso2) return "";
  const code = iso2.trim().toUpperCase();
  if (code.length !== 2) return code;
  try {
    display ??= new Intl.DisplayNames(["en"], { type: "region" });
    return display.of(code) ?? code;
  } catch {
    return code;
  }
}
