package az.investin.property;

import az.investin.property.PropertyDtos.*;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Public read side. Every query is restricted to publication_status = 'published'. */
@Repository
public class PropertyRepository {
    static final String MEDIA_URL_PREFIX = "/api/v1/media/";

    // Approximate locations are rounded to ~110 m before leaving the server.
    private static final String LNG = "CASE WHEN p.location_precision = 'exact' THEN ST_X(p.location::geometry) ELSE round(ST_X(p.location::geometry)::numeric, 3)::float8 END";
    private static final String LAT = "CASE WHEN p.location_precision = 'exact' THEN ST_Y(p.location::geometry) ELSE round(ST_Y(p.location::geometry)::numeric, 3)::float8 END";

    private final JdbcClient jdbc;

    public PropertyRepository(JdbcClient jdbc) { this.jdbc = jdbc; }

    /** Builds the shared FROM/WHERE (with a lateral join picking the latest matching published listing per property). */
    private static final class Query {
        final StringBuilder lateralWhere = new StringBuilder("l.property_id = p.id AND l.publication_status = 'published'");
        final StringBuilder where = new StringBuilder("TRUE");
        final Map<String, Object> params = new HashMap<>();

        Query(SearchCriteria c) {
            if (c.hasBounds()) {
                where.append(" AND ST_Intersects(p.location, ST_MakeEnvelope(:west, :south, :east, :north, 4326)::geography)");
                params.put("west", c.west()); params.put("south", c.south());
                params.put("east", c.east()); params.put("north", c.north());
            }
            if (!c.types().isEmpty()) { where.append(" AND p.property_type IN (:types)"); params.put("types", c.types()); }
            if (c.minBedrooms() != null) { where.append(" AND p.bedrooms >= :minBeds"); params.put("minBeds", c.minBedrooms()); }
            if (c.maxBedrooms() != null) { where.append(" AND p.bedrooms <= :maxBeds"); params.put("maxBeds", c.maxBedrooms()); }
            if (c.minArea() != null) { where.append(" AND COALESCE(p.area_sqm, p.land_area_sqm) >= :minArea"); params.put("minArea", c.minArea()); }
            if (c.maxArea() != null) { where.append(" AND COALESCE(p.area_sqm, p.land_area_sqm) <= :maxArea"); params.put("maxArea", c.maxArea()); }
            if (c.neighborhood() != null) { where.append(" AND n.slug = :hood"); params.put("hood", c.neighborhood()); }
            if (c.currency() != null) { lateralWhere.append(" AND l.currency_code = :currency"); params.put("currency", c.currency()); }
            if (c.minPrice() != null) { lateralWhere.append(" AND l.asking_price >= :minPrice"); params.put("minPrice", c.minPrice()); }
            if (c.maxPrice() != null) { lateralWhere.append(" AND l.asking_price <= :maxPrice"); params.put("maxPrice", c.maxPrice()); }
            if (!c.constructionStatuses().isEmpty()) {
                lateralWhere.append(" AND l.construction_status IN (:cstatus)");
                params.put("cstatus", c.constructionStatuses());
            }
            if (c.freshnessDays() != null) {
                lateralWhere.append(" AND l.last_checked_at >= now() - make_interval(days => :fresh)");
                params.put("fresh", c.freshnessDays());
            }
        }

        String from() {
            return " FROM property p LEFT JOIN neighborhood n ON n.id = p.neighborhood_id"
                    + " JOIN LATERAL (SELECT l.* FROM listing l WHERE " + lateralWhere
                    + " ORDER BY l.published_at DESC, l.id LIMIT 1) l ON TRUE"
                    + " JOIN data_source ds ON ds.id = l.data_source_id"
                    + " WHERE " + where;
        }
    }

    private static String orderBy(SearchCriteria c) {
        return switch (c.sort()) {
            case "price_asc" -> " ORDER BY l.asking_price ASC, p.id";
            case "price_desc" -> " ORDER BY l.asking_price DESC, p.id";
            case "updated" -> " ORDER BY l.last_checked_at DESC NULLS LAST, p.id";
            default -> " ORDER BY l.published_at DESC, p.id";
        };
    }

    public SearchResponse search(SearchCriteria c) {
        Query q = new Query(c);
        Long total = bind(jdbc.sql("SELECT count(*)" + q.from()), q.params).query(Long.class).single();
        String sql = "SELECT p.slug, l.id AS listing_id, l.title, p.property_type, " + LNG + " AS lng, " + LAT + " AS lat,"
                + " p.location_precision, n.slug AS hood_slug, n.name AS hood_name, p.address_text,"
                + " p.area_sqm, p.land_area_sqm, p.bedrooms, p.bathrooms, l.construction_status, l.asking_price,"
                + " l.currency_code, l.published_at, l.last_checked_at, ds.is_demo,"
                + " (SELECT m.storage_key FROM property_media m WHERE m.property_id = p.id ORDER BY m.is_primary DESC, m.display_order LIMIT 1) AS img_key,"
                + " (SELECT m.alt_text FROM property_media m WHERE m.property_id = p.id ORDER BY m.is_primary DESC, m.display_order LIMIT 1) AS img_alt"
                + q.from() + orderBy(c) + " LIMIT :limit OFFSET :offset";
        q.params.put("limit", c.size());
        q.params.put("offset", (long) c.page() * c.size());
        List<PropertySummary> items = bind(jdbc.sql(sql), q.params).query(PropertyRepository::mapSummary).list();
        return new SearchResponse(items, total == null ? 0 : total, c.page(), c.size());
    }

    public MarkerResponse markers(SearchCriteria c, int limit) {
        Query q = new Query(c);
        Long total = bind(jdbc.sql("SELECT count(*)" + q.from()), q.params).query(Long.class).single();
        String sql = "SELECT p.slug, " + LNG + " AS lng, " + LAT + " AS lat, l.asking_price, l.currency_code, p.property_type"
                + q.from() + orderBy(c) + " LIMIT :limit";
        q.params.put("limit", limit);
        List<Marker> markers = bind(jdbc.sql(sql), q.params).query((rs, i) -> new Marker(
                rs.getString("slug"), rs.getDouble("lat"), rs.getDouble("lng"),
                rs.getBigDecimal("asking_price"), rs.getString("currency_code"), rs.getString("property_type"))).list();
        long t = total == null ? 0 : total;
        return new MarkerResponse(markers, t, t > markers.size());
    }

    private static JdbcClient.StatementSpec bind(JdbcClient.StatementSpec spec, Map<String, Object> params) {
        return spec.params(params);
    }

    private static PropertySummary mapSummary(ResultSet rs, int i) throws SQLException {
        String key = rs.getString("img_key");
        return new PropertySummary(
                rs.getString("slug"), rs.getString("listing_id"), rs.getString("title"), rs.getString("property_type"),
                rs.getDouble("lat"), rs.getDouble("lng"), rs.getString("location_precision"),
                rs.getString("hood_slug") == null ? null : new NeighborhoodRef(rs.getString("hood_slug"), rs.getString("hood_name")),
                rs.getString("address_text"),
                rs.getBigDecimal("area_sqm"), rs.getBigDecimal("land_area_sqm"),
                (Integer) rs.getObject("bedrooms"), (Integer) rs.getObject("bathrooms"),
                rs.getString("construction_status"), rs.getBigDecimal("asking_price"), rs.getString("currency_code"),
                key == null ? null : new Image(MEDIA_URL_PREFIX + key, rs.getString("img_alt")),
                instant(rs.getTimestamp("published_at")), instant(rs.getTimestamp("last_checked_at")), rs.getBoolean("is_demo"));
    }

    static Instant instant(Timestamp t) { return t == null ? null : t.toInstant(); }

    public Optional<PropertyDetail> findDetail(String slug) {
        String sql = "SELECT p.id AS property_id, p.slug, p.property_type, " + LNG + " AS lng, " + LAT + " AS lat, p.location_precision,"
                + " n.slug AS hood_slug, n.name AS hood_name, p.address_text, p.area_sqm, p.land_area_sqm, p.bedrooms, p.bathrooms,"
                + " l.id AS listing_id, l.title, l.description, l.construction_status, l.asking_price, l.currency_code,"
                + " l.amenities, l.developer_name, l.published_at, l.last_checked_at, l.source_updated_at,"
                + " ds.name AS ds_name, ds.source_type, ds.source_url, ds.attribution_requirements, ds.is_demo"
                + " FROM property p LEFT JOIN neighborhood n ON n.id = p.neighborhood_id"
                + " JOIN LATERAL (SELECT * FROM listing x WHERE x.property_id = p.id AND x.publication_status = 'published'"
                + "   ORDER BY x.published_at DESC, x.id LIMIT 1) l ON TRUE"
                + " JOIN data_source ds ON ds.id = l.data_source_id WHERE p.slug = :slug";
        return jdbc.sql(sql).param("slug", slug).query((rs, i) -> {
            String propertyId = rs.getString("property_id");
            String listingId = rs.getString("listing_id");
            String[] amenities = (String[]) rs.getArray("amenities").getArray();
            List<Image> images = jdbc.sql("SELECT storage_key, alt_text FROM property_media WHERE property_id = :id"
                            + " ORDER BY is_primary DESC, display_order, created_at")
                    .param("id", java.util.UUID.fromString(propertyId))
                    .query((r, n) -> new Image(MEDIA_URL_PREFIX + r.getString("storage_key"), r.getString("alt_text"))).list();
            List<VerificationInfo> verifications = jdbc.sql("SELECT kind, performed_at FROM listing_verification WHERE listing_id = :id ORDER BY performed_at")
                    .param("id", java.util.UUID.fromString(listingId))
                    .query((r, n) -> new VerificationInfo(r.getString("kind"), verificationLabel(r.getString("kind")),
                            r.getTimestamp("performed_at").toInstant())).list();
            List<OtherListing> others = jdbc.sql("SELECT x.id, d.name, x.asking_price, x.currency_code, x.last_checked_at FROM listing x"
                            + " JOIN data_source d ON d.id = x.data_source_id"
                            + " WHERE x.property_id = :pid AND x.publication_status = 'published' AND x.id <> :lid ORDER BY x.published_at DESC")
                    .param("pid", java.util.UUID.fromString(propertyId)).param("lid", java.util.UUID.fromString(listingId))
                    .query((r, n) -> new OtherListing(r.getString("id"), r.getString("name"), r.getBigDecimal("asking_price"),
                            r.getString("currency_code"), instant(r.getTimestamp("last_checked_at")))).list();
            return new PropertyDetail(
                    rs.getString("slug"), listingId, rs.getString("title"), rs.getString("description"), rs.getString("property_type"),
                    rs.getDouble("lat"), rs.getDouble("lng"), rs.getString("location_precision"),
                    rs.getString("hood_slug") == null ? null : new NeighborhoodRef(rs.getString("hood_slug"), rs.getString("hood_name")),
                    rs.getString("address_text"), rs.getBigDecimal("area_sqm"), rs.getBigDecimal("land_area_sqm"),
                    (Integer) rs.getObject("bedrooms"), (Integer) rs.getObject("bathrooms"),
                    rs.getString("construction_status"), rs.getBigDecimal("asking_price"), rs.getString("currency_code"),
                    new ArrayList<>(List.of(amenities)), rs.getString("developer_name"), images,
                    new SourceInfo(rs.getString("ds_name"), rs.getString("source_type"), rs.getString("source_url"),
                            rs.getString("attribution_requirements"), rs.getBoolean("is_demo")),
                    verifications, instant(rs.getTimestamp("published_at")), instant(rs.getTimestamp("last_checked_at")),
                    instant(rs.getTimestamp("source_updated_at")), others, rs.getBoolean("is_demo"));
        }).optional();
    }

    public static String verificationLabel(String kind) {
        return switch (kind) {
            case "location_reviewed" -> "Location reviewed";
            case "source_contacted" -> "Source contacted";
            case "documents_reviewed" -> "Documents reviewed";
            default -> kind;
        };
    }

    /** Whether a published listing exists with this id (used by inquiries). Returns the property id. */
    public Optional<java.util.UUID> findPublishedListingPropertyId(java.util.UUID listingId) {
        return jdbc.sql("SELECT property_id FROM listing WHERE id = :id AND publication_status = 'published'")
                .param("id", listingId).query(java.util.UUID.class).optional();
    }
}
