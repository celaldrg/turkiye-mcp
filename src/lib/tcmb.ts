import { addDays, assertIsoDate, todayTR } from "./dates.js";
import { getText, HttpError } from "./http.js";

/**
 * Indicative exchange rates of the Central Bank of the Republic of Türkiye (TCMB).
 * Latest bulletin: https://www.tcmb.gov.tr/kurlar/today.xml
 * Historical:      https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml
 * TCMB publishes on business days around 15:30 Türkiye time. No bulletin exists for weekends and holidays.
 */
export interface Rate {
  code: string;
  name_en: string;
  name_tr: string;
  unit: number;
  forex_buying: number | null;
  forex_selling: number | null;
  banknote_buying: number | null;
  banknote_selling: number | null;
}

export interface RatesBulletin {
  bulletin_date: string;
  bulletin_no: string | null;
  source_url: string;
  rates: Rate[];
}

const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const n = Number.parseFloat(s.trim());
  return Number.isFinite(n) ? n : null;
};

const tag = (block: string, name: string): string | undefined => {
  const m = block.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m?.[1];
};

export function parseTcmbXml(xml: string, sourceUrl = ""): RatesBulletin {
  const head = xml.match(/<Tarih_Date[^>]*Tarih="(\d{2})\.(\d{2})\.(\d{4})"[^>]*>/);
  if (!head) throw new Error("Unexpected TCMB response: no <Tarih_Date> element.");
  const bulletin_date = `${head[3]}-${head[2]}-${head[1]}`;
  const bno = xml.match(/Bulten_No="([^"]*)"/)?.[1] ?? null;
  const rates: Rate[] = [];
  for (const m of xml.matchAll(/<Currency[^>]*CurrencyCode="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/g)) {
    const block = m[2];
    rates.push({
      code: m[1],
      name_en: (tag(block, "CurrencyName") ?? "").trim(),
      name_tr: (tag(block, "Isim") ?? "").trim(),
      unit: Number(tag(block, "Unit") ?? "1"),
      forex_buying: num(tag(block, "ForexBuying")),
      forex_selling: num(tag(block, "ForexSelling")),
      banknote_buying: num(tag(block, "BanknoteBuying")),
      banknote_selling: num(tag(block, "BanknoteSelling")),
    });
  }
  if (!rates.length) throw new Error("Unexpected TCMB response: no currencies found.");
  return { bulletin_date, bulletin_no: bno, source_url: sourceUrl, rates };
}

export function tcmbUrlForDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${d}${m}${y}.xml`;
}

/**
 * Fetch the bulletin for a date. If no bulletin was published that day (weekend/holiday),
 * walks back day by day (up to 10 days) to the most recent published bulletin.
 */
export async function fetchRates(date?: string, fetchText: (url: string) => Promise<string> = (u) => getText(u)): Promise<RatesBulletin & { requested_date: string | null; note?: string }> {
  if (!date) {
    const url = "https://www.tcmb.gov.tr/kurlar/today.xml";
    return { ...parseTcmbXml(await fetchText(url), url), requested_date: null };
  }
  assertIsoDate(date);
  if (date < "1996-04-16") throw new Error("TCMB XML archive starts on 1996-04-16.");
  if (date > todayTR()) throw new Error("Date is in the future.");
  let d = date;
  for (let i = 0; i <= 10; i++) {
    const url = tcmbUrlForDate(d);
    try {
      const bulletin = parseTcmbXml(await fetchText(url), url);
      const note = d !== date ? `No TCMB bulletin was published on ${date} (weekend, holiday or not yet published); showing the most recent earlier bulletin.` : undefined;
      return { ...bulletin, requested_date: date, ...(note ? { note } : {}) };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        d = addDays(d, -1);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`No TCMB bulletin found within 10 days before ${date}.`);
}

export type RateType = "forex_buying" | "forex_selling" | "banknote_buying" | "banknote_selling";

/** Price of ONE unit of `code` in TRY, using the given rate type. TRY itself is 1. */
export function tryPerUnit(bulletin: RatesBulletin, code: string, type: RateType): number {
  const c = code.toUpperCase();
  if (c === "TRY" || c === "TL") return 1;
  const r = bulletin.rates.find((x) => x.code === c);
  if (!r) throw new Error(`Currency ${c} is not in the TCMB bulletin. Available: TRY, ${bulletin.rates.map((x) => x.code).join(", ")}`);
  const v = r[type];
  if (v == null) throw new Error(`TCMB does not publish a ${type} rate for ${c}.`);
  return v / r.unit;
}

export function convert(bulletin: RatesBulletin, amount: number, from: string, to: string, type: RateType) {
  const fromTry = tryPerUnit(bulletin, from, type);
  const toTry = tryPerUnit(bulletin, to, type);
  const result = (amount * fromTry) / toTry;
  return { amount, from: from.toUpperCase(), to: to.toUpperCase(), result: Math.round(result * 10000) / 10000, rate: fromTry / toTry, rate_type: type };
}
