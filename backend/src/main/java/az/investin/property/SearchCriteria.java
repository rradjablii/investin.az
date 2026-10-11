package az.investin.property;

import az.investin.common.ApiException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Validated public search parameters. Missing attributes are never treated as zero:
 * a bedroom filter excludes properties whose bedroom count is unknown.
 */
public record SearchCriteria(
        Double west, Double south, Double east, Double north,
        List<String> types, BigDecimal minPrice, BigDecimal maxPrice, String currency,
        Integer minBedrooms, Integer maxBedrooms, BigDecimal minArea, BigDecimal maxArea,
        List<String> constructionStatuses, String neighborhood, Integer freshnessDays,
        String sort, int page, int size) {

    public static final int MAX_PAGE_SIZE = 100;
    public static final Double MAX_BBOX_SPAN_DEGREES = 5.0;

    public boolean hasBounds() { return west != null; }

    public boolean sortsByPrice() { return "price_asc".equals(sort) || "price_desc".equals(sort); }

    /** Validates and normalises; throws a 400 ApiException listing every problem. */
    public static SearchCriteria validated(
            Double west, Double south, Double east, Double north,
            List<String> types, BigDecimal minPrice, BigDecimal maxPrice, String currency,
            Integer minBedrooms, Integer maxBedrooms, BigDecimal minArea, BigDecimal maxArea,
            List<String> statuses, String neighborhood, Integer freshnessDays,
            String sort, Integer page, Integer size) {
        List<String> errors = new ArrayList<>();

        boolean anyBound = west != null || south != null || east != null || north != null;
        boolean allBounds = west != null && south != null && east != null && north != null;
        if (anyBound && !allBounds) {
            errors.add("west, south, east and north must be provided together");
        } else if (allBounds) {
            if (south < -90 || north > 90 || south >= north) errors.add("south must be less than north, within -90..90");
            if (west < -180 || east > 180 || west >= east) errors.add("west must be less than east, within -180..180");
            if (errors.isEmpty() && (north - south > MAX_BBOX_SPAN_DEGREES || east - west > MAX_BBOX_SPAN_DEGREES)) {
                errors.add("bounding box is too large");
            }
        }

        List<String> normTypes = normalizeAll(types, Enums.PROPERTY_TYPES, "type", errors);
        List<String> normStatuses = normalizeAll(statuses, Enums.CONSTRUCTION_STATUSES, "constructionStatus", errors);

        String cur = null;
        if (currency != null && !currency.isBlank()) {
            cur = currency.trim().toUpperCase(Locale.ROOT);
            if (!Enums.CURRENCIES.contains(cur)) errors.add("currency must be one of " + Enums.joinAllowed(Enums.CURRENCIES));
        }
        if ((minPrice != null || maxPrice != null) && cur == null) {
            errors.add("currency is required when filtering by price (prices in different currencies are not comparable)");
        }
        if (minPrice != null && minPrice.signum() < 0) errors.add("minPrice must not be negative");
        if (maxPrice != null && maxPrice.signum() < 0) errors.add("maxPrice must not be negative");
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) errors.add("minPrice must not exceed maxPrice");

        if (minBedrooms != null && minBedrooms < 0) errors.add("minBedrooms must not be negative");
        if (maxBedrooms != null && maxBedrooms < 0) errors.add("maxBedrooms must not be negative");
        if (minBedrooms != null && maxBedrooms != null && minBedrooms > maxBedrooms) errors.add("minBedrooms must not exceed maxBedrooms");

        if (minArea != null && minArea.signum() < 0) errors.add("minArea must not be negative");
        if (maxArea != null && maxArea.signum() < 0) errors.add("maxArea must not be negative");
        if (minArea != null && maxArea != null && minArea.compareTo(maxArea) > 0) errors.add("minArea must not exceed maxArea");

        if (freshnessDays != null && (freshnessDays < 1 || freshnessDays > 3650)) errors.add("freshnessDays must be between 1 and 3650");

        String s = sort == null || sort.isBlank() ? "newest" : sort.trim().toLowerCase(Locale.ROOT);
        if (!List.of("newest", "updated", "price_asc", "price_desc").contains(s)) {
            errors.add("sort must be one of newest, updated, price_asc, price_desc");
        } else if ((s.startsWith("price")) && cur == null) {
            errors.add("sorting by price requires a currency filter (prices in different currencies are not comparable)");
        }

        int p = page == null ? 0 : page;
        int sz = size == null ? 24 : size;
        if (p < 0) errors.add("page must not be negative");
        if (sz < 1 || sz > MAX_PAGE_SIZE) errors.add("size must be between 1 and " + MAX_PAGE_SIZE);

        if (!errors.isEmpty()) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "invalid_search", "Invalid search parameters", errors);
        }
        String hood = neighborhood == null || neighborhood.isBlank() ? null : neighborhood.trim().toLowerCase(Locale.ROOT);
        return new SearchCriteria(west, south, east, north, normTypes, minPrice, maxPrice, cur, minBedrooms, maxBedrooms,
                minArea, maxArea, normStatuses, hood, freshnessDays, s, p, sz);
    }

    private static List<String> normalizeAll(List<String> raw, java.util.Set<String> allowed, String name, List<String> errors) {
        if (raw == null || raw.isEmpty()) return List.of();
        List<String> out = new ArrayList<>();
        for (String r : raw) {
            for (String part : r.split(",")) {
                if (part.isBlank()) continue;
                Enums.normalize(part, allowed).ifPresentOrElse(out::add,
                        () -> errors.add(name + " has invalid value '" + part.trim() + "'; allowed: " + Enums.joinAllowed(allowed)));
            }
        }
        return out;
    }
}
