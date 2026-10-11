package az.investin.admin;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Requirements that must hold before a listing may become public. Pure logic, unit tested. */
public final class PublishRules {
    private PublishRules() {}

    public record Candidate(
            String description, String propertyType, java.math.BigDecimal areaSqm, java.math.BigDecimal landAreaSqm,
            Instant lastCheckedAt, String sourcePermissionStatus, int mediaCount, boolean hasPrimaryMedia,
            long mediaMissingRights, long mediaMissingAlt) {}

    public static List<String> problems(Candidate c) {
        List<String> p = new ArrayList<>();
        if (c.description() == null || c.description().trim().length() < 20) p.add("Description of at least 20 characters is required");
        if ("land".equals(c.propertyType())) {
            if (c.landAreaSqm() == null) p.add("Land area is required for land");
        } else if (c.areaSqm() == null) {
            p.add("Floor area is required for " + c.propertyType());
        }
        if (c.lastCheckedAt() == null) p.add("A last-checked date is required");
        else if (c.lastCheckedAt().isAfter(Instant.now().plusSeconds(300))) p.add("Last-checked date cannot be in the future");
        if (!List.of("granted", "not_required", "demonstration_only").contains(c.sourcePermissionStatus())) {
            p.add("The data source does not have permission to publish (status: " + c.sourcePermissionStatus() + ")");
        }
        if (c.mediaCount() == 0) p.add("At least one image is required");
        else {
            if (!c.hasPrimaryMedia()) p.add("A primary image must be selected");
            if (c.mediaMissingRights() > 0) p.add("Every image needs a rights reference (" + c.mediaMissingRights() + " missing)");
            if (c.mediaMissingAlt() > 0) p.add("Every image needs alt text (" + c.mediaMissingAlt() + " missing)");
        }
        return p;
    }
}
