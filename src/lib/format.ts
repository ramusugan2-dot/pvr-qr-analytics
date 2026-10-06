const IST = "Asia/Kolkata";

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: IST }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: IST,
  }).format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** Today's date in India, as YYYY-MM-DD. */
export function todayIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date());
}
