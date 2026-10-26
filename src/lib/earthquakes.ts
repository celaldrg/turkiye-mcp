import { getJson, httpGet } from "./http.js";

export interface Earthquake {
  source: "AFAD" | "Kandilli";
  /** ISO 8601 timestamp in UTC */
  time_utc: string;
  /** Local time in Türkiye (UTC+3), "YYYY-MM-DD HH:mm:ss" */
  time_tr: string;
  magnitude: number;
  magnitude_type: string;
  depth_km: number;
  latitude: number;
  longitude: number;
  location: string;
  province?: string;
  event_id?: string;
}

const AFAD_URL = "https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter";
const KANDILLI_URL = "http://www.koeri.boun.edu.tr/scripts/lst0.asp";

const pad = (n: number) => String(n).padStart(2, "0");
function fmtUtcNoZ(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
function trLocal(d: Date): string {
  const t = new Date(d.getTime() + 3 * 3600_000);
  return fmtUtcNoZ(t).replace("T", " ");
}

interface AfadEvent {
  eventID: string; location: string; latitude: string; longitude: string; depth: string;
  type: string; magnitude: string; province?: string | null; date: string;
}

/** AFAD event API. The `date` field is in UTC. */
export function mapAfad(e: AfadEvent): Earthquake {
  const d = new Date(`${e.date}Z`);
  return {
    source: "AFAD",
    time_utc: d.toISOString(),
    time_tr: trLocal(d),
    magnitude: Number(e.magnitude),
    magnitude_type: e.type,
    depth_km: Number(e.depth),
    latitude: Number(e.latitude),
    longitude: Number(e.longitude),
    location: e.location,
    ...(e.province ? { province: e.province } : {}),
    event_id: e.eventID,
  };
}

export async function fetchAfad(opts: { hours: number; minMagnitude: number; limit: number }, now = new Date()): Promise<Earthquake[]> {
  const start = new Date(now.getTime() - opts.hours * 3600_000);
  const url = `${AFAD_URL}?start=${fmtUtcNoZ(start)}&end=${fmtUtcNoZ(now)}&minmag=${opts.minMagnitude}&orderby=timedesc&limit=${opts.limit}`;
  const data = await getJson<AfadEvent[]>(url, 20000);
  if (!Array.isArray(data)) throw new Error("Unexpected AFAD response.");
  return data.map(mapAfad).filter((q) => q.magnitude >= opts.minMagnitude).slice(0, opts.limit);
}

/** Parse Kandilli Observatory's plain-text list. Kandilli times are Türkiye local time (UTC+3). */
export function parseKandilli(text: string): Earthquake[] {
  const out: Earthquake[] = [];
  const re = /^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}):(\d{2})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+?)\s{2,}(\S.*)?$/;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const [, y, mo, d, hh, mi, ss, lat, lon, depth, md, ml, mw, place] = m;
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +hh - 3, +mi, +ss));
    const mags: [string, string][] = [["Mw", mw], ["ML", ml], ["MD", md]];
    const best = mags.find(([, v]) => v !== "-.-" && Number.isFinite(Number(v)));
    if (!best) continue;
    const prov = place.match(/\(([^)]+)\)\s*$/)?.[1];
    out.push({
      source: "Kandilli",
      time_utc: utc.toISOString(),
      time_tr: `${y}-${mo}-${d} ${hh}:${mi}:${ss}`,
      magnitude: Number(best[1]),
      magnitude_type: best[0],
      depth_km: Number(depth),
      latitude: Number(lat),
      longitude: Number(lon),
      location: place.trim(),
      ...(prov ? { province: prov } : {}),
    });
  }
  return out;
}

export async function fetchKandilli(opts: { hours: number; minMagnitude: number; limit: number }, now = new Date()): Promise<Earthquake[]> {
  const buf = await (await httpGet(KANDILLI_URL, 20000)).arrayBuffer();
  // The page has historically been served as windows-1254; fall back to it if UTF-8 decoding fails.
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("\uFFFD")) text = new TextDecoder("windows-1254").decode(buf);
  const since = now.getTime() - opts.hours * 3600_000;
  return parseKandilli(text)
    .filter((q) => q.magnitude >= opts.minMagnitude && Date.parse(q.time_utc) >= since)
    .slice(0, opts.limit);
}

export const EARTHQUAKE_SOURCES = { AFAD: AFAD_URL, Kandilli: KANDILLI_URL };
