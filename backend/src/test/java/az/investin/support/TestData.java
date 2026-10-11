package az.investin.support;

import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Fixture builder: inserts rows directly so tests do not depend on the API under test. */
public class TestData {
    private final JdbcClient jdbc;
    public final UUID source;

    public TestData(JdbcClient jdbc) {
        this.jdbc = jdbc;
        this.source = jdbc.sql("INSERT INTO data_source (name, source_type, permission_status) VALUES ('Test agency', 'agency', 'granted') RETURNING id")
                .query(UUID.class).single();
    }

    public record Created(UUID propertyId, UUID listingId, String slug) {}

    /** Builder-ish: lng/lat, type, price in currency, bedrooms (nullable), area (nullable), status. */
    public Created listing(String slug, double lng, double lat, String type, String currency, String price, Integer bedrooms,
                           String area, String status, String neighborhoodSlug) {
        UUID pid = jdbc.sql("INSERT INTO property (slug, property_type, location, location_precision, neighborhood_id, area_sqm, bedrooms)"
                        + " VALUES (:slug, :type, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, 'exact',"
                        + " (SELECT id FROM neighborhood WHERE slug = :hood), :area, :beds) RETURNING id")
                .param("slug", slug).param("type", type).param("lng", lng).param("lat", lat).param("hood", neighborhoodSlug)
                .param("area", area == null ? null : new BigDecimal(area)).param("beds", bedrooms).query(UUID.class).single();
        UUID lid = jdbc.sql("INSERT INTO listing (property_id, data_source_id, title, description, asking_price, currency_code, publication_status,"
                        + " published_at, last_checked_at) VALUES (:p, :ds, :title, 'Test description for the listing', :price, :cur, :st,"
                        + " CASE WHEN :st = 'published' THEN now() ELSE NULL END, now()) RETURNING id")
                .param("p", pid).param("ds", source).param("title", "Listing " + slug).param("price", new BigDecimal(price))
                .param("cur", currency).param("st", status).query(UUID.class).single();
        return new Created(pid, lid, slug);
    }

    public void media(UUID propertyId, UUID listingId, String key, boolean primary, String rights) {
        jdbc.sql("INSERT INTO property_media (property_id, listing_id, storage_key, alt_text, display_order, is_primary, rights_reference)"
                        + " VALUES (:p, :l, :k, 'alt text', 0, :prim, :r)")
                .param("p", propertyId).param("l", listingId).param("k", key).param("prim", primary).param("r", rights).update();
    }
}
