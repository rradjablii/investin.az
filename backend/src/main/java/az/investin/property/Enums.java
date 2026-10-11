package az.investin.property;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/** Namespace for the small controlled vocabularies that mirror the database CHECK constraints. */
public final class Enums {
    private Enums() {}

    public static final Set<String> PROPERTY_TYPES = Set.of("apartment", "house", "land", "commercial");
    public static final Set<String> CONSTRUCTION_STATUSES = Set.of("completed", "under_construction", "off_plan");
    public static final Set<String> CURRENCIES = Set.of("AZN", "USD", "EUR", "GBP", "RUB", "TRY");
    public static final Set<String> PRECISIONS = Set.of("exact", "approximate");

    public static Optional<String> normalize(String value, Set<String> allowed) {
        if (value == null) return Optional.empty();
        String v = value.trim().toLowerCase(Locale.ROOT);
        return allowed.contains(v) ? Optional.of(v) : Optional.empty();
    }

    public static String joinAllowed(Set<String> allowed) {
        return String.join(", ", Arrays.stream(allowed.toArray(String[]::new)).sorted().toList());
    }
}
