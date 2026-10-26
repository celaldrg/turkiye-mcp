import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convert, fetchRates, parseTcmbXml, tcmbUrlForDate } from "../src/lib/tcmb.js";
import { HttpError } from "../src/lib/http.js";

const xml = readFileSync(new URL("./fixtures/tcmb-today.xml", import.meta.url), "utf8");

describe("TCMB", () => {
  const b = parseTcmbXml(xml, "https://www.tcmb.gov.tr/kurlar/today.xml");
  it("parses a real bulletin", () => {
    expect(b.bulletin_date).toBe("2026-10-26");
    expect(b.rates).toHaveLength(22);
    expect(b.rates.find((r) => r.code === "USD")).toMatchObject({ forex_buying: 49.6732, forex_selling: 49.7627, unit: 1 });
  });
  it("converts USD to TRY", () => expect(convert(b, 100, "USD", "TRY", "forex_selling").result).toBe(4976.27));
  it("handles 100-unit currencies (JPY)", () => expect(convert(b, 10000, "JPY", "TRY", "forex_selling").result).toBe(3172));
  it("cross-converts via TRY", () => {
    const r = convert(b, 1, "EUR", "USD", "forex_buying");
    expect(r.result).toBeGreaterThan(0.5);
    expect(r.result).toBeLessThan(2);
  });
  it("rejects unknown currencies", () => expect(() => convert(b, 1, "XYZ", "TRY", "forex_selling")).toThrow(/not in the TCMB bulletin/));
  it("builds historical URLs", () => expect(tcmbUrlForDate("2025-01-03")).toBe("https://www.tcmb.gov.tr/kurlar/202501/03012025.xml"));
  it("walks back from a weekend to the previous bulletin", async () => {
    const seen: string[] = [];
    const fake = async (url: string) => {
      seen.push(url);
      if (url.endsWith("/24102026.xml")) return xml.replace("26.10.2026", "23.10.2026");
      throw new HttpError(404, url);
    };
    const r = await fetchRates("2026-10-25", fake).catch((e) => e);
    // 25 Oct (Sun) and 24 Oct (Sat) are not published; the fake returns data on the 24th URL only for this test.
    expect(seen[0]).toContain("25102026.xml");
    expect(r.note).toMatch(/No TCMB bulletin/);
  });
});
