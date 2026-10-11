package az.investin.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AdminDtos {
    private AdminDtos() {}

    public record MediaItem(UUID id, String url, String altText, int displayOrder, boolean primary, String rightsReference, boolean demonstration) {}

    public record HistoryItem(String fromStatus, String toStatus, String changedBy, String note, Instant changedAt) {}

    public record VerificationItem(String kind, String label, String performedBy, Instant performedAt, String note) {}

    public record AuditItem(String actor, String action, String details, Instant createdAt) {}

    public record AdminListing(
            UUID id, UUID propertyId, String propertySlug, String status, String reviewNote,
            Instant publishedAt, Instant createdAt, Instant updatedAt, boolean stale, boolean demonstration,
            ListingForm form, List<MediaItem> media, List<VerificationItem> verifications,
            List<HistoryItem> history, List<AuditItem> audit) {}

    public record ListingRow(UUID id, String propertySlug, String title, String propertyType, String status,
                             BigDecimal askingPrice, String currency, String neighborhood, Instant updatedAt,
                             Instant lastCheckedAt, boolean stale, boolean demonstration, String reason) {}

    public record ListingPage(List<ListingRow> items, long total, int page, int size) {}

    public record DataSourceItem(UUID id, String name, String sourceType, String sourceUrl, String permissionStatus,
                                 String attributionRequirements, String updateMethod, boolean demonstration, Instant lastCheckedAt) {}

    public record Summary(java.util.Map<String, Long> listingsByStatus, long staleCount, long newInquiries) {}

    public record InquiryItem(UUID id, UUID listingId, String listingTitle, String name, String email, String phone,
                              String message, String status, Instant createdAt) {}
}
