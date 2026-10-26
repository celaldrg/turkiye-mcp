import { bankByCode } from "./banks.js";

export interface ValidationResult {
  input: string;
  valid: boolean;
  reason?: string;
  [key: string]: unknown;
}

const digitsOnly = (s: string) => s.replace(/[\s-]/g, "");

/**
 * T.C. Kimlik No (Turkish national ID number) checksum validation.
 * Rules: 11 digits, first digit not 0,
 * d10 = ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) mod 10, d11 = (d1+...+d10) mod 10.
 * This only checks the algorithm; it does not prove the number belongs to a real person.
 */
export function validateTckn(input: string): ValidationResult {
  const s = digitsOnly(input);
  if (!/^\d{11}$/.test(s)) return { input, valid: false, reason: "Must be exactly 11 digits." };
  const d = s.split("").map(Number);
  if (d[0] === 0) return { input, valid: false, reason: "First digit cannot be 0." };
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const c10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (c10 !== d[9]) return { input, valid: false, reason: "10th digit checksum mismatch." };
  const c11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  if (c11 !== d[10]) return { input, valid: false, reason: "11th digit checksum mismatch." };
  return { input, valid: true, note: "Checksum is valid. This does not confirm the ID is registered to a real person." };
}

/** Compute the 10th (check) digit of a VKN from its first 9 digits. */
export function vknCheckDigit(first9: string): number {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (Number(first9[i]) + 9 - i) % 10;
    let v = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && v === 0) v = 9;
    sum += v;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Vergi Kimlik No (Turkish tax ID for companies, 10 digits) checksum validation.
 * Individuals use their 11-digit T.C. Kimlik No as tax ID, so 11-digit input is checked as a TCKN.
 */
export function validateVkn(input: string): ValidationResult {
  const s = digitsOnly(input);
  if (/^\d{11}$/.test(s)) {
    const r = validateTckn(s);
    return { ...r, input, kind: "TCKN (individuals use their national ID as tax ID)" };
  }
  if (!/^\d{10}$/.test(s)) return { input, valid: false, reason: "VKN must be exactly 10 digits (or an 11-digit TCKN for individuals)." };
  const expected = vknCheckDigit(s.slice(0, 9));
  if (expected !== Number(s[9])) return { input, valid: false, kind: "VKN", reason: `Check digit mismatch (expected ${expected}).` };
  return { input, valid: true, kind: "VKN", note: "Checksum is valid. This does not confirm the tax ID is registered." };
}

function mod97(numeric: string): number {
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return rem;
}

/** Validate a Turkish IBAN (TR + 24 digits) with ISO 13616 mod-97 and identify the bank. */
export function validateIban(input: string): ValidationResult {
  const s = input.replace(/\s+/g, "").toUpperCase();
  if (!s.startsWith("TR")) return { input, valid: false, reason: "Turkish IBANs start with 'TR'." };
  if (s.length !== 26) return { input, valid: false, reason: `Turkish IBANs are 26 characters; got ${s.length}.` };
  if (!/^TR\d{24}$/.test(s)) return { input, valid: false, reason: "After 'TR', a Turkish IBAN must contain only digits." };
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  const bankCode = s.slice(4, 9);
  const reserved = s.slice(9, 10);
  const account = s.slice(10);
  const formatted = s.replace(/(.{4})/g, "$1 ").trim();
  const bank = bankByCode(bankCode) ?? null;
  if (mod97(numeric) !== 1) return { input, valid: false, formatted, reason: "Checksum (mod-97) failed. Check for a typo." };
  const result: ValidationResult = { input, valid: true, formatted, bank_code: bankCode, bank, reserved_digit: reserved, account_part: account };
  if (!bank) result.note = "Checksum is valid, but the bank code is not in the TCMB participant list bundled with this server.";
  if (reserved !== "0") result.warning = "The 10th character (reserved digit) is normally 0 in Turkish IBANs.";
  return result;
}
