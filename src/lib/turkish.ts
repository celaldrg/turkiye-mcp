/** Turkish-locale text helpers that LLMs frequently get wrong (dotted/dotless i, number words). */

export function trUpper(s: string): string { return s.toLocaleUpperCase("tr-TR"); }
export function trLower(s: string): string { return s.toLocaleLowerCase("tr-TR"); }
export function trTitle(s: string): string {
  return trLower(s).replace(/(^|[\s\-'’(])(\p{L})/gu, (_m, p: string, c: string) => p + c.toLocaleUpperCase("tr-TR"));
}

const ASCII_MAP: Record<string, string> = { ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", I: "I", İ: "I", ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U", â: "a", Â: "A", î: "i", Î: "I", û: "u", Û: "U" };
export function trAscii(s: string): string { return s.replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (c) => ASCII_MAP[c] ?? c); }
export function trSlug(s: string): string {
  return trAscii(trLower(s)).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Locale-aware comparison key: case-insensitive, Turkish-aware, diacritic-insensitive. */
export function trKey(s: string): string { return trAscii(trLower(s.trim())); }

const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
const SCALES = ["", "bin", "milyon", "milyar", "trilyon", "katrilyon"];

function under1000(n: number): string[] {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  const w: string[] = [];
  if (h) { if (h > 1) w.push(ONES[h]); w.push("yüz"); }
  if (t) w.push(TENS[t]);
  if (o) w.push(ONES[o]);
  return w;
}

/** Integer to Turkish words, e.g. 1250 -> "bin iki yüz elli". */
export function numberToWords(n: number | bigint): string {
  let x = BigInt(n);
  if (x === 0n) return "sıfır";
  const neg = x < 0n;
  if (neg) x = -x;
  if (x >= 10n ** 21n) throw new Error("Number too large (max 999 katrilyon...).");
  const groups: number[] = [];
  while (x > 0n) { groups.push(Number(x % 1000n)); x /= 1000n; }
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    if (i === 1 && g === 1) words.push("bin"); // "bin", never "bir bin"
    else { words.push(...under1000(g)); if (SCALES[i]) words.push(SCALES[i]); }
  }
  return (neg ? "eksi " : "") + words.join(" ");
}

/**
 * Amount in words as written on Turkish invoices and cheques ("yazıyla").
 * 1250.5 -> "Bin İki Yüz Elli Türk Lirası Elli Kuruş"; compact form -> "BinİkiYüzElliTL,ElliKr"
 */
export function amountToWords(amount: number | string, currency = "TRY") {
  const s = typeof amount === "number" ? amount.toFixed(2) : amount.trim().replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error("Amount must be a number with at most 2 decimals, e.g. 1250.50");
  const [intPart, frac = "0"] = s.replace("-", "").split(".");
  const kurus = Number(frac.padEnd(2, "0"));
  const lira = BigInt(intPart);
  const names: Record<string, [string, string, string, string]> = {
    TRY: ["Türk Lirası", "Kuruş", "TL", "Kr"],
    USD: ["Amerikan Doları", "Sent", "USD", "Cent"],
    EUR: ["Avro", "Sent", "EUR", "Cent"],
  };
  const [main, sub, mainShort, subShort] = names[currency.toUpperCase()] ?? names.TRY;
  const t = (w: string) => w.split(" ").map((x) => x.charAt(0).toLocaleUpperCase("tr-TR") + x.slice(1)).join(" ");
  const liraW = t(numberToWords(lira));
  const kurusW = kurus ? t(numberToWords(kurus)) : "";
  const neg = s.startsWith("-") ? "Eksi " : "";
  const text = `${neg}${liraW} ${main}${kurus ? ` ${kurusW} ${sub}` : ""}`;
  const compact = `${neg.trim()}${liraW.replace(/ /g, "")}${mainShort}${kurus ? `,${kurusW.replace(/ /g, "")}${subShort}` : ""}`;
  return { amount: s, currency: currency.toUpperCase(), text, compact, upper: trUpper(text) };
}
