import { describe, expect, it } from "vitest";
import { findDistricts, findProvince, PROVINCES } from "../src/lib/geo.js";
import { amountToWords, numberToWords, trLower, trSlug, trTitle, trUpper } from "../src/lib/turkish.js";

describe("provinces", () => {
  it("has 81 provinces and 973 districts", () => {
    expect(PROVINCES).toHaveLength(81);
    expect(PROVINCES.reduce((n, p) => n + p.districts.length, 0)).toBe(973);
  });
  it.each([["istanbul"], ["İSTANBUL"], ["Istanbul"], ["34"]])("finds İstanbul by %s", (q) => expect(findProvince(q)?.name).toBe("İstanbul"));
  it("finds by plate with leading zero", () => expect(findProvince("06")?.name).toBe("Ankara"));
  it("finds districts with duplicate names", () => {
    const m = findDistricts("Gölbaşı").filter((x) => x.district === "Gölbaşı").map((x) => x.province);
    expect(m).toEqual(expect.arrayContaining(["Ankara", "Adıyaman"]));
  });
  it("is diacritic-insensitive", () => expect(findDistricts("cankaya")[0]).toMatchObject({ district: "Çankaya", province: "Ankara" }));
});

describe("Turkish text", () => {
  it("upper-cases i correctly", () => expect(trUpper("istanbul ılık")).toBe("İSTANBUL ILIK"));
  it("lower-cases I correctly", () => expect(trLower("ISPARTA İZMİR")).toBe("ısparta izmir"));
  it("title case", () => expect(trTitle("İSTANBUL İLİ ışık")).toBe("İstanbul İli Işık"));
  it("slug", () => expect(trSlug("Çağrı Şükrü Öztürk — İğdır!")).toBe("cagri-sukru-ozturk-igdir"));
  it.each([
    [0, "sıfır"], [1, "bir"], [10, "on"], [100, "yüz"], [101, "yüz bir"], [1000, "bin"], [1001, "bin bir"],
    [1250, "bin iki yüz elli"], [2000, "iki bin"], [100000, "yüz bin"], [1000000, "bir milyon"], [-5, "eksi beş"],
    [1_234_567_890, "bir milyar iki yüz otuz dört milyon beş yüz altmış yedi bin sekiz yüz doksan"],
  ])("numberToWords(%s)", (n, w) => expect(numberToWords(n)).toBe(w));
  it("amount in words", () => {
    expect(amountToWords(1250.5)).toMatchObject({ text: "Bin İki Yüz Elli Türk Lirası Elli Kuruş", compact: "BinİkiYüzElliTL,ElliKr" });
    expect(amountToWords("99,99").text).toBe("Doksan Dokuz Türk Lirası Doksan Dokuz Kuruş");
    expect(amountToWords(1000, "USD").text).toBe("Bin Amerikan Doları");
  });
  it("rejects more than two decimals", () => expect(() => amountToWords("1.234")).toThrow());
});
