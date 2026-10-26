import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { todayTR } from "./lib/dates.js";
import { EARTHQUAKE_SOURCES, fetchAfad, fetchKandilli } from "./lib/earthquakes.js";
import { findDistricts, findProvince, plateLabel, PROVINCES } from "./lib/geo.js";
import { addBusinessDays, countBusinessDays, dayInfo, holidaysForYear, SUPPORTED_YEARS } from "./lib/holidays.js";
import { prayerTimes } from "./lib/prayer.js";
import { convert, fetchRates, type RateType } from "./lib/tcmb.js";
import { amountToWords, numberToWords, trAscii, trLower, trSlug, trTitle, trUpper, trKey } from "./lib/turkish.js";
import { validateIban, validateTckn, validateVkn } from "./lib/validators.js";
import { weather } from "./lib/weather.js";

export const VERSION = "0.1.0";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (err: unknown): ToolResult => ({ content: [{ type: "text", text: `Error: ${(err as Error).message ?? String(err)}` }], isError: true });

async function run(fn: () => unknown | Promise<unknown>): Promise<ToolResult> {
  try { return ok(await fn()); } catch (err) { return fail(err); }
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const RATE_TYPES = ["forex_buying", "forex_selling", "banknote_buying", "banknote_selling"] as const;
const readOnly = { readOnlyHint: true, openWorldHint: true } as const;
const offline = { readOnlyHint: true, openWorldHint: false, idempotentHint: true } as const;

export function createServer(): McpServer {
  const server = new McpServer({ name: "turkiye-mcp", version: VERSION });

  // ---------------- Exchange rates (TCMB) ----------------
  server.registerTool("get_exchange_rates", {
    title: "TCMB exchange rates",
    description: "Official indicative exchange rates (TRY per unit) from the Central Bank of the Republic of Türkiye (TCMB). Latest bulletin by default, or any past date since 1996 (weekends/holidays fall back to the previous bulletin).",
    inputSchema: {
      date: isoDate.optional().describe("YYYY-MM-DD. Omit for the latest bulletin."),
      currencies: z.array(z.string()).optional().describe("ISO codes to include, e.g. [\"USD\",\"EUR\"]. Omit for all ~22 currencies."),
    },
    annotations: readOnly,
  }, ({ date, currencies }) => run(async () => {
    const b = await fetchRates(date);
    const want = currencies?.map((c) => c.toUpperCase());
    return { ...b, rates: want ? b.rates.filter((r) => want.includes(r.code)) : b.rates, source: "TCMB (Central Bank of the Republic of Türkiye)" };
  }));

  server.registerTool("convert_currency", {
    title: "Convert currency at TCMB rates",
    description: "Convert an amount between TRY and any currency in the TCMB bulletin (or between two foreign currencies via TRY) using official TCMB rates for a date.",
    inputSchema: {
      amount: z.number().describe("Amount to convert"),
      from: z.string().describe("Source currency, e.g. USD or TRY"),
      to: z.string().describe("Target currency, e.g. TRY or EUR"),
      date: isoDate.optional().describe("YYYY-MM-DD; omit for latest"),
      rate_type: z.enum(RATE_TYPES).optional().describe("Default forex_selling (the rate commonly used for invoices)"),
    },
    annotations: readOnly,
  }, ({ amount, from, to, date, rate_type }) => run(async () => {
    const b = await fetchRates(date);
    return { ...convert(b, amount, from, to, (rate_type ?? "forex_selling") as RateType), bulletin_date: b.bulletin_date, source_url: b.source_url, ...(b.note ? { note: b.note } : {}) };
  }));

  // ---------------- Earthquakes ----------------
  server.registerTool("get_recent_earthquakes", {
    title: "Recent earthquakes in and around Türkiye",
    description: "Latest earthquakes from AFAD (Disaster and Emergency Management Authority) or Kandilli Observatory (Boğaziçi University). Times are returned in UTC and Türkiye local time.",
    inputSchema: {
      source: z.enum(["afad", "kandilli"]).optional().describe("Default afad"),
      hours: z.number().min(1).max(24 * 30).optional().describe("Look-back window in hours (default 24)"),
      min_magnitude: z.number().min(0).max(10).optional().describe("Minimum magnitude (default 0)"),
      limit: z.number().int().min(1).max(500).optional().describe("Max results (default 20)"),
      province: z.string().optional().describe("Only events whose location mentions this province, e.g. \"Malatya\""),
    },
    annotations: readOnly,
  }, ({ source, hours, min_magnitude, limit, province }) => run(async () => {
    const src = source ?? "afad";
    const max = limit ?? 20;
    const opts = { hours: hours ?? 24, minMagnitude: min_magnitude ?? 0, limit: province ? 500 : max };
    let quakes = src === "kandilli" ? await fetchKandilli(opts) : await fetchAfad(opts);
    if (province) {
      const k = trKey(province);
      quakes = quakes.filter((q) => trKey(`${q.location} ${q.province ?? ""}`).includes(k)).slice(0, max);
    }
    return { source: src === "kandilli" ? "Kandilli Observatory" : "AFAD", source_url: src === "kandilli" ? EARTHQUAKE_SOURCES.Kandilli : EARTHQUAKE_SOURCES.AFAD, count: quakes.length, earthquakes: quakes };
  }));

  // ---------------- Holidays & business days ----------------
  server.registerTool("get_public_holidays", {
    title: "Public holidays of Türkiye",
    description: `Official public holidays for a year (${SUPPORTED_YEARS.min}-${SUPPORTED_YEARS.max}), including Ramazan/Kurban Bayramı dates from Diyanet's official tables and half-day eves (arife). Works offline.`,
    inputSchema: { year: z.number().int().optional().describe("Default: current year") },
    annotations: offline,
  }, ({ year }) => run(() => {
    const y = year ?? Number(todayTR().slice(0, 4));
    return { year: y, holidays: holidaysForYear(y), source: "Law No. 2429; religious holiday dates from Diyanet İşleri Başkanlığı official tables" };
  }));

  server.registerTool("check_date", {
    title: "Is it a holiday / business day?",
    description: "Tells whether a date in Türkiye is a weekend, a public holiday (full or half day) or a business day. Works offline.",
    inputSchema: { date: isoDate.optional().describe("YYYY-MM-DD, default today (Türkiye time)") },
    annotations: offline,
  }, ({ date }) => run(() => dayInfo(date ?? todayTR())));

  server.registerTool("add_business_days", {
    title: "Add business days",
    description: "Add (or subtract, with a negative number) N Turkish business days to a date, skipping weekends and full-day public holidays. Useful for legal, payment and delivery deadlines.",
    inputSchema: { start: isoDate.describe("Start date YYYY-MM-DD"), days: z.number().int().min(-1000).max(1000).describe("Business days to add") },
    annotations: offline,
  }, ({ start, days }) => run(() => {
    const result = addBusinessDays(start, days);
    return { start, days, result, result_weekday: dayInfo(result).weekday };
  }));

  server.registerTool("count_business_days", {
    title: "Count business days",
    description: "Count Turkish business days after `start` up to and including `end` (weekends and full-day public holidays excluded).",
    inputSchema: { start: isoDate, end: isoDate },
    annotations: offline,
  }, ({ start, end }) => run(() => ({ start, end, business_days: countBusinessDays(start, end) })));

  // ---------------- Provinces & districts ----------------
  server.registerTool("list_provinces", {
    title: "List the 81 provinces",
    description: "All 81 provinces (il) of Türkiye with plate codes and district counts. Works offline.",
    inputSchema: {},
    annotations: offline,
  }, () => run(() => ({ count: PROVINCES.length, provinces: PROVINCES.map((p) => ({ plate: plateLabel(p.plate), name: p.name, district_count: p.districts.length })) })));

  server.registerTool("get_province", {
    title: "Province details",
    description: "Look up a province by name (any casing, with or without Turkish characters) or plate code, and get its districts (ilçe). Works offline.",
    inputSchema: { query: z.string().describe("Province name or plate code, e.g. \"izmir\", \"İZMİR\", \"35\"") },
    annotations: offline,
  }, ({ query }) => run(() => {
    const p = findProvince(query);
    if (!p) throw new Error(`No province matches "${query}".`);
    return { plate: plateLabel(p.plate), name: p.name, district_count: p.districts.length, districts: p.districts };
  }));

  server.registerTool("find_district", {
    title: "Find a district",
    description: "Find which province a district (ilçe) belongs to. Handles names that exist in several provinces. Works offline.",
    inputSchema: { name: z.string().describe("District name, e.g. \"Gölbaşı\"") },
    annotations: offline,
  }, ({ name }) => run(() => {
    const matches = findDistricts(name);
    if (!matches.length) throw new Error(`No district matches "${name}".`);
    return { query: name, matches: matches.map((m) => ({ ...m, plate: plateLabel(m.plate) })) };
  }));

  // ---------------- Validators ----------------
  server.registerTool("validate_tckn", {
    title: "Validate T.C. Kimlik No",
    description: "Check the checksum of a Turkish national ID number (T.C. Kimlik No). Offline; the number is never sent anywhere.",
    inputSchema: { tckn: z.string() },
    annotations: offline,
  }, ({ tckn }) => run(() => validateTckn(tckn)));

  server.registerTool("validate_vkn", {
    title: "Validate Vergi Kimlik No",
    description: "Check the checksum of a Turkish tax ID (10-digit VKN; 11-digit input is checked as a TCKN). Offline.",
    inputSchema: { vkn: z.string() },
    annotations: offline,
  }, ({ vkn }) => run(() => validateVkn(vkn)));

  server.registerTool("validate_iban", {
    title: "Validate Turkish IBAN",
    description: "Validate a Turkish IBAN (mod-97) and identify the bank from the TCMB participant list. Offline.",
    inputSchema: { iban: z.string() },
    annotations: offline,
  }, ({ iban }) => run(() => validateIban(iban)));

  // ---------------- Prayer times & weather ----------------
  server.registerTool("get_prayer_times", {
    title: "Prayer times (Diyanet method)",
    description: "Daily prayer times (imsak, güneş, öğle, ikindi, akşam, yatsı) for a province or district, computed with the Diyanet method via the free Aladhan API.",
    inputSchema: {
      province: z.string().describe("Province, e.g. \"Ankara\""),
      district: z.string().optional().describe("Optional district, e.g. \"Çankaya\""),
      date: isoDate.optional().describe("YYYY-MM-DD, default today"),
    },
    annotations: readOnly,
  }, ({ province, district, date }) => run(() => prayerTimes(province, district, date)));

  server.registerTool("get_weather", {
    title: "Weather for a Turkish province",
    description: "Current weather and a short daily forecast for a province or district, from Open-Meteo (free, no key).",
    inputSchema: {
      province: z.string().describe("Province, e.g. \"Antalya\""),
      district: z.string().optional().describe("Optional district, e.g. \"Kaş\""),
      days: z.number().int().min(1).max(7).optional().describe("Forecast days (default 3)"),
    },
    annotations: readOnly,
  }, ({ province, district, days }) => run(() => weather(province, district, days ?? 3)));

  // ---------------- Turkish text ----------------
  server.registerTool("turkish_text", {
    title: "Turkish-aware text transforms",
    description: "Correct Turkish upper/lower/title case (i/İ, ı/I), ASCII transliteration and URL slugs. LLMs often get the dotted/dotless i wrong; use this instead.",
    inputSchema: {
      text: z.string(),
      operation: z.enum(["upper", "lower", "title", "ascii", "slug"]),
    },
    annotations: offline,
  }, ({ text, operation }) => run(() => {
    const f = { upper: trUpper, lower: trLower, title: trTitle, ascii: trAscii, slug: trSlug }[operation];
    return { operation, input: text, output: f(text) };
  }));

  server.registerTool("amount_to_words", {
    title: "Amount in Turkish words (yazıyla)",
    description: "Write a number or money amount in Turkish words, as required on invoices, cheques and contracts, e.g. 1250.50 -> \"Bin İki Yüz Elli Türk Lirası Elli Kuruş\".",
    inputSchema: {
      amount: z.union([z.number(), z.string()]).describe("e.g. 1250.50 or \"1250,50\""),
      currency: z.enum(["TRY", "USD", "EUR", "NONE"]).optional().describe("Default TRY. NONE = plain number words."),
    },
    annotations: offline,
  }, ({ amount, currency }) => run(() => {
    if (currency === "NONE") {
      const n = Number(String(amount).replace(",", "."));
      if (!Number.isInteger(n)) throw new Error("With currency NONE the amount must be an integer.");
      return { amount: n, text: numberToWords(n) };
    }
    return amountToWords(amount, currency ?? "TRY");
  }));

  return server;
}
