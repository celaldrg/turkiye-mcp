import { assertIsoDate, todayTR } from "./dates.js";
import { getJson } from "./http.js";
import { geocodeTR } from "./weather.js";

/**
 * Prayer times computed by the free Aladhan API (https://aladhan.com/prayer-times-api)
 * using calculation method 13 = "Diyanet İşleri Başkanlığı, Turkey".
 * Values can differ from Diyanet's official published times by a minute or two.
 */
export async function prayerTimes(city: string, district?: string, date?: string) {
  const d = date ?? todayTR();
  assertIsoDate(d);
  // Resolve coordinates with Open-Meteo geocoding (reliable for Turkish district names), then compute times.
  const place = await geocodeTR(city, district);
  const [y, m, day] = d.split("-");
  const url = `https://api.aladhan.com/v1/timings/${day}-${m}-${y}?latitude=${place.latitude}&longitude=${place.longitude}&method=13&timezonestring=Europe%2FIstanbul`;
  const res = await getJson<{ code: number; data: { timings: Record<string, string>; meta: { method: { name: string }; timezone: string } } }>(url);
  if (res.code !== 200) throw new Error("Aladhan API returned an error.");
  const t = res.data.timings;
  const clean = (v: string) => v.split(" ")[0];
  return {
    date: d,
    place: `${place.name}${place.admin1 && place.admin1 !== place.name ? `, ${place.admin1}` : ""}`,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: res.data.meta.timezone,
    times: {
      imsak: clean(t.Imsak), gunes: clean(t.Sunrise), ogle: clean(t.Dhuhr),
      ikindi: clean(t.Asr), aksam: clean(t.Maghrib), yatsi: clean(t.Isha),
    },
    method: res.data.meta.method.name,
    source: "Aladhan API (https://aladhan.com), method 13 (Diyanet)",
    note: "Computed times; may differ from Diyanet's official published times by 1-2 minutes.",
  };
}
