/** Returns the cleaned https link, or null if it is not a valid https link. */
export function cleanDestinationUrl(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function optionalText(value: FormDataEntryValue | null): string | null {
  return text(value) || null;
}

export function positiveInt(value: FormDataEntryValue | string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** A YYYY-MM-DD date string, or null. */
export function isoDate(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}
