import type {
  ApiErrorBody,
  MarkerResponse,
  NeighborhoodDetail,
  NeighborhoodSummary,
  PropertyDetail,
  SearchResponse,
  Suggestion,
} from "./types";
import { filtersToParams, type Bounds, type Filters } from "./filters";

export class ApiError extends Error {
  status: number;
  code: string;
  details: string[];
  constructor(status: number, body: Partial<ApiErrorBody> | null, fallback: string) {
    super(body?.message ?? fallback);
    this.status = status;
    this.code = body?.code ?? "error";
    this.details = body?.details ?? [];
  }
}

/** Thin fetch wrapper. Paths are same-origin /api/v1/... (proxied to the backend by next.config.ts). */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { Accept: "application/json", ...(init.headers ?? {}) } });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, null, "Could not reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    let body: Partial<ApiErrorBody> | null = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, body, `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function apiQuery(filters: Filters, bounds: Bounds | null, extra: Record<string, string | number> = {}): string {
  const p = filtersToParams(filters);
  // A neighbourhood filter is itself the geographic constraint, so the viewport is not applied on top of it.
  if (bounds && !filters.neighborhood) {
    p.set("west", bounds.west.toFixed(5));
    p.set("south", bounds.south.toFixed(5));
    p.set("east", bounds.east.toFixed(5));
    p.set("north", bounds.north.toFixed(5));
  }
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
}

export const fetchMarkers = (f: Filters, b: Bounds | null, signal?: AbortSignal) => {
  const p = new URLSearchParams(apiQuery(f, b));
  p.delete("sort");
  return apiFetch<MarkerResponse>(`/api/v1/properties/markers?${p}`, { signal });
};

export const fetchProperties = (f: Filters, b: Bounds | null, page: number, signal?: AbortSignal) =>
  apiFetch<SearchResponse>(`/api/v1/properties?${apiQuery(f, b, { page, size: 24 })}`, { signal });

export const fetchProperty = (slug: string, signal?: AbortSignal) =>
  apiFetch<PropertyDetail>(`/api/v1/properties/${encodeURIComponent(slug)}`, { signal });

export const fetchNeighborhoods = () => apiFetch<NeighborhoodSummary[]>("/api/v1/neighborhoods");

export const fetchNeighborhood = (slug: string) =>
  apiFetch<NeighborhoodDetail>(`/api/v1/neighborhoods/${encodeURIComponent(slug)}`);

export const fetchSuggestions = (q: string, signal?: AbortSignal) =>
  apiFetch<Suggestion[]>(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}`, { signal });

export interface InquiryInput {
  listingId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  website?: string;
}

export const postInquiry = (input: InquiryInput) =>
  apiFetch<{ status: string }>("/api/v1/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
