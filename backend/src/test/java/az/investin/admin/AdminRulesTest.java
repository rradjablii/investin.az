package az.investin.admin;

import static org.junit.jupiter.api.Assertions.*;

import az.investin.property.PublicationStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AdminRulesTest {
    private static PublishRules.Candidate ok() {
        return new PublishRules.Candidate("A description that is long enough.", "apartment", new BigDecimal("50"), null,
                Instant.now(), "granted", 2, true, 0, 0);
    }

    @Test
    void completeListingHasNoPublishProblems() {
        assertTrue(PublishRules.problems(ok()).isEmpty());
    }

    @Test
    void publishRequiresDescriptionAreaCheckDateImagesAndPermission() {
        var c = new PublishRules.Candidate("short", "apartment", null, null, null, "pending", 0, false, 0, 0);
        List<String> p = PublishRules.problems(c);
        assertEquals(5, p.size(), p.toString());
    }

    @Test
    void landNeedsLandAreaNotFloorArea() {
        var c = new PublishRules.Candidate("A description that is long enough.", "land", new BigDecimal("50"), null, Instant.now(), "granted", 1, true, 0, 0);
        assertTrue(PublishRules.problems(c).stream().anyMatch(s -> s.contains("Land area")));
    }

    @Test
    void imagesNeedPrimaryRightsAndAltText() {
        var c = new PublishRules.Candidate("A description that is long enough.", "house", new BigDecimal("50"), null, Instant.now(), "granted", 3, false, 2, 1);
        assertEquals(3, PublishRules.problems(c).size());
    }

    @Test
    void futureCheckDateIsRejected() {
        var c = new PublishRules.Candidate("A description that is long enough.", "house", new BigDecimal("50"), null,
                Instant.now().plusSeconds(86400), "granted", 1, true, 0, 0);
        assertEquals(1, PublishRules.problems(c).size());
    }

    @Test
    void lifecycleTransitions() {
        assertTrue(PublicationStatus.DRAFT.canTransitionTo(PublicationStatus.REVIEW));
        assertFalse(PublicationStatus.DRAFT.canTransitionTo(PublicationStatus.PUBLISHED));
        assertTrue(PublicationStatus.REVIEW.canTransitionTo(PublicationStatus.PUBLISHED));
        assertTrue(PublicationStatus.PUBLISHED.canTransitionTo(PublicationStatus.UNPUBLISHED));
        assertTrue(PublicationStatus.PUBLISHED.canTransitionTo(PublicationStatus.NEEDS_REVIEW));
        assertFalse(PublicationStatus.ARCHIVED.canTransitionTo(PublicationStatus.PUBLISHED));
        assertTrue(PublicationStatus.ARCHIVED.canTransitionTo(PublicationStatus.DRAFT));
        for (PublicationStatus s : PublicationStatus.values()) assertFalse(s.canTransitionTo(s));
    }

    private static ListingForm form(String title, String price, String cur, String type, Integer beds, String area) {
        return new ListingForm(title, null, price == null ? null : new BigDecimal(price), cur, null, List.of(), null, UUID.randomUUID(), null,
                null, null, type, 40.4, 49.8, "approximate", null, null, area == null ? null : new BigDecimal(area), null, beds, null);
    }

    @Test
    void validDraftPasses() {
        assertTrue(ListingFormValidator.errors(form("Nice flat", "100000", "USD", "apartment", 2, "60")).isEmpty());
    }

    @Test
    void priceAndCurrencyRules() {
        assertFalse(ListingFormValidator.errors(form("Nice flat", "0", "USD", "apartment", 2, "60")).isEmpty());
        assertFalse(ListingFormValidator.errors(form("Nice flat", "-1", "USD", "apartment", 2, "60")).isEmpty());
        assertFalse(ListingFormValidator.errors(form("Nice flat", "10.123", "USD", "apartment", 2, "60")).isEmpty());
        assertFalse(ListingFormValidator.errors(form("Nice flat", "10", "BTC", "apartment", 2, "60")).isEmpty());
        assertFalse(ListingFormValidator.errors(form("Nice flat", null, "USD", "apartment", 2, "60")).isEmpty());
    }

    @Test
    void areaBedroomAndLandRules() {
        assertFalse(ListingFormValidator.errors(form("Nice flat", "10", "USD", "apartment", 2, "0")).isEmpty());
        assertFalse(ListingFormValidator.errors(form("Nice flat", "10", "USD", "apartment", -1, "60")).isEmpty());
        assertFalse(ListingFormValidator.errors(form("Plot", "10", "USD", "land", 2, null)).isEmpty());
        assertTrue(ListingFormValidator.errors(form("Plot", "10", "USD", "land", null, null)).isEmpty());
        assertFalse(ListingFormValidator.errors(form("ab", "10", "USD", "apartment", 2, "60")).isEmpty());
    }
}
