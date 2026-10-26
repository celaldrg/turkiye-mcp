import { findProvince } from "./geo.js";
import { getJson } from "./http.js";
import { trKey } from "./turkish.js";

/** WMO weather interpretation codes (Open-Meteo). */
const WMO: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 56: "Freezing drizzle", 57: "Dense freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Light showers", 81: "Showers",
  82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm",
  96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
};

/** Provinces whose centre city has a different name than the province. */
const CAPITALS: Record<string, string> = { Hatay: "Antakya", Kocaeli: "İzmit", Sakarya: "Adapazarı" };

interface GeoResult { name: string; latitude: number; longitude: number; admin1?: string; admin2?: string; feature_code?: string; population?: number; country_code: string }

/** Resolve a place in Türkiye to coordinates with Open-Meteo's free geocoding API. */
export async function geocodeTR(city: string, district?: string): Promise<GeoResult> {
  const province = findProvince(city);
  if (!province) throw new Error(`Unknown province "${city}". Use one of the 81 provinces, e.g. "İzmir".`);
  const name = district ?? CAPITALS[province.name] ?? province.name;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=100&language=tr&format=json&countryCode=TR`;
  const res = await getJson<{ results?: GeoResult[] }>(url);
  const pk = trKey(province.name);
  const nk = trKey(name);
  const inProvince = (res.results ?? []).filter((r) => r.country_code === "TR" && trKey((r.admin1 ?? "").replace(/ (İli|Province)$/u, "")) === pk);
  // Score: exact name + inside the district of the same name (the district centre) beats a same-named village elsewhere.
  const score = (r: GeoResult) =>
    (trKey(r.name) === nk ? 100 : 0) +
    (trKey(r.admin2 ?? "").startsWith(nk) ? 50 : 0) +
    ((r.feature_code ?? "").startsWith("PPLA") || (r.feature_code ?? "").startsWith("PPLC") ? 20 : 0) +
    ((r.feature_code ?? "").startsWith("PPL") ? 5 : 0) +
    Math.min(10, Math.log10((r.population ?? 0) + 1));
  const match = inProvince.sort((a, b) => score(b) - score(a))[0];
  if (!match || trKey(match.name) !== nk) throw new Error(`Could not locate ${district ? `${district}, ` : ""}${province.name}.`);
  return match;
}

export async function weather(city: string, district?: string, days = 3) {
  const place = await geocodeTR(city, district);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
    `&timezone=Europe%2FIstanbul&forecast_days=${days}`;
  type R = {
    current: { time: string; temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number };
    daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; precipitation_probability_max: (number | null)[] };
  };
  const r = await getJson<R>(url);
  return {
    place: `${place.name}${place.admin1 && place.admin1 !== place.name ? `, ${place.admin1}` : ""}`,
    latitude: place.latitude,
    longitude: place.longitude,
    current: {
      time_tr: r.current.time,
      temperature_c: r.current.temperature_2m,
      feels_like_c: r.current.apparent_temperature,
      humidity_pct: r.current.relative_humidity_2m,
      wind_kmh: r.current.wind_speed_10m,
      condition: WMO[r.current.weather_code] ?? `WMO code ${r.current.weather_code}`,
    },
    daily: r.daily.time.map((t, i) => ({
      date: t,
      condition: WMO[r.daily.weather_code[i]] ?? `WMO code ${r.daily.weather_code[i]}`,
      min_c: r.daily.temperature_2m_min[i],
      max_c: r.daily.temperature_2m_max[i],
      precipitation_mm: r.daily.precipitation_sum[i],
      precipitation_probability_pct: r.daily.precipitation_probability_max[i],
    })),
    source: "Open-Meteo (https://open-meteo.com), CC BY 4.0. Free for non-commercial use.",
  };
}
