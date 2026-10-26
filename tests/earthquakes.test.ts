import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapAfad, parseKandilli } from "../src/lib/earthquakes.js";

describe("Kandilli parser", () => {
  const q = parseKandilli(readFileSync(new URL("./fixtures/kandilli-lst0.txt", import.meta.url), "utf8"));
  it("parses every event line", () => expect(q).toHaveLength(7));
  it("converts Türkiye time to UTC", () => expect(q[0]).toMatchObject({ time_tr: "2026-10-26 14:18:22", time_utc: "2026-10-26T11:18:22.000Z" }));
  it("prefers Mw over ML", () => expect(q[3]).toMatchObject({ magnitude: 2.9, magnitude_type: "Mw", province: "MANISA" }));
  it("handles revised (REVIZE) lines", () => expect(q[5]).toMatchObject({ magnitude: 2.7, location: "SILIFKE ACIKLARI-MERSIN (AKDENIZ)" }));
  it("parses coordinates and depth", () => expect(q[1]).toMatchObject({ latitude: 37.8635, longitude: 35.9367, depth_km: 7.7 }));
});

describe("AFAD mapping", () => {
  it("treats AFAD timestamps as UTC", () => {
    const e = mapAfad({ eventID: "1", location: "Dursunbey (Balıkesir)", latitude: "39.533", longitude: "28.649", depth: "8", type: "ML", magnitude: "2.5", province: "Balıkesir", district: "Dursunbey", date: "2026-10-26T11:59:14" } as never);
    expect(e).toMatchObject({ time_utc: "2026-10-26T11:59:14.000Z", time_tr: "2026-10-26 14:59:14", magnitude: 2.5, province: "Balıkesir", latitude: 39.533 });
  });
});
