package az.investin.admin;

import az.investin.admin.AdminDtos.*;
import az.investin.common.ApiException;
import az.investin.common.Slugs;
import az.investin.config.AppProperties;
import az.investin.media.ImageValidator;
import az.investin.media.MediaStorage;
import az.investin.property.PropertyRepository;
import az.investin.property.PublicationStatus;
import java.io.IOException;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AdminListingService {
    private static final String STALE_SQL = "(l.publication_status = 'published' AND (l.last_checked_at IS NULL"
            + " OR l.last_checked_at < now() - make_interval(days => :stale)))";

    private final JdbcClient jdbc;
    private final MediaStorage storage;
    private final AppProperties props;

    public AdminListingService(JdbcClient jdbc, MediaStorage storage, AppProperties props) {
        this.jdbc = jdbc;
        this.storage = storage;
        this.props = props;
    }

    // ---------- create / update ----------

    @Transactional
    public AdminListing create(ListingForm raw, String actor) {
        ListingForm f = normalize(raw);
        ListingFormValidator.validateOrThrow(f);
        UUID neighborhoodId = resolveNeighborhood(f.neighborhoodSlug());
        requireDataSource(f.dataSourceId());
        UUID propertyId = jdbc.sql("INSERT INTO property (slug, property_type, location, location_precision, neighborhood_id,"
                        + " address_text, area_sqm, land_area_sqm, bedrooms, bathrooms)"
                        + " VALUES (:slug, :type, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :prec, :hood, :addr,"
                        + " :area, :land, :beds, :baths) RETURNING id")
                .param("slug", newSlug(f.title())).param("type", f.propertyType())
                .param("lng", f.longitude()).param("lat", f.latitude())
                .param("prec", f.locationPrecision()).param("hood", neighborhoodId)
                .param("addr", f.addressText()).param("area", f.areaSqm()).param("land", f.landAreaSqm())
                .param("beds", f.bedrooms()).param("baths", f.bathrooms())
                .query(UUID.class).single();
        UUID id;
        try {
            id = jdbc.sql("INSERT INTO listing (property_id, data_source_id, external_reference, title, description, asking_price,"
                            + " currency_code, construction_status, amenities, developer_name, last_checked_at, source_updated_at)"
                            + " VALUES (:pid, :ds, :ref, :title, :descr, :price, :cur, :cs, :am, :dev, :lc, :su) RETURNING id")
                    .param("pid", propertyId).param("ds", f.dataSourceId()).param("ref", f.externalReference())
                    .param("title", f.title()).param("descr", f.description()).param("price", f.askingPrice())
                    .param("cur", f.currencyCode()).param("cs", f.constructionStatus())
                    .param("am", f.amenities().toArray(String[]::new)).param("dev", f.developerName())
                    .param("lc", ts(f.lastCheckedAt())).param("su", ts(f.sourceUpdatedAt()))
                    .query(UUID.class).single();
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("A listing with this external reference already exists for this data source");
        }
        history(id, null, PublicationStatus.DRAFT, actor, "Created");
        audit(actor, "listing.create", "listing", id, f.title());
        return get(id);
    }

    @Transactional
    public AdminListing update(UUID id, ListingForm raw, String actor, boolean isAdmin) {
        Row row = lock(id);
        if (row.status == PublicationStatus.ARCHIVED) throw ApiException.conflict("Archived listings cannot be edited; restore it first");
        if (row.status == PublicationStatus.PUBLISHED && !isAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Only an administrator may edit a published listing; unpublish it first");
        }
        ListingForm f = normalize(raw);
        ListingFormValidator.validateOrThrow(f);
        UUID neighborhoodId = resolveNeighborhood(f.neighborhoodSlug());
        requireDataSource(f.dataSourceId());
        jdbc.sql("UPDATE property SET property_type = :type, location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,"
                        + " location_precision = :prec, neighborhood_id = :hood, address_text = :addr, area_sqm = :area,"
                        + " land_area_sqm = :land, bedrooms = :beds, bathrooms = :baths, updated_at = now() WHERE id = :id")
                .param("type", f.propertyType()).param("lng", f.longitude()).param("lat", f.latitude())
                .param("prec", f.locationPrecision()).param("hood", neighborhoodId).param("addr", f.addressText())
                .param("area", f.areaSqm()).param("land", f.landAreaSqm()).param("beds", f.bedrooms())
                .param("baths", f.bathrooms()).param("id", row.propertyId).update();
        try {
            jdbc.sql("UPDATE listing SET data_source_id = :ds, external_reference = :ref, title = :title, description = :descr,"
                            + " asking_price = :price, currency_code = :cur, construction_status = :cs, amenities = :am,"
                            + " developer_name = :dev, last_checked_at = :lc, source_updated_at = :su, updated_at = now() WHERE id = :id")
                    .param("ds", f.dataSourceId()).param("ref", f.externalReference()).param("title", f.title())
                    .param("descr", f.description()).param("price", f.askingPrice()).param("cur", f.currencyCode())
                    .param("cs", f.constructionStatus()).param("am", f.amenities().toArray(String[]::new))
                    .param("dev", f.developerName()).param("lc", ts(f.lastCheckedAt())).param("su", ts(f.sourceUpdatedAt()))
                    .param("id", id).update();
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("A listing with this external reference already exists for this data source");
        }
        audit(actor, "listing.update", "listing", id, f.title());
        return get(id);
    }

    // ---------- lifecycle ----------

    @Transactional
    public AdminListing transition(UUID id, PublicationStatus target, String note, String actor) {
        Row row = lock(id);
        if (!row.status.canTransitionTo(target)) {
            throw ApiException.conflict("Cannot move a listing from " + row.status.db() + " to " + target.db());
        }
        if (target == PublicationStatus.PUBLISHED) {
            List<String> problems = publishProblems(id);
            if (!problems.isEmpty()) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "not_publishable", "Listing cannot be published yet", problems);
            }
            jdbc.sql("UPDATE listing SET publication_status = 'published', published_at = now(), review_note = NULL, updated_at = now() WHERE id = :id")
                    .param("id", id).update();
        } else {
            jdbc.sql("UPDATE listing SET publication_status = :s, review_note = :note, updated_at = now() WHERE id = :id")
                    .param("s", target.db()).param("note", note == null || note.isBlank() ? null : note.trim()).param("id", id).update();
        }
        history(id, row.status, target, actor, note);
        audit(actor, "listing." + target.db(), "listing", id, note);
        return get(id);
    }

    @Transactional
    public AdminListing markChecked(UUID id, String actor) {
        Row row = lock(id);
        if (row.status == PublicationStatus.ARCHIVED) throw ApiException.conflict("Archived listings cannot be updated");
        jdbc.sql("UPDATE listing SET last_checked_at = now(), updated_at = now() WHERE id = :id").param("id", id).update();
        audit(actor, "listing.mark_checked", "listing", id, null);
        return get(id);
    }

    @Transactional
    public AdminListing addVerification(UUID id, String kind, String note, String actor) {
        if (!Set.of("location_reviewed", "source_contacted", "documents_reviewed").contains(kind)) {
            throw ApiException.badRequest("Unknown verification kind");
        }
        lock(id);
        jdbc.sql("INSERT INTO listing_verification (listing_id, kind, performed_by, note) VALUES (:l, :k, :by, :n)"
                        + " ON CONFLICT (listing_id, kind) DO UPDATE SET performed_by = EXCLUDED.performed_by,"
                        + " performed_at = now(), note = EXCLUDED.note")
                .param("l", id).param("k", kind).param("by", actor).param("n", note).update();
        audit(actor, "listing.verification." + kind, "listing", id, note);
        return get(id);
    }

    public List<String> publishProblems(UUID id) {
        var c = jdbc.sql("SELECT l.description, p.property_type, p.area_sqm, p.land_area_sqm, l.last_checked_at, ds.permission_status,"
                        + " (SELECT count(*) FROM property_media m WHERE m.property_id = p.id) AS media_count,"
                        + " (SELECT count(*) FROM property_media m WHERE m.property_id = p.id AND m.is_primary) AS primaries,"
                        + " (SELECT count(*) FROM property_media m WHERE m.property_id = p.id AND (m.rights_reference IS NULL OR btrim(m.rights_reference) = '')) AS no_rights,"
                        + " (SELECT count(*) FROM property_media m WHERE m.property_id = p.id AND btrim(m.alt_text) = '') AS no_alt"
                        + " FROM listing l JOIN property p ON p.id = l.property_id JOIN data_source ds ON ds.id = l.data_source_id WHERE l.id = :id")
                .param("id", id)
                .query((rs, i) -> new PublishRules.Candidate(rs.getString("description"), rs.getString("property_type"),
                        rs.getBigDecimal("area_sqm"), rs.getBigDecimal("land_area_sqm"),
                        PropertyRepositoryAccess.instant(rs.getTimestamp("last_checked_at")), rs.getString("permission_status"),
                        rs.getInt("media_count"), rs.getInt("primaries") > 0, rs.getLong("no_rights"), rs.getLong("no_alt")))
                .single();
        return PublishRules.problems(c);
    }

    // ---------- media ----------

    @Transactional
    public AdminListing addMedia(UUID listingId, MultipartFile file, String altText, String rightsReference, boolean primary, String actor) {
        Row row = lock(listingId);
        if (row.status == PublicationStatus.ARCHIVED) throw ApiException.conflict("Archived listings cannot be edited");
        if (altText == null || altText.isBlank() || altText.length() > 300) throw ApiException.badRequest("altText is required (max 300 characters)");
        if (rightsReference == null || rightsReference.isBlank() || rightsReference.length() > 500) {
            throw ApiException.badRequest("rightsReference is required: record who owns the image and the permission to use it");
        }
        String ext = ImageValidator.detectExtension(file);
        String key;
        try (var in = file.getInputStream()) {
            key = storage.store(in, ext);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "storage_error", "Could not store the image");
        }
        Integer count = jdbc.sql("SELECT count(*) FROM property_media WHERE property_id = :p").param("p", row.propertyId).query(Integer.class).single();
        boolean makePrimary = primary || count == 0;
        if (makePrimary) jdbc.sql("UPDATE property_media SET is_primary = FALSE WHERE property_id = :p").param("p", row.propertyId).update();
        jdbc.sql("INSERT INTO property_media (property_id, listing_id, storage_key, alt_text, display_order, is_primary, rights_reference)"
                        + " VALUES (:p, :l, :k, :alt, (SELECT COALESCE(max(display_order) + 1, 0) FROM property_media WHERE property_id = :p), :prim, :rights)")
                .param("p", row.propertyId).param("l", listingId).param("k", key).param("alt", altText.trim())
                .param("prim", makePrimary).param("rights", rightsReference.trim()).update();
        audit(actor, "media.add", "listing", listingId, key);
        return get(listingId);
    }

    @Transactional
    public AdminListing updateMedia(UUID mediaId, String altText, String rightsReference, Integer displayOrder, Boolean primary, String actor) {
        var m = jdbc.sql("SELECT property_id, listing_id FROM property_media WHERE id = :id").param("id", mediaId)
                .query((rs, i) -> new UUID[]{rs.getObject(1, UUID.class), rs.getObject(2, UUID.class)}).optional()
                .orElseThrow(() -> ApiException.notFound("Media not found"));
        if (altText != null) {
            if (altText.isBlank() || altText.length() > 300) throw ApiException.badRequest("altText must be 1-300 characters");
            jdbc.sql("UPDATE property_media SET alt_text = :v WHERE id = :id").param("v", altText.trim()).param("id", mediaId).update();
        }
        if (rightsReference != null) {
            if (rightsReference.isBlank() || rightsReference.length() > 500) throw ApiException.badRequest("rightsReference must be 1-500 characters");
            jdbc.sql("UPDATE property_media SET rights_reference = :v WHERE id = :id").param("v", rightsReference.trim()).param("id", mediaId).update();
        }
        if (displayOrder != null) {
            if (displayOrder < 0) throw ApiException.badRequest("displayOrder must not be negative");
            jdbc.sql("UPDATE property_media SET display_order = :v WHERE id = :id").param("v", displayOrder).param("id", mediaId).update();
        }
        if (Boolean.TRUE.equals(primary)) {
            jdbc.sql("UPDATE property_media SET is_primary = FALSE WHERE property_id = :p").param("p", m[0]).update();
            jdbc.sql("UPDATE property_media SET is_primary = TRUE WHERE id = :id").param("id", mediaId).update();
        }
        audit(actor, "media.update", "listing", m[1], mediaId.toString());
        return get(m[1]);
    }

    @Transactional
    public AdminListing deleteMedia(UUID mediaId, String actor) {
        var m = jdbc.sql("SELECT property_id, listing_id, storage_key, is_primary FROM property_media WHERE id = :id").param("id", mediaId)
                .query((rs, i) -> new Object[]{rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getBoolean(4)}).optional()
                .orElseThrow(() -> ApiException.notFound("Media not found"));
        UUID listingId = (UUID) m[1];
        Row row = lock(listingId);
        long remainingAfter = jdbc.sql("SELECT count(*) FROM property_media WHERE property_id = :p AND id <> :id")
                .param("p", m[0]).param("id", mediaId).query(Long.class).single();
        if (row.status == PublicationStatus.PUBLISHED && remainingAfter == 0) {
            throw ApiException.conflict("A published listing must keep at least one image; unpublish it first");
        }
        jdbc.sql("DELETE FROM property_media WHERE id = :id").param("id", mediaId).update();
        if ((Boolean) m[3]) {
            jdbc.sql("UPDATE property_media SET is_primary = TRUE WHERE id = (SELECT id FROM property_media WHERE property_id = :p"
                    + " ORDER BY display_order, created_at LIMIT 1)").param("p", m[0]).update();
        }
        storage.delete((String) m[2]);
        audit(actor, "media.delete", "listing", listingId, (String) m[2]);
        return get(listingId);
    }

    // ---------- reads ----------

    public AdminListing get(UUID id) {
        record Head(UUID id, UUID propertyId, String slug, String status, String note, Instant published, Instant created,
                    Instant updated, boolean stale, boolean demo, ListingForm form) {}
        Head h = jdbc.sql("SELECT l.id, l.property_id, p.slug, l.publication_status, l.review_note, l.published_at, l.created_at, l.updated_at,"
                        + " " + STALE_SQL + " AS stale, ds.is_demo, l.title, l.description, l.asking_price, l.currency_code, l.construction_status,"
                        + " l.amenities, l.developer_name, l.data_source_id, l.external_reference, l.last_checked_at, l.source_updated_at,"
                        + " p.property_type, ST_Y(p.location::geometry) lat, ST_X(p.location::geometry) lng, p.location_precision,"
                        + " n.slug AS hood, p.address_text, p.area_sqm, p.land_area_sqm, p.bedrooms, p.bathrooms"
                        + " FROM listing l JOIN property p ON p.id = l.property_id JOIN data_source ds ON ds.id = l.data_source_id"
                        + " LEFT JOIN neighborhood n ON n.id = p.neighborhood_id WHERE l.id = :id")
                .param("id", id).param("stale", props.staleAfterDays())
                .query((rs, i) -> new Head(id, rs.getObject("property_id", UUID.class), rs.getString("slug"), rs.getString("publication_status"),
                        rs.getString("review_note"), ts(rs, "published_at"), ts(rs, "created_at"), ts(rs, "updated_at"),
                        rs.getBoolean("stale"), rs.getBoolean("is_demo"), mapForm(rs)))
                .optional().orElseThrow(() -> ApiException.notFound("Listing not found"));
        List<MediaItem> media = jdbc.sql("SELECT id, storage_key, alt_text, display_order, is_primary, rights_reference, is_demo FROM property_media"
                        + " WHERE property_id = :p ORDER BY is_primary DESC, display_order, created_at").param("p", h.propertyId())
                .query((rs, i) -> new MediaItem(rs.getObject("id", UUID.class), "/api/v1/media/" + rs.getString("storage_key"),
                        rs.getString("alt_text"), rs.getInt("display_order"), rs.getBoolean("is_primary"),
                        rs.getString("rights_reference"), rs.getBoolean("is_demo"))).list();
        List<VerificationItem> ver = jdbc.sql("SELECT kind, performed_by, performed_at, note FROM listing_verification WHERE listing_id = :l ORDER BY performed_at")
                .param("l", id).query((rs, i) -> new VerificationItem(rs.getString("kind"), az.investin.property.PropertyRepository.verificationLabel(rs.getString("kind")),
                        rs.getString("performed_by"), ts(rs, "performed_at"), rs.getString("note"))).list();
        List<HistoryItem> hist = jdbc.sql("SELECT from_status, to_status, changed_by, note, changed_at FROM listing_status_history WHERE listing_id = :l ORDER BY changed_at")
                .param("l", id).query((rs, i) -> new HistoryItem(rs.getString("from_status"), rs.getString("to_status"),
                        rs.getString("changed_by"), rs.getString("note"), ts(rs, "changed_at"))).list();
        List<AuditItem> audit = jdbc.sql("SELECT actor, action, details, created_at FROM audit_log WHERE entity_type = 'listing' AND entity_id = :l ORDER BY created_at DESC LIMIT 100")
                .param("l", id).query((rs, i) -> new AuditItem(rs.getString("actor"), rs.getString("action"), rs.getString("details"), ts(rs, "created_at"))).list();
        return new AdminListing(h.id(), h.propertyId(), h.slug(), h.status(), h.note(), h.published(), h.created(), h.updated(),
                h.stale(), h.demo(), h.form(), media, ver, hist, audit);
    }

    public ListingPage list(String status, String q, String reason, int page, int size) {
        StringBuilder where = new StringBuilder("TRUE");
        Map<String, Object> params = new java.util.HashMap<>();
        params.put("stale", props.staleAfterDays());
        if (status != null && !status.isBlank()) {
            try {
                where.append(" AND l.publication_status = :status");
                params.put("status", PublicationStatus.valueOf(status.trim().toUpperCase(Locale.ROOT)).db());
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("Unknown status");
            }
        }
        if (q != null && !q.isBlank()) {
            where.append(" AND l.title ILIKE :q");
            params.put("q", "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if ("review-queue".equals(reason)) {
            where.append(" AND (l.publication_status IN ('review', 'needs_review') OR " + STALE_SQL + ")");
        }
        String from = " FROM listing l JOIN property p ON p.id = l.property_id JOIN data_source ds ON ds.id = l.data_source_id"
                + " LEFT JOIN neighborhood n ON n.id = p.neighborhood_id WHERE " + where;
        Long total = jdbc.sql("SELECT count(*)" + from).params(params).query(Long.class).single();
        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<ListingRow> rows = jdbc.sql("SELECT l.id, p.slug, l.title, p.property_type, l.publication_status, l.asking_price, l.currency_code,"
                        + " n.name AS hood, l.updated_at, l.last_checked_at, " + STALE_SQL + " AS stale, ds.is_demo, l.review_note" + from
                        + " ORDER BY l.updated_at DESC, l.id LIMIT :limit OFFSET :offset")
                .params(params)
                .query((rs, i) -> {
                    String st = rs.getString("publication_status");
                    boolean stale = rs.getBoolean("stale");
                    String why = "needs_review".equals(st) ? "Flagged: " + (rs.getString("review_note") == null ? "needs review" : rs.getString("review_note"))
                            : "review".equals(st) ? "Awaiting review" : stale ? "Not checked in " + props.staleAfterDays() + "+ days" : null;
                    return new ListingRow(rs.getObject("id", UUID.class), rs.getString("slug"), rs.getString("title"), rs.getString("property_type"),
                            st, rs.getBigDecimal("asking_price"), rs.getString("currency_code"), rs.getString("hood"),
                            ts(rs, "updated_at"), ts(rs, "last_checked_at"), stale, rs.getBoolean("is_demo"), why);
                }).list();
        return new ListingPage(rows, total == null ? 0 : total, page, size);
    }

    public Summary summary() {
        Map<String, Long> byStatus = new java.util.LinkedHashMap<>();
        for (PublicationStatus s : PublicationStatus.values()) byStatus.put(s.db(), 0L);
        jdbc.sql("SELECT publication_status, count(*) c FROM listing GROUP BY publication_status")
                .query((rs, i) -> { byStatus.put(rs.getString(1), rs.getLong(2)); return null; }).list();
        long stale = jdbc.sql("SELECT count(*) FROM listing l WHERE " + STALE_SQL).param("stale", props.staleAfterDays()).query(Long.class).single();
        long inquiries = jdbc.sql("SELECT count(*) FROM inquiry WHERE status = 'new'").query(Long.class).single();
        return new Summary(byStatus, stale, inquiries);
    }

    // ---------- helpers ----------

    private record Row(UUID propertyId, PublicationStatus status) {}

    private Row lock(UUID id) {
        return jdbc.sql("SELECT property_id, publication_status FROM listing WHERE id = :id FOR UPDATE").param("id", id)
                .query((rs, i) -> new Row(rs.getObject(1, UUID.class), PublicationStatus.fromDb(rs.getString(2)))).optional()
                .orElseThrow(() -> ApiException.notFound("Listing not found"));
    }

    private ListingForm normalize(ListingForm f) {
        return new ListingForm(trim(f.title()), blankToNull(f.description()), f.askingPrice(),
                f.currencyCode() == null ? null : f.currencyCode().trim().toUpperCase(Locale.ROOT),
                f.constructionStatus() == null || f.constructionStatus().isBlank() ? null : f.constructionStatus().trim().toLowerCase(Locale.ROOT),
                f.amenities() == null ? List.of() : f.amenities().stream().map(a -> a == null ? null : a.trim()).toList(),
                blankToNull(f.developerName()), f.dataSourceId(), blankToNull(f.externalReference()),
                f.lastCheckedAt(), f.sourceUpdatedAt(),
                f.propertyType() == null ? null : f.propertyType().trim().toLowerCase(Locale.ROOT),
                f.latitude(), f.longitude(),
                f.locationPrecision() == null || f.locationPrecision().isBlank() ? "approximate" : f.locationPrecision().trim().toLowerCase(Locale.ROOT),
                blankToNull(f.neighborhoodSlug()), blankToNull(f.addressText()), f.areaSqm(), f.landAreaSqm(), f.bedrooms(), f.bathrooms());
    }

    private UUID resolveNeighborhood(String slug) {
        if (slug == null) return null;
        return jdbc.sql("SELECT id FROM neighborhood WHERE slug = :s").param("s", slug).query(UUID.class).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "validation_failed", "Listing validation failed",
                        List.of("neighborhoodSlug: unknown neighborhood")));
    }

    private void requireDataSource(UUID id) {
        boolean ok = jdbc.sql("SELECT EXISTS (SELECT 1 FROM data_source WHERE id = :id)").param("id", id).query(Boolean.class).single();
        if (!ok) throw new ApiException(HttpStatus.BAD_REQUEST, "validation_failed", "Listing validation failed", List.of("dataSourceId: unknown data source"));
    }

    private String newSlug(String title) {
        String base = Slugs.slugify(title);
        if (base.length() > 60) base = base.substring(0, 60).replaceAll("-$", "");
        if (base.isEmpty()) base = "property";
        String chars = "abcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder suffix = new StringBuilder();
        for (int i = 0; i < 6; i++) suffix.append(chars.charAt(ThreadLocalRandom.current().nextInt(chars.length())));
        return base + "-" + suffix;
    }

    void history(UUID listingId, PublicationStatus from, PublicationStatus to, String actor, String note) {
        jdbc.sql("INSERT INTO listing_status_history (listing_id, from_status, to_status, changed_by, note) VALUES (:l, :f, :t, :a, :n)")
                .param("l", listingId).param("f", from == null ? null : from.db()).param("t", to.db()).param("a", actor).param("n", note).update();
    }

    public void audit(String actor, String action, String entityType, UUID entityId, String details) {
        jdbc.sql("INSERT INTO audit_log (actor, action, entity_type, entity_id, details) VALUES (:a, :ac, :et, :ei, :d)")
                .param("a", actor).param("ac", action).param("et", entityType).param("ei", entityId)
                .param("d", details == null ? null : (details.length() > 500 ? details.substring(0, 500) : details)).update();
    }

    private static ListingForm mapForm(ResultSet rs) throws SQLException {
        Array arr = rs.getArray("amenities");
        List<String> amenities = arr == null ? new ArrayList<>() : new ArrayList<>(List.of((String[]) arr.getArray()));
        return new ListingForm(rs.getString("title"), rs.getString("description"), rs.getBigDecimal("asking_price"),
                rs.getString("currency_code"), rs.getString("construction_status"), amenities, rs.getString("developer_name"),
                rs.getObject("data_source_id", UUID.class), rs.getString("external_reference"),
                ts(rs, "last_checked_at"), ts(rs, "source_updated_at"), rs.getString("property_type"),
                rs.getDouble("lat"), rs.getDouble("lng"), rs.getString("location_precision"), rs.getString("hood"),
                rs.getString("address_text"), rs.getBigDecimal("area_sqm"), rs.getBigDecimal("land_area_sqm"),
                (Integer) rs.getObject("bedrooms"), (Integer) rs.getObject("bathrooms"));
    }

    private static Instant ts(ResultSet rs, String col) throws SQLException {
        var t = rs.getTimestamp(col);
        return t == null ? null : t.toInstant();
    }

    private static java.sql.Timestamp ts(Instant i) { return i == null ? null : java.sql.Timestamp.from(i); }

    private static String trim(String s) { return s == null ? null : s.trim(); }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    /** Tiny shim so this package does not depend on a package-private helper. */
    static final class PropertyRepositoryAccess {
        static Instant instant(java.sql.Timestamp t) { return t == null ? null : t.toInstant(); }
    }
}
