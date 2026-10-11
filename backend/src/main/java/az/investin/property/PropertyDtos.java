package az.investin.property;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class PropertyDtos {
    private PropertyDtos() {}

    public record NeighborhoodRef(String slug, String name) {}

    public record Image(String url, String alt) {}

    /** Compact record for result cards. */
    public record PropertySummary(
            String slug, String listingId, String title, String propertyType,
            double latitude, double longitude, String locationPrecision,
            NeighborhoodRef neighborhood, String addressText,
            BigDecimal areaSqm, BigDecimal landAreaSqm, Integer bedrooms, Integer bathrooms,
            String constructionStatus, BigDecimal askingPrice, String currency,
            Image primaryImage, Instant publishedAt, Instant lastCheckedAt, boolean demonstration) {}

    /** Minimal record for map markers. */
    public record Marker(String slug, double latitude, double longitude, BigDecimal askingPrice, String currency, String propertyType) {}

    public record MarkerResponse(List<Marker> markers, long total, boolean truncated) {}

    public record SearchResponse(List<PropertySummary> items, long total, int page, int size) {}

    public record SourceInfo(String name, String sourceType, String sourceUrl, String attributionRequirements, boolean demonstration) {}

    public record VerificationInfo(String kind, String label, Instant performedAt) {}

    public record OtherListing(String listingId, String sourceName, BigDecimal askingPrice, String currency, Instant lastCheckedAt) {}

    public record PropertyDetail(
            String slug, String listingId, String title, String description, String propertyType,
            double latitude, double longitude, String locationPrecision,
            NeighborhoodRef neighborhood, String addressText,
            BigDecimal areaSqm, BigDecimal landAreaSqm, Integer bedrooms, Integer bathrooms,
            String constructionStatus, BigDecimal askingPrice, String currency,
            List<String> amenities, String developerName,
            List<Image> images, SourceInfo source, List<VerificationInfo> verifications,
            Instant publishedAt, Instant lastCheckedAt, Instant sourceUpdatedAt,
            List<OtherListing> otherListings, boolean demonstration) {}
}
