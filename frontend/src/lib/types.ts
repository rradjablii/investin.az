export type PropertyType = "apartment" | "house" | "land" | "commercial";
export type ConstructionStatus = "completed" | "under_construction" | "off_plan";
export type CurrencyCode = "AZN" | "USD" | "EUR" | "GBP" | "RUB" | "TRY";

export interface NeighborhoodRef {
  slug: string;
  name: string;
}

export interface Image {
  url: string;
  alt: string;
}

export interface PropertySummary {
  slug: string;
  listingId: string;
  title: string;
  propertyType: PropertyType;
  latitude: number;
  longitude: number;
  locationPrecision: "exact" | "approximate";
  neighborhood: NeighborhoodRef | null;
  addressText: string | null;
  areaSqm: number | null;
  landAreaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  constructionStatus: ConstructionStatus | null;
  askingPrice: number;
  currency: CurrencyCode;
  primaryImage: Image | null;
  publishedAt: string | null;
  lastCheckedAt: string | null;
  demonstration: boolean;
}

export interface Marker {
  slug: string;
  latitude: number;
  longitude: number;
  askingPrice: number;
  currency: CurrencyCode;
  propertyType: PropertyType;
}

export interface MarkerResponse {
  markers: Marker[];
  total: number;
  truncated: boolean;
}

export interface SearchResponse {
  items: PropertySummary[];
  total: number;
  page: number;
  size: number;
}

export interface SourceInfo {
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  attributionRequirements: string | null;
  demonstration: boolean;
}

export interface VerificationInfo {
  kind: string;
  label: string;
  performedAt: string;
}

export interface OtherListing {
  listingId: string;
  sourceName: string;
  askingPrice: number;
  currency: CurrencyCode;
  lastCheckedAt: string | null;
}

export interface PropertyDetail {
  slug: string;
  listingId: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  latitude: number;
  longitude: number;
  locationPrecision: "exact" | "approximate";
  neighborhood: NeighborhoodRef | null;
  addressText: string | null;
  areaSqm: number | null;
  landAreaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  constructionStatus: ConstructionStatus | null;
  askingPrice: number;
  currency: CurrencyCode;
  amenities: string[];
  developerName: string | null;
  images: Image[];
  source: SourceInfo;
  verifications: VerificationInfo[];
  publishedAt: string | null;
  lastCheckedAt: string | null;
  sourceUpdatedAt: string | null;
  otherListings: OtherListing[];
  demonstration: boolean;
}

export interface NeighborhoodSummary {
  slug: string;
  name: string;
  description: string | null;
  centerLatitude: number;
  centerLongitude: number;
  listingCount: number;
}

export interface PriceStats {
  currency: CurrencyCode;
  sampleSize: number;
  min: number;
  median: number;
  max: number;
}

export interface NearbyPlace {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  sourceName: string;
  lastCheckedAt: string;
}

export interface NeighborhoodDetail {
  slug: string;
  name: string;
  description: string | null;
  centerLatitude: number;
  centerLongitude: number;
  boundaryGeoJson: string | null;
  boundarySource: string;
  dataUpdatedAt: string;
  listingCount: number;
  askingPriceStats: PriceStats[];
  statsNote: string;
  nearbyPlaces: NearbyPlace[];
}

export interface Suggestion {
  type: "neighborhood" | "place";
  label: string;
  slug: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  details: string[];
}

// ---- admin ----
export interface ListingForm {
  title: string;
  description: string | null;
  askingPrice: number | null;
  currencyCode: string | null;
  constructionStatus: string | null;
  amenities: string[];
  developerName: string | null;
  dataSourceId: string | null;
  externalReference: string | null;
  lastCheckedAt: string | null;
  sourceUpdatedAt: string | null;
  propertyType: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: string | null;
  neighborhoodSlug: string | null;
  addressText: string | null;
  areaSqm: number | null;
  landAreaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

export interface AdminMedia {
  id: string;
  url: string;
  altText: string;
  displayOrder: number;
  primary: boolean;
  rightsReference: string | null;
  demonstration: boolean;
}

export interface AdminListing {
  id: string;
  propertyId: string;
  propertySlug: string;
  status: string;
  reviewNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stale: boolean;
  demonstration: boolean;
  form: ListingForm;
  media: AdminMedia[];
  verifications: { kind: string; label: string; performedBy: string; performedAt: string; note: string | null }[];
  history: { fromStatus: string | null; toStatus: string; changedBy: string; note: string | null; changedAt: string }[];
  audit: { actor: string; action: string; details: string | null; createdAt: string }[];
}

export interface AdminListingRow {
  id: string;
  propertySlug: string;
  title: string;
  propertyType: string;
  status: string;
  askingPrice: number;
  currency: string;
  neighborhood: string | null;
  updatedAt: string;
  lastCheckedAt: string | null;
  stale: boolean;
  demonstration: boolean;
  reason: string | null;
}

export interface AdminListingPage {
  items: AdminListingRow[];
  total: number;
  page: number;
  size: number;
}

export interface DataSourceItem {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  permissionStatus: string;
  attributionRequirements: string | null;
  updateMethod: string;
  demonstration: boolean;
  lastCheckedAt: string | null;
}

export interface AdminSummary {
  listingsByStatus: Record<string, number>;
  staleCount: number;
  newInquiries: number;
}

export interface InquiryItem {
  id: string;
  listingId: string;
  listingTitle: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
}
