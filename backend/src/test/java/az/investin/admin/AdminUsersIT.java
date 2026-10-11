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
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminUsersIT extends AbstractIntegrationTest {
    @Autowired PasswordEncoder encoder;
    static final String PW = "correct-horse-battery";

    private MockHttpSession login(String email, String role) throws Exception {
        jdbc.sql("INSERT INTO admin_user (email, password_hash, role) VALUES (:e, :p, :r) ON CONFLICT DO NOTHING")
                .param("e", email).param("p", encoder.encode(PW)).param("r", role).update();
        return (MockHttpSession) mvc.perform(post("/api/v1/admin/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + PW + "\"}")).andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private String id(String email) {
        return jdbc.sql("SELECT id FROM admin_user WHERE email = :e").param("e", email).query(String.class).single();
    }

    @Test
    void onlyAdminsManageUsers() throws Exception {
        MockHttpSession editor = login("editor@x.test", "EDITOR");
        mvc.perform(get("/api/v1/admin/users").session(editor)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
        MockHttpSession admin = login("admin@x.test", "ADMIN");
        mvc.perform(get("/api/v1/admin/users").session(admin)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test
    void createsUsersWithPasswordPolicyAndNoDuplicates() throws Exception {
        MockHttpSession admin = login("admin@x.test", "ADMIN");
        String ok = "{\"email\":\"new@x.test\",\"password\":\"another-long-passw0rd\",\"role\":\"EDITOR\"}";
        mvc.perform(post("/api/v1/admin/users").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(ok))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("EDITOR"));
        mvc.perform(post("/api/v1/admin/users").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(ok)).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/admin/users").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"weak@x.test\",\"password\":\"short\",\"role\":\"EDITOR\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void cannotRemoveTheLastAdminOrSelf() throws Exception {
        MockHttpSession admin = login("admin@x.test", "ADMIN");
        mvc.perform(patch("/api/v1/admin/users/" + id("admin@x.test")).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}")).andExpect(status().isConflict());
        login("second@x.test", "ADMIN");
        // another admin exists now, but you still cannot demote yourself
        mvc.perform(patch("/api/v1/admin/users/" + id("admin@x.test")).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"EDITOR\"}")).andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/admin/users/" + id("second@x.test")).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"EDITOR\"}")).andExpect(status().isOk());
    }

    @Test
    void disablingAnAccountEndsItsExistingSession() throws Exception {
        MockHttpSession admin = login("admin@x.test", "ADMIN");
        MockHttpSession editor = login("editor@x.test", "EDITOR");
        mvc.perform(get("/api/v1/admin/listings").session(editor)).andExpect(status().isOk());
        mvc.perform(patch("/api/v1/admin/users/" + id("editor@x.test")).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/listings").session(editor)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"editor@x.test\",\"password\":\"" + PW + "\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void changingOwnPasswordRequiresTheCurrentOne() throws Exception {
        MockHttpSession s = login("admin@x.test", "ADMIN");
        mvc.perform(post("/api/v1/admin/auth/change-password").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"brand-new-passw0rd\"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/admin/auth/change-password").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"" + PW + "\",\"newPassword\":\"brand-new-passw0rd\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@x.test\",\"password\":\"brand-new-passw0rd\"}")).andExpect(status().isOk());
    }
}
