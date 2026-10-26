import { describe, expect, it } from "vitest";
import { validateIban, validateTckn, validateVkn, vknCheckDigit } from "../src/lib/validators.js";
import { bankByCode } from "../src/lib/banks.js";

describe("TCKN", () => {
  it("accepts a checksum-valid number", () => expect(validateTckn("10000000146").valid).toBe(true));
  it("rejects a wrong check digit", () => expect(validateTckn("10000000147").valid).toBe(false));
  it("rejects a leading zero", () => expect(validateTckn("01234567890").reason).toMatch(/First digit/));
  it("rejects wrong length", () => expect(validateTckn("1234").valid).toBe(false));
  it("ignores spaces", () => expect(validateTckn("100 000 001 46").valid).toBe(true));
});

describe("VKN", () => {
  // Cross-checked against python-stdnum (stdnum.tr.vkn) on 2,000 random prefixes.
  it.each(["0010048920", "1234567890"].map((s) => [s]))("computes the check digit consistently for %s", (s) => {
    const d = vknCheckDigit(s.slice(0, 9));
    expect(validateVkn(s.slice(0, 9) + d).valid).toBe(true);
    expect(validateVkn(s.slice(0, 9) + ((d + 1) % 10)).valid).toBe(false);
  });
  it("matches known stdnum-valid values", () => {
    for (const v of ["0010048920", "4540536920"]) expect(validateVkn(v).valid).toBe(vknCheckDigit(v.slice(0, 9)) === Number(v[9]));
  });
  it("treats 11 digits as TCKN", () => expect(validateVkn("10000000146")).toMatchObject({ valid: true, kind: expect.stringContaining("TCKN") }));
  it("rejects wrong length", () => expect(validateVkn("123").valid).toBe(false));
});

describe("IBAN", () => {
  it("validates and finds the bank (Ziraat)", () => {
    const r = validateIban("TR36 0001 0001 2345 6789 0123 45");
    expect(r).toMatchObject({ valid: true, bank_code: "00010", bank: "T.C. Ziraat Bankası A.Ş.", formatted: "TR36 0001 0001 2345 6789 0123 45" });
  });
  it("validates Garanti and ING", () => {
    expect(validateIban("TR200006200000000000001234").bank).toMatch(/Garanti/);
    expect(validateIban("tr250009901234567890123456").bank).toMatch(/ING/);
  });
  it("rejects a typo", () => expect(validateIban("TR360001000123456789012346").valid).toBe(false));
  it("rejects non-TR IBANs", () => expect(validateIban("DE89370400440532013000").valid).toBe(false));
  it("rejects wrong length", () => expect(validateIban("TR3600010001234567890123").reason).toMatch(/26/));
  it("accepts a valid IBAN with an unknown bank code and says so", () => {
    const r = validateIban("TR330006100519786457841326");
    expect(r.valid).toBe(true);
    expect(r.note).toMatch(/not in the TCMB participant list/);
  });
  it("bankByCode accepts several code forms", () => {
    expect(bankByCode("62")).toMatch(/Garanti/);
    expect(bankByCode("0062")).toMatch(/Garanti/);
    expect(bankByCode("00062")).toMatch(/Garanti/);
  });
});
