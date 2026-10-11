import type { ConstructionStatus, CurrencyCode, PropertyType } from "./types";

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

export const CONSTRUCTION_STATUSES: { value: ConstructionStatus; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "under_construction", label: "Under construction" },
  { value: "off_plan", label: "Off-plan" },
];

export const CURRENCIES: CurrencyCode[] = ["USD", "AZN", "EUR", "GBP", "RUB", "TRY"];

export const FRESHNESS_OPTIONS = [
  { value: 7, label: "Checked in the last 7 days" },
  { value: 30, label: "Checked in the last 30 days" },
  { value: 90, label: "Checked in the last 90 days" },
];

export type SortKey = "newest" | "updated" | "price_asc" | "price_desc";

export const SORT_OPTIONS: { value: SortKey; label: string; needsCurrency?: boolean }[] = [
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Recently checked" },
  { value: "price_asc", label: "Price: low to high", needsCurrency: true },
  { value: "price_desc", label: "Price: high to low", needsCurrency: true },
];

/** Query-string names intentionally equal the API parameter names. */
export interface Filters {
  type: PropertyType[];
  currency: CurrencyCode | null;
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  minArea: number | null;
  maxArea: number | null;
  constructionStatus: ConstructionStatus[];
  neighborhood: string | null;
  freshnessDays: number | null;
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = {
  type: [],
  currency: null,
  minPrice: null,
  maxPrice: null,
  minBedrooms: null,
  maxBedrooms: null,
  minArea: null,
  maxArea: null,
  constructionStatus: [],
  neighborhood: null,
  freshnessDays: null,
  sort: "newest",
};

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ViewState {
  lat: number;
  lng: number;
  zoom: number;
}

type ParamSource = { get(name: string): string | null; getAll(name: string): string[] };

function num(v: string | null, opts: { int?: boolean; min?: number } = {}): number | null {
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (opts.int && !Number.isInteger(n)) return null;
  if (opts.min !== undefined && n < opts.min) return null;
  return n;
}

function list<T extends string>(src: ParamSource, name: string, allowed: readonly T[]): T[] {
  const out: T[] = [];
  for (const raw of src.getAll(name)) {
    for (const part of raw.split(",")) {
      const v = part.trim() as T;
      if (allowed.includes(v) && !out.includes(v)) out.push(v);
    }
  }
  return out;
}

/** Lenient: unknown or malformed values are dropped rather than throwing, so a hand-edited URL never breaks the page. */
export function parseFilters(src: ParamSource): Filters {
  const cur = src.get("currency")?.toUpperCase() as CurrencyCode | undefined;
  const sort = src.get("sort") as SortKey | null;
  const currency = cur && CURRENCIES.includes(cur) ? cur : null;
  const hasPriceSort = sort === "price_asc" || sort === "price_desc";
  return {
    type: list(src, "type", PROPERTY_TYPES.map((t) => t.value)),
    currency,
    minPrice: num(src.get("minPrice"), { min: 0 }),
    maxPrice: num(src.get("maxPrice"), { min: 0 }),
    minBedrooms: num(src.get("minBedrooms"), { int: true, min: 0 }),
    maxBedrooms: num(src.get("maxBedrooms"), { int: true, min: 0 }),
    minArea: num(src.get("minArea"), { min: 0 }),
    maxArea: num(src.get("maxArea"), { min: 0 }),
    constructionStatus: list(src, "constructionStatus", CONSTRUCTION_STATUSES.map((t) => t.value)),
    neighborhood: (src.get("neighborhood") ?? "").trim() || null,
    freshnessDays: num(src.get("freshnessDays"), { int: true, min: 1 }),
    // price sorting is meaningless without a currency, so fall back instead of sending a request the API rejects
    sort: SORT_OPTIONS.some((o) => o.value === sort) && !(hasPriceSort && !currency) ? (sort as SortKey) : "newest",
  };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  f.type.forEach((t) => p.append("type", t));
  if (f.currency) p.set("currency", f.currency);
  if (f.minPrice !== null) p.set("minPrice", String(f.minPrice));
  if (f.maxPrice !== null) p.set("maxPrice", String(f.maxPrice));
  if (f.minBedrooms !== null) p.set("minBedrooms", String(f.minBedrooms));
  if (f.maxBedrooms !== null) p.set("maxBedrooms", String(f.maxBedrooms));
  if (f.minArea !== null) p.set("minArea", String(f.minArea));
  if (f.maxArea !== null) p.set("maxArea", String(f.maxArea));
  f.constructionStatus.forEach((s) => p.append("constructionStatus", s));
  if (f.neighborhood) p.set("neighborhood", f.neighborhood);
  if (f.freshnessDays !== null) p.set("freshnessDays", String(f.freshnessDays));
  if (f.sort !== "newest") p.set("sort", f.sort);
  return p;
}

export type FilterErrors = Partial<Record<"price" | "bedrooms" | "area" | "currency", string>>;

export function validateFilters(f: Filters): FilterErrors {
  const e: FilterErrors = {};
  if ((f.minPrice !== null || f.maxPrice !== null) && !f.currency) {
    e.currency = "Choose a currency to filter by price";
  }
  if (f.minPrice !== null && f.maxPrice !== null && f.minPrice > f.maxPrice) e.price = "Minimum price is higher than maximum";
  if (f.minBedrooms !== null && f.maxBedrooms !== null && f.minBedrooms > f.maxBedrooms) e.bedrooms = "Minimum bedrooms is higher than maximum";
  if (f.minArea !== null && f.maxArea !== null && f.minArea > f.maxArea) e.area = "Minimum area is higher than maximum";
  if (f.sort.startsWith("price") && !f.currency) e.currency = "Choose a currency to sort by price";
  return e;
}

export function hasErrors(e: FilterErrors): boolean {
  return Object.keys(e).length > 0;
}

export interface FilterChip {
  id: string;
  label: string;
}

export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function activeChips(f: Filters, hoodName?: string): FilterChip[] {
  const chips: FilterChip[] = [];
  f.type.forEach((t) => chips.push({ id: `type:${t}`, label: PROPERTY_TYPES.find((x) => x.value === t)?.label ?? t }));
  if (f.minPrice !== null || f.maxPrice !== null) {
    const lo = f.minPrice !== null ? formatCompactNumber(f.minPrice) : "";
    const hi = f.maxPrice !== null ? formatCompactNumber(f.maxPrice) : "";
    const range = lo && hi ? `${lo}–${hi}` : lo ? `from ${lo}` : `up to ${hi}`;
    chips.push({ id: "price", label: `${f.currency ?? ""} ${range}`.trim() });
  } else if (f.currency) {
    chips.push({ id: "currency", label: `Currency ${f.currency}` });
  }
  if (f.minBedrooms !== null || f.maxBedrooms !== null) {
    const lo = f.minBedrooms, hi = f.maxBedrooms;
    chips.push({ id: "bedrooms", label: lo !== null && hi !== null ? `${lo}–${hi} bd` : lo !== null ? `${lo}+ bd` : `up to ${hi} bd` });
  }
  if (f.minArea !== null || f.maxArea !== null) {
    const lo = f.minArea, hi = f.maxArea;
    chips.push({ id: "area", label: lo !== null && hi !== null ? `${lo}–${hi} m²` : lo !== null ? `${lo}+ m²` : `up to ${hi} m²` });
  }
  f.constructionStatus.forEach((s) =>
    chips.push({ id: `cs:${s}`, label: CONSTRUCTION_STATUSES.find((x) => x.value === s)?.label ?? s }),
  );
  if (f.neighborhood) chips.push({ id: "neighborhood", label: hoodName ?? f.neighborhood });
  if (f.freshnessDays !== null) chips.push({ id: "fresh", label: `Checked ≤ ${f.freshnessDays}d` });
  return chips;
}

export function removeChip(f: Filters, id: string): Filters {
  const [kind, value] = id.split(":");
  switch (kind) {
    case "type": return { ...f, type: f.type.filter((t) => t !== value) };
    case "cs": return { ...f, constructionStatus: f.constructionStatus.filter((s) => s !== value) };
    case "price": return { ...f, minPrice: null, maxPrice: null, sort: f.sort.startsWith("price") ? f.sort : f.sort };
    case "currency": return { ...f, currency: null, sort: f.sort.startsWith("price") ? "newest" : f.sort };
    case "bedrooms": return { ...f, minBedrooms: null, maxBedrooms: null };
    case "area": return { ...f, minArea: null, maxArea: null };
    case "neighborhood": return { ...f, neighborhood: null };
    case "fresh": return { ...f, freshnessDays: null };
    default: return f;
  }
}

export function filterCount(f: Filters): number {
  return activeChips(f).length;
}

// ---- viewport in the URL ----

export function parseView(src: ParamSource): ViewState | null {
  const lat = num(src.get("lat")), lng = num(src.get("lng")), zoom = num(src.get("z"));
  if (lat === null || lng === null || zoom === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || zoom < 0 || zoom > 22) return null;
  return { lat, lng, zoom };
}

export function viewToParams(v: ViewState, p: URLSearchParams): void {
  p.set("lat", v.lat.toFixed(4));
  p.set("lng", v.lng.toFixed(4));
  p.set("z", v.zoom.toFixed(2));
}

export function boundsKey(b: Bounds | null): string {
  return b ? [b.west, b.south, b.east, b.north].map((n) => n.toFixed(3)).join(",") : "none";
}

/** Total span guard mirrors the backend limit (5°). */
export function clampBounds(b: Bounds): Bounds {
  const span = 5;
  const cx = (b.west + b.east) / 2, cy = (b.south + b.north) / 2;
  return {
    west: Math.max(-180, b.east - b.west > span ? cx - span / 2 : b.west),
    east: Math.min(180, b.east - b.west > span ? cx + span / 2 : b.east),
    south: Math.max(-90, b.north - b.south > span ? cy - span / 2 : b.south),
    north: Math.min(90, b.north - b.south > span ? cy + span / 2 : b.north),
  };
}
