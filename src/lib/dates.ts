/** Date helpers. All dates are calendar dates in Türkiye (Europe/Istanbul, UTC+3, no DST). */

export const TR_TZ = "Europe/Istanbul";

/** Today's date in Türkiye as YYYY-MM-DD. */
export function todayTR(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TR_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseIso(s);
  return toIso(d) === s;
}

/** Parse YYYY-MM-DD into a UTC-midnight Date (used purely as a calendar date). */
export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(iso: string): number {
  return parseIso(iso).getUTCDay();
}

const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function weekdayName(iso: string, lang: "en" | "tr" = "en"): string {
  const i = weekday(iso);
  return lang === "tr" ? WEEKDAYS_TR[i] : WEEKDAYS_EN[i];
}

export function assertIsoDate(s: string, field = "date"): void {
  if (!isIsoDate(s)) throw new Error(`Invalid ${field} "${s}". Use YYYY-MM-DD.`);
}
