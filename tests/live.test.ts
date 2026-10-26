/**
 * Live tests against the real public APIs. Skipped unless LIVE=1:
 *   LIVE=1 npx vitest run tests/live.test.ts
 */
import { describe, expect, it } from "vitest";
import { fetchAfad, fetchKandilli } from "../src/lib/earthquakes.js";
import { prayerTimes } from "../src/lib/prayer.js";
import { fetchRates } from "../src/lib/tcmb.js";
import { weather } from "../src/lib/weather.js";

const live = process.env.LIVE === "1";
const T = 60_000;

describe.skipIf(!live)("live APIs", () => {
  it("TCMB latest", async () => {
    const b = await fetchRates();
    expect(b.rates.length).toBeGreaterThan(15);
    expect(b.rates.find((r) => r.code === "USD")?.forex_selling).toBeGreaterThan(0);
  }, T);
  it("TCMB historical (weekend falls back)", async () => {
    const b = await fetchRates("2025-01-04");
    expect(b.bulletin_date).toBe("2025-01-03");
  }, T);
  it("AFAD", async () => {
    const q = await fetchAfad({ hours: 72, minMagnitude: 0, limit: 5 });
    expect(q.length).toBeGreaterThan(0);
    expect(q[0].time_utc).toMatch(/Z$/);
  }, T);
  it.skipIf(process.env.SKIP_KANDILLI === "1")("Kandilli", async () => {
    const q = await fetchKandilli({ hours: 72, minMagnitude: 0, limit: 5 });
    expect(q.length).toBeGreaterThan(0);
  }, T);
  it("prayer times", async () => {
    const p = await prayerTimes("Ankara", "Çankaya");
    expect(p.times.ogle).toMatch(/^\d\d:\d\d$/);
  }, T);
  it("weather", async () => {
    const w = await weather("İzmir");
    expect(typeof w.current.temperature_c).toBe("number");
  }, T);
});
