package az.investin.admin;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import az.investin.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminApiIT extends AbstractIntegrationTest {
    @Autowired PasswordEncoder encoder;

    private MockHttpSession login(String email, String role) throws Exception {
        jdbc.sql("INSERT INTO admin_user (email, password_hash, role) VALUES (:e, :p, :r) ON CONFLICT DO NOTHING")
                .param("e", email).param("p", encoder.encode("correct-horse-battery")).param("r", role).update();
        var res = mvc.perform(post("/api/v1/admin/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"correct-horse-battery\"}"))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) res.getRequest().getSession(false);
    }

    private String newListingJson() {
        return "{\"title\":\"Sea view flat\",\"description\":\"A bright flat close to the boulevard with a view.\",\"askingPrice\":250000,"
                + "\"currencyCode\":\"USD\",\"dataSourceId\":\"" + data.source + "\",\"propertyType\":\"apartment\",\"latitude\":40.37,"
                + "\"longitude\":49.84,\"areaSqm\":80,\"bedrooms\":2,\"lastCheckedAt\":\"2026-10-01T00:00:00Z\",\"neighborhoodSlug\":\"sabail\"}";
    }

    private String create(MockHttpSession s) throws Exception {
        String body = mvc.perform(post("/api/v1/admin/listings").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(newListingJson()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("draft")).andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(body, "$.id");
    }

    @Test
    void anonymousVisitorsCannotReachAdminEndpoints() throws Exception {
        mvc.perform(get("/api/v1/admin/listings")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/review-queue")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/listings").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(newListingJson()))
                .andExpect(status().isUnauthorized());
        var c = data.listing("pub-me", 49.8, 40.4, "apartment", "USD", "100", 1, "30", "review", null);
        mvc.perform(post("/api/v1/admin/listings/" + c.listingId() + "/publish").with(csrf())).andExpect(status().isUnauthorized());
        // even without a CSRF token an anonymous caller gets nothing
        mvc.perform(post("/api/v1/admin/listings/" + c.listingId() + "/publish")).andExpect(status().is4xxClientError());
        org.junit.jupiter.api.Assertions.assertEquals("review",
                jdbc.sql("SELECT publication_status FROM listing WHERE id = :id").param("id", c.listingId()).query(String.class).single());
    }

    @Test
    void wrongCredentialsAreRejectedWithoutRevealingWhy() throws Exception {
        login("admin@example.test", "ADMIN");
        mvc.perform(post("/api/v1/admin/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@example.test\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("invalid_credentials"));
        mvc.perform(post("/api/v1/admin/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost@example.test\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void mutationsWithoutCsrfTokenAreRefusedEvenWhenLoggedIn() throws Exception {
        MockHttpSession s = login("admin@example.test", "ADMIN");
        mvc.perform(post("/api/v1/admin/listings").session(s).contentType(MediaType.APPLICATION_JSON).content(newListingJson()))
                .andExpect(status().isForbidden());
    }

    @Test
    void sessionEndpointReportsIdentity() throws Exception {
        MockHttpSession s = login("admin@example.test", "ADMIN");
        mvc.perform(get("/api/v1/admin/auth/me").session(s)).andExpect(jsonPath("$.role").value("ADMIN"));
        mvc.perform(get("/api/v1/admin/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void editorCanDraftButOnlyAdminCanPublish() throws Exception {
        MockHttpSession editor = login("editor@example.test", "EDITOR");
        String id = create(editor);
        mvc.perform(post("/api/v1/admin/listings/" + id + "/submit-review").session(editor).with(csrf())).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/listings/" + id + "/publish").session(editor).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/data-sources").session(editor).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"X\",\"sourceType\":\"agency\",\"permissionStatus\":\"granted\"}")).andExpect(status().isForbidden());
    }

    @Test
    void fullLifecycleWithServerSidePublishValidation() throws Exception {
        MockHttpSession admin = login("admin@example.test", "ADMIN");
        String id = create(admin);
        mvc.perform(get("/api/v1/properties/markers")).andExpect(jsonPath("$.total").value(0));

        // Draft → published directly is not a legal transition
        mvc.perform(post("/api/v1/admin/listings/" + id + "/publish").session(admin).with(csrf())).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/admin/listings/" + id + "/submit-review").session(admin).with(csrf())).andExpect(status().isOk());

        // No image yet → refused with reasons
        mvc.perform(post("/api/v1/admin/listings/" + id + "/publish").session(admin).with(csrf()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.details", hasItem(containsString("image"))));

        // Non-image uploads are refused (SVG could carry script)
        mvc.perform(multipart("/api/v1/admin/listings/" + id + "/media")
                        .file(new MockMultipartFile("file", "x.svg", "image/svg+xml", "<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes()))
                        .param("altText", "x").param("rightsReference", "y").session(admin).with(csrf()))
                .andExpect(status().isUnsupportedMediaType());
        // Rights reference is mandatory
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1, 1, 0, 0, 1, 0, 1, 0, 0};
        mvc.perform(multipart("/api/v1/admin/listings/" + id + "/media").file(new MockMultipartFile("file", "a.jpg", "image/jpeg", jpeg))
                        .param("altText", "Front").param("rightsReference", " ").session(admin).with(csrf()))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/v1/admin/listings/" + id + "/media").file(new MockMultipartFile("file", "a.jpg", "image/jpeg", jpeg))
                        .param("altText", "Front").param("rightsReference", "Agency contract 12").session(admin).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.media[0].primary").value(true));

        mvc.perform(post("/api/v1/admin/listings/" + id + "/publish").session(admin).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("published")).andExpect(jsonPath("$.publishedAt", notNullValue()));
        mvc.perform(get("/api/v1/properties/markers")).andExpect(jsonPath("$.total").value(1));

        // Flagging stale hides it from the public
        mvc.perform(post("/api/v1/admin/listings/" + id + "/flag-stale").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Seller unreachable\"}")).andExpect(jsonPath("$.status").value("needs_review"));
        mvc.perform(get("/api/v1/properties/markers")).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/admin/review-queue").session(admin)).andExpect(jsonPath("$.items[0].reason", containsString("Seller unreachable")));

        mvc.perform(post("/api/v1/admin/listings/" + id + "/archive").session(admin).with(csrf())).andExpect(jsonPath("$.status").value("archived"));
        mvc.perform(patch("/api/v1/admin/listings/" + id).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Renamed\"}"))
                .andExpect(status().isConflict());

        // History and audit were recorded
        mvc.perform(get("/api/v1/admin/listings/" + id).session(admin))
                .andExpect(jsonPath("$.history[*].toStatus", contains("draft", "review", "published", "needs_review", "archived")))
                .andExpect(jsonPath("$.audit", not(empty())));
    }

    @Test
    void patchKeepsOmittedFieldsAndCanClearNullable() throws Exception {
        MockHttpSession admin = login("admin@example.test", "ADMIN");
        String id = create(admin);
        mvc.perform(patch("/api/v1/admin/listings/" + id).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"askingPrice\":260000.50,\"bedrooms\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.form.askingPrice").value(260000.50))
                .andExpect(jsonPath("$.form.bedrooms").value(nullValue()))
                .andExpect(jsonPath("$.form.title").value("Sea view flat"));
        mvc.perform(patch("/api/v1/admin/listings/" + id).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"askingPrice\":-5}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details", hasItem(containsString("askingPrice"))));
    }

    @Test
    void invalidListingsAreRejected() throws Exception {
        MockHttpSession admin = login("admin@example.test", "ADMIN");
        mvc.perform(post("/api/v1/admin/listings").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(newListingJson().replace("\"askingPrice\":250000", "\"askingPrice\":0").replace("USD", "ZZZ")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details", hasSize(2)));
    }

    @Test
    void sourceWithoutPermissionCannotPublish() throws Exception {
        MockHttpSession admin = login("admin@example.test", "ADMIN");
        var pending = jdbc.sql("INSERT INTO data_source (name, source_type, permission_status) VALUES ('Pending co', 'agency', 'pending') RETURNING id")
                .query(java.util.UUID.class).single();
        String id = mvc.perform(post("/api/v1/admin/listings").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(newListingJson().replace(data.source.toString(), pending.toString()))).andReturn().getResponse().getContentAsString();
        String lid = com.jayway.jsonpath.JsonPath.read(id, "$.id");
        mvc.perform(get("/api/v1/admin/listings/" + lid + "/publish-check").session(admin))
                .andExpect(jsonPath("$", hasItem(containsString("permission"))));
    }
}
