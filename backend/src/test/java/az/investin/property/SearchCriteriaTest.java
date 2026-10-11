package az.investin.property;

import static org.junit.jupiter.api.Assertions.*;

import az.investin.common.ApiException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class SearchCriteriaTest {
    private static SearchCriteria make(Double w, Double s, Double e, Double n, List<String> types, String min, String max, String cur,
                                       Integer minB, Integer maxB, String sort, Integer page, Integer size) {
        return SearchCriteria.validated(w, s, e, n, types, min == null ? null : new BigDecimal(min), max == null ? null : new BigDecimal(max),
                cur, minB, maxB, null, null, null, null, null, sort, page, size);
    }

    @Test
    void defaultsAreApplied() {
        SearchCriteria c = make(null, null, null, null, null, null, null, null, null, null, null, null, null);
        assertEquals("newest", c.sort());
        assertEquals(24, c.size());
        assertEquals(0, c.page());
        assertFalse(c.hasBounds());
    }

    @Test
    void normalisesTypesAndCurrency() {
        SearchCriteria c = make(null, null, null, null, List.of("Apartment,HOUSE"), null, "5", "usd", null, null, null, null, null);
        assertEquals(List.of("apartment", "house"), c.types());
        assertEquals("USD", c.currency());
    }

    @Test
    void rejectsPartialOrInvertedBounds() {
        assertThrows(ApiException.class, () -> make(49.0, null, null, null, null, null, null, null, null, null, null, null, null));
        assertThrows(ApiException.class, () -> make(50.0, 40.0, 49.0, 41.0, null, null, null, null, null, null, null, null, null));
        assertThrows(ApiException.class, () -> make(49.0, 41.0, 50.0, 40.0, null, null, null, null, null, null, null, null, null));
        assertThrows(ApiException.class, () -> make(-200.0, 40.0, 49.0, 41.0, null, null, null, null, null, null, null, null, null));
        assertThrows(ApiException.class, () -> make(0.0, 0.0, 40.0, 40.0, null, null, null, null, null, null, null, null, null), "too large");
    }

    @Test
    void priceNeedsCurrencyAndRangeMustBeOrdered() {
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, "1", null, null, null, null, null, null, null));
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, "10", "5", "USD", null, null, null, null, null));
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, "-1", null, "USD", null, null, null, null, null));
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, "XXX", null, null, null, null, null));
    }

    @Test
    void priceSortNeedsCurrency() {
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, null, null, null, "price_asc", null, null));
        assertTrue(make(null, null, null, null, null, null, null, "AZN", null, null, "price_asc", null, null).sortsByPrice());
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, null, null, null, "bogus", null, null));
    }

    @Test
    void bedroomsAndPaginationBounds() {
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, null, 3, 2, null, null, null));
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, null, -1, null, null, null, null));
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, null, null, null, null, -1, null));
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, null, null, null, null, null, 101));
        assertThrows(ApiException.class, () -> make(null, null, null, null, null, null, null, null, null, null, null, null, 0));
    }

    @Test
    void reportsEveryProblemAtOnce() {
        ApiException e = assertThrows(ApiException.class, () -> make(null, null, null, null, List.of("castle"), "1", null, null, 5, 1, null, null, null));
        assertTrue(e.details().size() >= 3, e.details().toString());
    }
}
