import { PROVINCES, type Province } from "../data/provinces.js";
import { trKey } from "./turkish.js";

export { PROVINCES };
export type { Province };

/** Find a province by plate code (1-81, "06") or by name (Turkish-insensitive: "istanbul", "İSTANBUL", "Istanbul"). */
export function findProvince(query: string | number): Province | undefined {
  const q = String(query).trim();
  if (/^\d{1,2}$/.test(q)) return PROVINCES.find((p) => p.plate === Number(q));
  const k = trKey(q);
  return PROVINCES.find((p) => trKey(p.name) === k) ?? PROVINCES.find((p) => k.length >= 3 && trKey(p.name).startsWith(k));
}

export interface DistrictMatch { district: string; province: string; plate: number }

/** Search districts by name across all provinces (exact match first, then prefix, then substring). */
export function findDistricts(query: string, limit = 20): DistrictMatch[] {
  const k = trKey(query);
  if (!k) return [];
  const all: (DistrictMatch & { score: number })[] = [];
  for (const p of PROVINCES) for (const d of p.districts) {
    const dk = trKey(d);
    const score = dk === k ? 0 : dk.startsWith(k) ? 1 : dk.includes(k) ? 2 : -1;
    if (score >= 0) all.push({ district: d, province: p.name, plate: p.plate, score });
  }
  return all.sort((a, b) => a.score - b.score || a.district.localeCompare(b.district, "tr")).slice(0, limit).map(({ score: _s, ...m }) => m);
}

export function plateLabel(plate: number): string { return String(plate).padStart(2, "0"); }
