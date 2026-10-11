import "server-only";
import { BACKEND_URL } from "./config";
import type { NeighborhoodDetail, NeighborhoodSummary, PropertyDetail } from "./types";

/** Server-component fetchers talk to the backend directly. Returns null for 404, throws otherwise. */
async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store", headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend responded ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export const getProperty = (slug: string) => get<PropertyDetail>(`/api/v1/properties/${encodeURIComponent(slug)}`);
export const getNeighborhoods = () => get<NeighborhoodSummary[]>("/api/v1/neighborhoods");
export const getNeighborhood = (slug: string) => get<NeighborhoodDetail>(`/api/v1/neighborhoods/${encodeURIComponent(slug)}`);
