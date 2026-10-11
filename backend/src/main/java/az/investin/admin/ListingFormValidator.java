package az.investin.admin;

import az.investin.common.ApiException;
import az.investin.property.Enums;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;

/** Field-level rules every stored listing must satisfy (drafts included). Pure logic, unit tested. */
public final class ListingFormValidator {
    private static final BigDecimal MAX_PRICE = new BigDecimal("9999999999999.99");

    private ListingFormValidator() {}

    public static List<String> errors(ListingForm f) {
        List<String> e = new ArrayList<>();
        if (f.title() == null || f.title().trim().length() < 3 || f.title().length() > 200) e.add("title must be 3-200 characters");
        if (f.description() != null && f.description().length() > 10000) e.add("description is too long");
        if (f.askingPrice() == null || f.askingPrice().signum() <= 0) e.add("askingPrice must be a positive number");
        else if (f.askingPrice().compareTo(MAX_PRICE) > 0 || f.askingPrice().scale() > 2) e.add("askingPrice must have at most 2 decimals and be below 10^13");
        if (f.currencyCode() == null || !Enums.CURRENCIES.contains(f.currencyCode())) e.add("currencyCode must be one of " + Enums.joinAllowed(Enums.CURRENCIES));
        if (f.constructionStatus() != null && !Enums.CONSTRUCTION_STATUSES.contains(f.constructionStatus())) e.add("constructionStatus is invalid");
        if (f.dataSourceId() == null) e.add("dataSourceId is required");
        if (f.propertyType() == null || !Enums.PROPERTY_TYPES.contains(f.propertyType())) e.add("propertyType must be one of " + Enums.joinAllowed(Enums.PROPERTY_TYPES));
        if (f.latitude() == null || f.latitude() < -90 || f.latitude() > 90) e.add("latitude must be between -90 and 90");
        if (f.longitude() == null || f.longitude() < -180 || f.longitude() > 180) e.add("longitude must be between -180 and 180");
        if (f.locationPrecision() != null && !Enums.PRECISIONS.contains(f.locationPrecision())) e.add("locationPrecision must be exact or approximate");
        positive(f.areaSqm(), "areaSqm", e);
        positive(f.landAreaSqm(), "landAreaSqm", e);
        if (f.bedrooms() != null && (f.bedrooms() < 0 || f.bedrooms() > 50)) e.add("bedrooms must be 0-50 (leave empty if unknown)");
        if (f.bathrooms() != null && (f.bathrooms() < 0 || f.bathrooms() > 50)) e.add("bathrooms must be 0-50 (leave empty if unknown)");
        if ("land".equals(f.propertyType()) && (f.bedrooms() != null || f.bathrooms() != null || f.areaSqm() != null)) {
            e.add("land has no bedrooms, bathrooms or floor area; use landAreaSqm");
        }
        if (f.amenities() != null) {
            if (f.amenities().size() > 30) e.add("at most 30 amenities");
            if (f.amenities().stream().anyMatch(a -> a == null || a.isBlank() || a.length() > 60)) e.add("each amenity must be 1-60 characters");
        }
        if (f.externalReference() != null && f.externalReference().length() > 120) e.add("externalReference is too long");
        return e;
    }

    public static void validateOrThrow(ListingForm f) {
        List<String> e = errors(f);
        if (!e.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "validation_failed", "Listing validation failed", e);
    }

    private static void positive(BigDecimal v, String name, List<String> e) {
        if (v != null && v.signum() <= 0) e.add(name + " must be greater than zero (leave empty if unknown)");
    }
}
