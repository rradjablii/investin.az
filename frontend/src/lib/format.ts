import type { ConstructionStatus, CurrencyCode, PropertyType } from "./types";

const SYMBOLS: Record<CurrencyCode, string> = { AZN: "₼", USD: "$", EUR: "€", GBP: "£", RUB: "₽", TRY: "₺" };

/** Exact asking price in its ORIGINAL currency. Never converted. */
export function formatPrice(amount: number, currency: CurrencyCode): string {
  return `${SYMBOLS[currency] ?? ""}${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(amount)}${SYMBOLS[currency] ? "" : " " + currency}`;
}

/** Short label for map markers, e.g. $245K. The exact value is always shown in previews/cards. */
export function formatMarkerPrice(amount: number, currency: CurrencyCode): string {
  // Marker labels use the map font, which lacks glyphs for ₼ ₽ ₺; fall back to the ISO code there.
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : `${currency} `;
  let short: string;
  if (amount >= 1_000_000) short = `${trim(amount / 1_000_000)}M`;
  else if (amount >= 1_000) short = `${trim(amount / 1_000)}K`;
  else short = String(Math.round(amount));
  return `${sym}${short}`;
}

function trim(n: number): string {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
}

export function formatArea(sqm: number | null): string | null {
  return sqm === null ? null : `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(sqm)} m²`;
}

export const TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment",
  house: "House",
  land: "Land",
  commercial: "Commercial",
};

export const STATUS_LABELS: Record<ConstructionStatus, string> = {
  completed: "Completed",
  under_construction: "Under construction",
  off_plan: "Off-plan",
};

export function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/** Area line for cards: floor area for built property, plot area for land. */
export function areaSummary(p: { propertyType: PropertyType; areaSqm: number | null; landAreaSqm: number | null }): string {
  if (p.propertyType === "land") return formatArea(p.landAreaSqm) ?? "Area unknown";
  const floor = formatArea(p.areaSqm) ?? "Area unknown";
  return p.propertyType === "house" && p.landAreaSqm ? `${floor} · ${formatArea(p.landAreaSqm)} plot` : floor;
}
