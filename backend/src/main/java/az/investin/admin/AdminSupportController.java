package az.investin.admin;

import az.investin.admin.AdminDtos.DataSourceItem;
import az.investin.admin.AdminDtos.InquiryItem;
import az.investin.common.ApiException;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Data sources and inquiries. Inquiry personal data is only reachable through authenticated admin endpoints. */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin: data sources and inquiries")
public class AdminSupportController {
    public record DataSourceRequest(@NotBlank @Size(max = 200) String name, @NotBlank String sourceType, @Size(max = 500) String sourceUrl,
                                    @NotBlank String permissionStatus, @Size(max = 2000) String attributionRequirements, String updateMethod) {}

    public record InquiryStatusRequest(@NotBlank String status) {}

    private final JdbcClient jdbc;
    private final AdminListingService service;

    public AdminSupportController(JdbcClient jdbc, AdminListingService service) {
        this.jdbc = jdbc;
        this.service = service;
    }

    @GetMapping("/data-sources")
    public List<DataSourceItem> sources() {
        return jdbc.sql("SELECT id, name, source_type, source_url, permission_status, attribution_requirements, update_method, is_demo, last_checked_at"
                        + " FROM data_source ORDER BY is_demo, name")
                .query((rs, i) -> new DataSourceItem(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("source_type"),
                        rs.getString("source_url"), rs.getString("permission_status"), rs.getString("attribution_requirements"),
                        rs.getString("update_method"), rs.getBoolean("is_demo"),
                        rs.getTimestamp("last_checked_at") == null ? null : rs.getTimestamp("last_checked_at").toInstant())).list();
    }

    @PostMapping("/data-sources")
    @ResponseStatus(HttpStatus.CREATED)
    public DataSourceItem createSource(@Valid @RequestBody DataSourceRequest r, Authentication auth) {
        if (!Set.of("agency", "developer", "owner", "public_dataset", "editorial").contains(r.sourceType())) {
            throw ApiException.badRequest("sourceType must be one of agency, developer, owner, public_dataset, editorial");
        }
        if (!Set.of("granted", "pending", "not_required").contains(r.permissionStatus())) {
            throw ApiException.badRequest("permissionStatus must be one of granted, pending, not_required");
        }
        String method = r.updateMethod() == null ? "manual" : r.updateMethod();
        if (!Set.of("manual", "csv_import", "api").contains(method)) throw ApiException.badRequest("Invalid updateMethod");
        UUID id;
        try {
            id = jdbc.sql("INSERT INTO data_source (name, source_type, source_url, permission_status, attribution_requirements, update_method, last_checked_at)"
                            + " VALUES (:n, :t, :u, :p, :a, :m, now()) RETURNING id")
                    .param("n", r.name().trim()).param("t", r.sourceType()).param("u", r.sourceUrl()).param("p", r.permissionStatus())
                    .param("a", r.attributionRequirements()).param("m", method).query(UUID.class).single();
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("A data source with this name already exists");
        }
        service.audit(auth.getName(), "data_source.create", "data_source", id, r.name());
        return sources().stream().filter(s -> s.id().equals(id)).findFirst().orElseThrow();
    }

    @GetMapping("/inquiries")
    public List<InquiryItem> inquiries(@RequestParam(required = false) String status) {
        String where = "";
        if (status != null && !status.isBlank()) {
            if (!Set.of("new", "forwarded", "closed", "spam").contains(status)) throw ApiException.badRequest("Unknown status");
            where = " WHERE i.status = :s";
        }
        var spec = jdbc.sql("SELECT i.id, i.listing_id, l.title, i.name, i.email, i.phone, i.message, i.status, i.created_at"
                + " FROM inquiry i JOIN listing l ON l.id = i.listing_id" + where + " ORDER BY i.created_at DESC LIMIT 200");
        if (!where.isEmpty()) spec = spec.param("s", status);
        return spec.query((rs, i) -> new InquiryItem(rs.getObject("id", UUID.class), rs.getObject("listing_id", UUID.class), rs.getString("title"),
                rs.getString("name"), rs.getString("email"), rs.getString("phone"), rs.getString("message"), rs.getString("status"),
                rs.getTimestamp("created_at").toInstant())).list();
    }

    @PostMapping("/inquiries/{id}/status")
    public void setInquiryStatus(@PathVariable UUID id, @Valid @RequestBody InquiryStatusRequest r, Authentication auth) {
        if (!Set.of("new", "forwarded", "closed", "spam").contains(r.status())) throw ApiException.badRequest("Unknown status");
        int n = jdbc.sql("UPDATE inquiry SET status = :s WHERE id = :id").param("s", r.status()).param("id", id).update();
        if (n == 0) throw ApiException.notFound("Inquiry not found");
        service.audit(auth.getName(), "inquiry.status", "inquiry", id, r.status());
    }
}
