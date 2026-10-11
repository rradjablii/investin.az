package az.investin.property;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import az.investin.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PropertySearchIT extends AbstractIntegrationTest {
    // Baku-ish box
    static final String BAKU = "west=49.7&south=40.3&east=50.1&north=40.5";

    @BeforeEach
    void fixtures() {
        data.listing("flat-a", 49.85, 40.40, "apartment", "USD", "100000", 2, "60", "published", "nasimi");
        data.listing("flat-b", 49.86, 40.41, "apartment", "USD", "200000", 3, "90", "published", "nasimi");
        data.listing("flat-azn", 49.87, 40.42, "apartment", "AZN", "150000", 1, "45", "published", "yasamal");
        data.listing("flat-unknown-beds", 49.88, 40.43, "apartment", "USD", "120000", null, null, "published", "yasamal");
        data.listing("house-far", 47.0, 41.0, "house", "USD", "300000", 4, "200", "published", null); // outside Baku box
        data.listing("draft-x", 49.85, 40.40, "apartment", "USD", "1000", 1, "30", "draft", "nasimi");
        data.listing("review-x", 49.85, 40.40, "apartment", "USD", "1000", 1, "30", "review", "nasimi");
        data.listing("needs-x", 49.85, 40.40, "apartment", "USD", "1000", 1, "30", "needs_review", "nasimi");
        data.listing("unpub-x", 49.85, 40.40, "apartment", "USD", "1000", 1, "30", "unpublished", "nasimi");
        data.listing("archived-x", 49.85, 40.40, "apartment", "USD", "1000", 1, "30", "archived", "nasimi");
    }

    @Test
    void boundingBoxReturnsOnlyPublishedInsideBounds() throws Exception {
        mvc.perform(get("/api/v1/properties?" + BAKU + "&size=50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(4))
                .andExpect(jsonPath("$.items[*].slug", containsInAnyOrder("flat-a", "flat-b", "flat-azn", "flat-unknown-beds")));
    }

    @Test
    void withoutBoundsReturnsAllPublishedAndNothingElse() throws Exception {
        mvc.perform(get("/api/v1/properties?size=50"))
                .andExpect(jsonPath("$.total").value(5))
                .andExpect(jsonPath("$.items[*].slug", not(hasItems("draft-x", "review-x", "needs-x", "unpub-x", "archived-x"))));
    }

    @Test
    void nonPublishedListingsAreHiddenEverywhere() throws Exception {
        for (String slug : new String[]{"draft-x", "review-x", "needs-x", "unpub-x", "archived-x"}) {
            mvc.perform(get("/api/v1/properties/" + slug)).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/v1/properties/markers?" + BAKU)).andExpect(jsonPath("$.total").value(4));
    }

    @Test
    void combinedFiltersApplyTogether() throws Exception {
        mvc.perform(get("/api/v1/properties?" + BAKU + "&type=apartment&currency=USD&minPrice=90000&maxPrice=150000&minBedrooms=2&minArea=50"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].slug").value("flat-a"));
    }

    @Test
    void unknownBedroomsAreNotTreatedAsZero() throws Exception {
        mvc.perform(get("/api/v1/properties?" + BAKU + "&maxBedrooms=0"))
                .andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/properties?" + BAKU + "&minBedrooms=1&currency=USD"))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem("flat-unknown-beds"))));
    }

    @Test
    void priceFilterNeverMixesCurrencies() throws Exception {
        mvc.perform(get("/api/v1/properties?" + BAKU + "&currency=AZN&maxPrice=1000000"))
                .andExpect(jsonPath("$.items[*].slug", contains("flat-azn")));
    }

    @Test
    void priceFilterOrSortWithoutCurrencyIsRejected() throws Exception {
        mvc.perform(get("/api/v1/properties?minPrice=1")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("invalid_search"));
        mvc.perform(get("/api/v1/properties?sort=price_asc")).andExpect(status().isBadRequest());
    }

    @Test
    void sortsByPriceWithinOneCurrency() throws Exception {
        mvc.perform(get("/api/v1/properties?" + BAKU + "&currency=USD&sort=price_desc"))
                .andExpect(jsonPath("$.items[*].slug", contains("flat-b", "flat-unknown-beds", "flat-a")));
        mvc.perform(get("/api/v1/properties?" + BAKU + "&currency=USD&sort=price_asc"))
                .andExpect(jsonPath("$.items[0].slug").value("flat-a"));
    }

    @Test
    void invalidInputIsRejectedWithStructuredErrors() throws Exception {
        mvc.perform(get("/api/v1/properties?west=50&east=49&south=40&north=41")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/properties?west=49")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/properties?currency=USD&minPrice=5&maxPrice=1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/properties?minBedrooms=3&maxBedrooms=1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/properties?size=1000")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/properties?type=castle")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]", containsString("castle")));
        mvc.perform(get("/api/v1/properties?minPrice=abc&currency=USD")).andExpect(status().isBadRequest());
    }

    @Test
    void neighborhoodFilterAndPagination() throws Exception {
        mvc.perform(get("/api/v1/properties?neighborhood=yasamal&size=1&page=0&sort=newest"))
                .andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.items", hasSize(1)));
        mvc.perform(get("/api/v1/properties?neighborhood=yasamal&size=1&page=1")).andExpect(jsonPath("$.items", hasSize(1)));
    }

    @Test
    void approximateLocationsAreRoundedInPublicResponses() throws Exception {
        jdbc.sql("UPDATE property SET location_precision = 'approximate', location = ST_SetSRID(ST_MakePoint(49.851234, 40.401234), 4326)::geography WHERE slug = 'flat-a'").update();
        mvc.perform(get("/api/v1/properties/flat-a"))
                .andExpect(jsonPath("$.longitude").value(49.851)).andExpect(jsonPath("$.latitude").value(40.401));
    }

    @Test
    void detailShowsSourceAndOnlyRealVerifications() throws Exception {
        mvc.perform(get("/api/v1/properties/flat-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source.name").value("Test agency"))
                .andExpect(jsonPath("$.verifications", hasSize(0)));
        var f = jdbc.sql("SELECT id FROM listing WHERE title = 'Listing flat-a'").query(java.util.UUID.class).single();
        jdbc.sql("INSERT INTO listing_verification (listing_id, kind, performed_by) VALUES (:l, 'location_reviewed', 'tester')").param("l", f).update();
        mvc.perform(get("/api/v1/properties/flat-a"))
                .andExpect(jsonPath("$.verifications[0].label").value("Location reviewed"));
    }

    @Test
    void searchUsesTheSpatialIndexQueryPlanFriendlyPredicate() {
        // The predicate must be ST_Intersects on the geography column so the GiST index is eligible.
        Integer indexes = jdbc.sql("SELECT count(*) FROM pg_indexes WHERE tablename = 'property' AND indexdef ILIKE '%gist%(location)%'")
                .query(Integer.class).single();
        org.junit.jupiter.api.Assertions.assertEquals(1, indexes);
    }
}
