import type { Marker } from "./types";

const STEP = 0.00026; // ≈ 29 m of latitude per ring

/**
 * Listings that share identical coordinates (common, because approximate locations are rounded) would draw on top of
 * each other. For display only, fan each such group out on a small ring. Selection and links still use the slug;
 * real coordinates are untouched in the data.
 */
export function spreadStacked<T extends Pick<Marker, "slug" | "latitude" | "longitude">>(markers: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const m of markers) {
    const k = `${m.latitude.toFixed(6)},${m.longitude.toFixed(6)}`;
    const g = groups.get(k);
    if (g) g.push(m); else groups.set(k, [m]);
  }
  const out: T[] = [];
  for (const g of groups.values()) {
    if (g.length === 1) { out.push(g[0]); continue; }
    const sorted = [...g].sort((a, b) => a.slug.localeCompare(b.slug)); // deterministic positions
    sorted.forEach((m, i) => {
      const ring = Math.floor(i / 6) + 1;
      const inRing = Math.min(6, sorted.length - (ring - 1) * 6);
      const angle = ((i % 6) / inRing) * 2 * Math.PI + (ring % 2) * 0.5;
      const r = STEP * ring;
      out.push({ ...m, latitude: m.latitude + r * Math.sin(angle), longitude: m.longitude + (r * Math.cos(angle)) / Math.cos((m.latitude * Math.PI) / 180) });
    });
  }
  return out;
}
