package az.investin.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Flat admin representation of a listing plus its physical property. Used for create and (merged) PATCH. */
public record ListingForm(
        String title, String description, BigDecimal askingPrice, String currencyCode, String constructionStatus,
        List<String> amenities, String developerName, UUID dataSourceId, String externalReference,
        Instant lastCheckedAt, Instant sourceUpdatedAt,
        String propertyType, Double latitude, Double longitude, String locationPrecision,
        String neighborhoodSlug, String addressText,
        BigDecimal areaSqm, BigDecimal landAreaSqm, Integer bedrooms, Integer bathrooms) {
}
