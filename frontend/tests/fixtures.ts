import type { Marker, PropertyDetail, PropertySummary } from "@/lib/types";

export function summary(over: Partial<PropertySummary> = {}): PropertySummary {
  return {
    slug: "flat-1", listingId: "l-1", title: "Sunny flat", propertyType: "apartment", latitude: 40.4, longitude: 49.85,
    locationPrecision: "approximate", neighborhood: { slug: "nasimi", name: "Nasimi" }, addressText: null,
    areaSqm: 60, landAreaSqm: null, bedrooms: 2, bathrooms: 1, constructionStatus: "completed", askingPrice: 120000, currency: "USD",
    primaryImage: { url: "/api/v1/media/demo/demo-1.svg", alt: "Front" }, publishedAt: "2026-09-01T00:00:00Z", lastCheckedAt: "2026-10-01T00:00:00Z",
    demonstration: false, ...over,
  };
}

export function marker(s: PropertySummary): Marker {
  return { slug: s.slug, latitude: s.latitude, longitude: s.longitude, askingPrice: s.askingPrice, currency: s.currency, propertyType: s.propertyType };
}

export function detail(over: Partial<PropertyDetail> = {}): PropertyDetail {
  const s = summary();
  return {
    ...s, description: "A bright flat near the boulevard.", amenities: ["Elevator"], developerName: null,
    images: [{ url: "/api/v1/media/demo/demo-1.svg", alt: "Front" }, { url: "/api/v1/media/demo/demo-2.svg", alt: "Kitchen" }],
    source: { name: "Test agency", sourceType: "agency", sourceUrl: null, attributionRequirements: null, demonstration: false },
    verifications: [], sourceUpdatedAt: null, otherListings: [], ...over,
  } as PropertyDetail;
}
