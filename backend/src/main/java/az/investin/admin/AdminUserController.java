package az.investin.admin;

import az.investin.common.ApiException;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Administrator accounts. List/create/update/reset are ADMIN-only (see SecurityConfig); change-password is for any signed-in admin. */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin: users")
public class AdminUserController {
    public record UserItem(UUID id, String email, String role, boolean enabled, Instant createdAt) {}

    public record CreateUser(@NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 200) String password, @NotBlank String role) {}

    public record UpdateUser(String role, Boolean enabled) {}

    public record NewPassword(@NotBlank @Size(max = 200) String password) {}

    public record ChangePassword(@NotBlank String currentPassword, @NotBlank @Size(max = 200) String newPassword) {}

    private static final Set<String> ROLES = Set.of("ADMIN", "EDITOR");

    private final JdbcClient jdbc;
    private final PasswordEncoder encoder;
    private final AdminListingService audit;

    public AdminUserController(JdbcClient jdbc, PasswordEncoder encoder, AdminListingService audit) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.audit = audit;
    }

    @GetMapping("/users")
    public List<UserItem> list() {
        return jdbc.sql("SELECT id, email, role, enabled, created_at FROM admin_user ORDER BY email")
                .query((rs, i) -> new UserItem(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("role"),
                        rs.getBoolean("enabled"), rs.getTimestamp("created_at").toInstant())).list();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserItem create(@Valid @RequestBody CreateUser r, Authentication auth) {
        if (!ROLES.contains(r.role())) throw ApiException.badRequest("role must be ADMIN or EDITOR");
        checkPassword(r.password());
        try {
            UUID id = jdbc.sql("INSERT INTO admin_user (email, password_hash, role) VALUES (:e, :p, :r) RETURNING id")
                    .param("e", r.email().trim().toLowerCase()).param("p", encoder.encode(r.password())).param("r", r.role())
                    .query(UUID.class).single();
            audit.audit(auth.getName(), "user.create", "admin_user", id, r.email() + " " + r.role());
            return list().stream().filter(u -> u.id().equals(id)).findFirst().orElseThrow();
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("An account with this email already exists");
        }
    }

    @PatchMapping("/users/{id}")
    @Transactional
    public UserItem update(@PathVariable UUID id, @RequestBody UpdateUser r, Authentication auth) {
        UserItem current = lockedUser(id);
        String role = r.role() == null ? current.role() : r.role();
        boolean enabled = r.enabled() == null ? current.enabled() : r.enabled();
        if (!ROLES.contains(role)) throw ApiException.badRequest("role must be ADMIN or EDITOR");
        boolean losesAdmin = current.role().equals("ADMIN") && current.enabled() && (!role.equals("ADMIN") || !enabled);
        if (losesAdmin) {
            if (current.email().equalsIgnoreCase(auth.getName())) throw ApiException.conflict("You cannot demote or disable your own account");
            Long others = jdbc.sql("SELECT count(*) FROM admin_user WHERE role = 'ADMIN' AND enabled AND id <> :id").param("id", id).query(Long.class).single();
            if (others == 0) throw ApiException.conflict("At least one enabled administrator must remain");
        }
        jdbc.sql("UPDATE admin_user SET role = :r, enabled = :e WHERE id = :id").param("r", role).param("e", enabled).param("id", id).update();
        audit.audit(auth.getName(), "user.update", "admin_user", id, current.email() + " role=" + role + " enabled=" + enabled);
        return lockedUser(id);
    }

    @PostMapping("/users/{id}/password")
    @Transactional
    public void reset(@PathVariable UUID id, @Valid @RequestBody NewPassword r, Authentication auth) {
        UserItem u = lockedUser(id);
        checkPassword(r.password());
        jdbc.sql("UPDATE admin_user SET password_hash = :p WHERE id = :id").param("p", encoder.encode(r.password())).param("id", id).update();
        audit.audit(auth.getName(), "user.password_reset", "admin_user", id, u.email());
    }

    @PostMapping("/auth/change-password")
    public void changeOwn(@Valid @RequestBody ChangePassword r, Authentication auth) {
        String hash = jdbc.sql("SELECT password_hash FROM admin_user WHERE lower(email) = lower(:e)").param("e", auth.getName())
                .query(String.class).optional().orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "Authentication required"));
        if (!encoder.matches(r.currentPassword(), hash)) throw new ApiException(HttpStatus.BAD_REQUEST, "invalid_credentials", "Current password is incorrect");
        checkPassword(r.newPassword());
        jdbc.sql("UPDATE admin_user SET password_hash = :p WHERE lower(email) = lower(:e)").param("p", encoder.encode(r.newPassword())).param("e", auth.getName()).update();
        audit.audit(auth.getName(), "user.password_change", "admin_user", null, null);
    }

    private UserItem lockedUser(UUID id) {
        return jdbc.sql("SELECT id, email, role, enabled, created_at FROM admin_user WHERE id = :id FOR UPDATE").param("id", id)
                .query((rs, i) -> new UserItem(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("role"),
                        rs.getBoolean("enabled"), rs.getTimestamp("created_at").toInstant())).optional()
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    private static void checkPassword(String p) {
        if (p.length() < AdminBootstrap.MIN_PASSWORD_LENGTH) {
            throw ApiException.badRequest("Password must be at least " + AdminBootstrap.MIN_PASSWORD_LENGTH + " characters");
        }
    }
}
