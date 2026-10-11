package az.investin.property;

import java.util.EnumSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Listing lifecycle: Draft → Review → Published, plus Needs review / Unpublished / Archived. */
public enum PublicationStatus {
    DRAFT, REVIEW, NEEDS_REVIEW, PUBLISHED, UNPUBLISHED, ARCHIVED;

    private static final Map<PublicationStatus, Set<PublicationStatus>> ALLOWED = Map.of(
            DRAFT, EnumSet.of(REVIEW, ARCHIVED),
            REVIEW, EnumSet.of(DRAFT, PUBLISHED, ARCHIVED),
            NEEDS_REVIEW, EnumSet.of(REVIEW, PUBLISHED, UNPUBLISHED, ARCHIVED),
            PUBLISHED, EnumSet.of(UNPUBLISHED, NEEDS_REVIEW, ARCHIVED),
            UNPUBLISHED, EnumSet.of(REVIEW, PUBLISHED, ARCHIVED),
            ARCHIVED, EnumSet.of(DRAFT));

    public boolean canTransitionTo(PublicationStatus target) {
        return ALLOWED.get(this).contains(target);
    }

    public String db() { return name().toLowerCase(Locale.ROOT); }

    public static PublicationStatus fromDb(String v) { return valueOf(v.toUpperCase(Locale.ROOT)); }
}
