import { addDays, assertIsoDate, parseIso, toIso, weekday, weekdayName } from "./dates.js";

/**
 * Official public holidays of Türkiye (Law No. 2429).
 *
 * Religious holidays (Ramazan Bayramı, Kurban Bayramı) follow the lunar Hijri calendar.
 * Their dates below are taken from the official "Resmi Tatiller" tables published by the
 * Presidency of Religious Affairs (Diyanet İşleri Başkanlığı):
 * https://vakithesaplama.diyanet.gov.tr/  (Önemli Günler > Resmi Tatiller Listesi), retrieved 2026-10-26.
 *
 * Each entry is the first day of the holiday. Ramazan Bayramı lasts 3 days, Kurban Bayramı 4 days,
 * and the day before each (arefe) is a half-day holiday from 13:00.
 */
const RAMAZAN_FIRST_DAY: Record<number, string[]> = {
  2024: ["2024-04-10"],
  2025: ["2025-03-30"],
  2026: ["2026-03-20"],
  2027: ["2027-03-09"],
  2028: ["2028-02-26"],
  2029: ["2029-02-14"],
  2030: ["2030-02-04"],
  2031: ["2031-01-24"],
  2032: ["2032-01-14"],
  2033: ["2033-01-02", "2033-12-23"],
  2034: ["2034-12-12"],
  2035: ["2035-12-01"],
};

const KURBAN_FIRST_DAY: Record<number, string> = {
  2024: "2024-06-16",
  2025: "2025-06-06",
  2026: "2026-05-27",
  2027: "2027-05-16",
  2028: "2028-05-05",
  2029: "2029-04-24",
  2030: "2030-04-13",
  2031: "2031-04-02",
  2032: "2032-03-22",
  2033: "2033-03-11",
  2034: "2034-03-01",
  2035: "2035-02-18",
};

export const SUPPORTED_YEARS = { min: 2024, max: 2035 };

export interface Holiday {
  date: string;
  weekday: string;
  name_tr: string;
  name_en: string;
  /** "full" = full-day holiday, "half" = afternoon only (from 13:00) */
  duration: "full" | "half";
  type: "national" | "religious";
}

function h(date: string, name_tr: string, name_en: string, duration: "full" | "half", type: "national" | "religious"): Holiday {
  return { date, weekday: weekdayName(date), name_tr, name_en, duration, type };
}

export function holidaysForYear(year: number): Holiday[] {
  if (!Number.isInteger(year) || year < SUPPORTED_YEARS.min || year > SUPPORTED_YEARS.max) {
    throw new Error(`Year must be between ${SUPPORTED_YEARS.min} and ${SUPPORTED_YEARS.max} (official religious holiday tables are published that far).`);
  }
  const y = String(year);
  const list: Holiday[] = [
    h(`${y}-01-01`, "Yılbaşı", "New Year's Day", "full", "national"),
    h(`${y}-04-23`, "Ulusal Egemenlik ve Çocuk Bayramı", "National Sovereignty and Children's Day", "full", "national"),
    h(`${y}-05-01`, "Emek ve Dayanışma Günü", "Labour and Solidarity Day", "full", "national"),
    h(`${y}-05-19`, "Atatürk'ü Anma, Gençlik ve Spor Bayramı", "Commemoration of Atatürk, Youth and Sports Day", "full", "national"),
    h(`${y}-07-15`, "Demokrasi ve Millî Birlik Günü", "Democracy and National Unity Day", "full", "national"),
    h(`${y}-08-30`, "Zafer Bayramı", "Victory Day", "full", "national"),
    h(`${y}-10-28`, "Cumhuriyet Bayramı Arifesi", "Republic Day Eve", "half", "national"),
    h(`${y}-10-29`, "Cumhuriyet Bayramı", "Republic Day", "full", "national"),
  ];
  for (const first of RAMAZAN_FIRST_DAY[year] ?? []) {
    list.push(h(addDays(first, -1), "Ramazan Bayramı Arifesi", "Eid al-Fitr Eve", "half", "religious"));
    for (let i = 0; i < 3; i++) list.push(h(addDays(first, i), `Ramazan Bayramı ${i + 1}. Gün`, `Eid al-Fitr Day ${i + 1}`, "full", "religious"));
  }
  const k = KURBAN_FIRST_DAY[year];
  if (k) {
    list.push(h(addDays(k, -1), "Kurban Bayramı Arifesi", "Eid al-Adha Eve", "half", "religious"));
    for (let i = 0; i < 4; i++) list.push(h(addDays(k, i), `Kurban Bayramı ${i + 1}. Gün`, `Eid al-Adha Day ${i + 1}`, "full", "religious"));
  }
  // Holidays from an adjacent year's table can spill over (e.g. an arefe on Dec 31); keep only this year.
  return list.filter((x) => x.date.startsWith(y)).sort((a, b) => a.date.localeCompare(b.date));
}

export interface DayInfo {
  date: string;
  weekday: string;
  is_weekend: boolean;
  holidays: Holiday[];
  /** true if it is a working day (not weekend, not a full-day holiday) */
  is_business_day: boolean;
  note?: string;
}

export function dayInfo(date: string): DayInfo {
  assertIsoDate(date);
  const year = Number(date.slice(0, 4));
  const holidays = holidaysForYear(year).filter((x) => x.date === date);
  const wd = weekday(date);
  const is_weekend = wd === 0 || wd === 6;
  const fullHoliday = holidays.some((x) => x.duration === "full");
  const info: DayInfo = { date, weekday: weekdayName(date), is_weekend, holidays, is_business_day: !is_weekend && !fullHoliday };
  if (!info.is_weekend && holidays.length && !fullHoliday) info.note = "Half-day holiday: public offices close at 13:00.";
  return info;
}

export function isBusinessDay(date: string): boolean {
  return dayInfo(date).is_business_day;
}

/** Add (or subtract) N business days to a date. Half-day holidays count as business days. */
export function addBusinessDays(start: string, n: number): string {
  assertIsoDate(start, "start");
  if (!Number.isInteger(n)) throw new Error("days must be an integer");
  let d = start;
  let remaining = Math.abs(n);
  const step = n >= 0 ? 1 : -1;
  while (remaining > 0) {
    d = addDays(d, step);
    if (isBusinessDay(d)) remaining--;
  }
  return d;
}

/** Count business days in the half-open interval (start, end]. */
export function countBusinessDays(start: string, end: string): number {
  assertIsoDate(start, "start");
  assertIsoDate(end, "end");
  const a = parseIso(start), b = parseIso(end);
  if (b < a) return -countBusinessDays(end, start);
  if ((b.getTime() - a.getTime()) / 86400000 > 366 * 5) throw new Error("Range too large (max 5 years).");
  let count = 0;
  let d = start;
  while (d < end) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) count++;
  }
  return count;
}

export { toIso };
