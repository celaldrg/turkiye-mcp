import { describe, expect, it } from "vitest";
import { addBusinessDays, countBusinessDays, dayInfo, holidaysForYear } from "../src/lib/holidays.js";

const dates = (y: number, re: RegExp) => holidaysForYear(y).filter((h) => re.test(h.name_tr)).map((h) => h.date);

describe("public holidays", () => {
  // Expected values from Diyanet's official "Resmi Tatiller" tables.
  it("2026 Ramazan Bayramı (Diyanet: 20-22 March, arefe 19 March)", () => {
    expect(dates(2026, /^Ramazan Bayramı Arifesi/)).toEqual(["2026-03-19"]);
    expect(dates(2026, /^Ramazan Bayramı \d/)).toEqual(["2026-03-20", "2026-03-21", "2026-03-22"]);
  });
  it("2026 Kurban Bayramı (Diyanet: 27-30 May)", () => {
    expect(dates(2026, /^Kurban Bayramı \d/)).toEqual(["2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30"]);
  });
  it("2027 Ramazan Bayramı starts on 9 March (Diyanet table)", () => {
    expect(dates(2027, /^Ramazan Bayramı 1/)).toEqual(["2027-03-09"]);
  });
  it("2033 has two Ramazan Bayramı", () => {
    expect(dates(2033, /^Ramazan Bayramı 1/)).toEqual(["2033-01-02", "2033-12-23"]);
  });
  it("2025 total holiday entries", () => {
    const h = holidaysForYear(2025);
    expect(h.filter((x) => x.type === "national")).toHaveLength(8);
    expect(h.filter((x) => x.duration === "half").map((x) => x.date)).toEqual(["2025-03-29", "2025-06-05", "2025-10-28"]);
  });
  it("rejects unsupported years", () => expect(() => holidaysForYear(2050)).toThrow(/between/));
});

describe("dayInfo / business days", () => {
  it("Republic Day is not a business day", () => expect(dayInfo("2026-10-29").is_business_day).toBe(false));
  it("Oct 28 is a half day but still a business day", () => {
    const d = dayInfo("2026-10-28");
    expect(d.is_business_day).toBe(true);
    expect(d.note).toMatch(/13:00/);
  });
  it("weekend", () => expect(dayInfo("2026-10-31")).toMatchObject({ is_weekend: true, is_business_day: false, weekday: "Saturday" }));
  it("adds business days across Republic Day and a weekend", () => {
    // Tue 27 Oct + 3 => Wed 28 (half), Fri 30, Mon 2 Nov
    expect(addBusinessDays("2026-10-27", 3)).toBe("2026-11-02");
  });
  it("subtracts business days", () => expect(addBusinessDays("2026-11-02", -3)).toBe("2026-10-27"));
  it("counts business days in (start, end]", () => {
    expect(countBusinessDays("2026-05-22", "2026-06-01")).toBe(3); // Mon 25, Tue 26 (arefe, half day), [27-30 Kurban], Sun 31, Mon 1 Jun
    expect(countBusinessDays("2026-06-01", "2026-05-22")).toBe(-3);
  });
});
