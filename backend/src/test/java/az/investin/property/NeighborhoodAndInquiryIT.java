package az.investin.property;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import az.investin.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class NeighborhoodAndInquiryIT extends AbstractIntegrationTest {

    @Test
    void directoryListsSeededNeighborhoodsWithCounts() throws Exception {
        data.listing("n1", 49.82, 40.40, "apartment", "USD", "100000", 2, "60", "published", "nasimi");
        data.listing("n2", 49.82, 40.40, "apartment", "USD", "100000", 2, "60", "draft", "nasimi");
        mvc.perform(get("/api/v1/neighborhoods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[?(@.slug=='nasimi')].listingCount", contains(1)));
    }

    @Test
    void statisticsAppearOnlyWithEnoughSample() throws Exception {
        for (int i = 1; i <= 4; i++) data.listing("s" + i, 49.82, 40.40, "apartment", "USD", String.valueOf(i * 100000), 2, "60", "published", "nasimi");
        mvc.perform(get("/api/v1/neighborhoods/nasimi"))
                .andExpect(jsonPath("$.askingPriceStats", hasSize(0)))
                .andExpect(jsonPath("$.statsNote", containsString("Insufficient data")));
        data.listing("s5", 49.82, 40.40, "apartment", "USD", "500000", 2, "60", "published", "nasimi");
        data.listing("s6", 49.82, 40.40, "apartment", "AZN", "500000", 2, "60", "published", "nasimi");
        mvc.perform(get("/api/v1/neighborhoods/nasimi"))
                .andExpect(jsonPath("$.askingPriceStats", hasSize(1)))
                .andExpect(jsonPath("$.askingPriceStats[0].currency").value("USD"))
                .andExpect(jsonPath("$.askingPriceStats[0].sampleSize").value(5))
                .andExpect(jsonPath("$.askingPriceStats[0].median").value(300000.0));
    }

    @Test
    void unknownNeighborhoodIs404() throws Exception {
        mvc.perform(get("/api/v1/neighborhoods/atlantis")).andExpect(status().isNotFound());
    }

    private String body(Object listingId, String email, String message, String website) {
        return "{\"listingId\":\"" + listingId + "\",\"name\":\"Ann\",\"email\":\"" + email + "\",\"message\":\"" + message + "\""
                + (website == null ? "" : ",\"website\":\"" + website + "\"") + "}";
    }

    @Test
    void validInquiryIsPersisted() throws Exception {
        var c = data.listing("inq", 49.82, 40.40, "apartment", "USD", "100000", 2, "60", "published", "nasimi");
        mvc.perform(post("/api/v1/inquiries").contentType(MediaType.APPLICATION_JSON).content(body(c.listingId(), "ann@example.com", "I would like to arrange a viewing.", null)))
                .andExpect(status().isCreated());
        org.junit.jupiter.api.Assertions.assertEquals(1, jdbc.sql("SELECT count(*) FROM inquiry WHERE listing_id = :l AND property_id = :p")
                .param("l", c.listingId()).param("p", c.propertyId()).query(Integer.class).single());
    }

    @Test
    void invalidInquiriesAreRejected() throws Exception {
        var c = data.listing("inq2", 49.82, 40.40, "apartment", "USD", "100000", 2, "60", "published", "nasimi");
        mvc.perform(post("/api/v1/inquiries").contentType(MediaType.APPLICATION_JSON).content(body(c.listingId(), "not-an-email", "I would like to arrange a viewing.", null)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/inquiries").contentType(MediaType.APPLICATION_JSON).content(body(c.listingId(), "a@b.co", "short", null)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/inquiries").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
    }

    @Test
    void inquiryAboutUnpublishedListingIsRejected() throws Exception {
        var c = data.listing("inq3", 49.82, 40.40, "apartment", "USD", "100000", 2, "60", "draft", "nasimi");
        mvc.perform(post("/api/v1/inquiries").contentType(MediaType.APPLICATION_JSON).content(body(c.listingId(), "a@b.co", "I would like to arrange a viewing.", null)))
                .andExpect(status().isNotFound());
    }

    @Test
    void honeypotSubmissionsAreNotStored() throws Exception {
        var c = data.listing("inq4", 49.82, 40.40, "apartment", "USD", "100000", 2, "60", "published", "nasimi");
        mvc.perform(post("/api/v1/inquiries").contentType(MediaType.APPLICATION_JSON).content(body(c.listingId(), "a@b.co", "I would like to arrange a viewing.", "http://spam.example")))
                .andExpect(status().isCreated());
        org.junit.jupiter.api.Assertions.assertEquals(0, jdbc.sql("SELECT count(*) FROM inquiry").query(Integer.class).single());
    }

    @Test
    void inquiryDataIsNotExposedPublicly() throws Exception {
        mvc.perform(get("/api/v1/admin/inquiries")).andExpect(status().isUnauthorized());
    }
}
