package az.investin.neighborhood;

import az.investin.common.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/neighborhoods")
@Tag(name = "Neighborhoods (public)")
public class NeighborhoodController {
    /** Asking-price statistics are only published when the sample in a currency is at least this large. */
    static final int MIN_STATS_SAMPLE = 5;
    static final int NEARBY_PLACES_RADIUS_M = 3000;

    public record NeighborhoodSummary(String slug, String name, String description, double centerLatitude,
                                      double centerLongitude, long listingCount) {}

    public record PriceStats(String currency, long sampleSize, BigDecimal min, BigDecimal median, BigDecimal max) {}

    public record NearbyPlace(String name, String category, double latitude, double longitude, String sourceName, Instant lastCheckedAt) {}

    public record NeighborhoodDetail(String slug, String name, String description, double centerLatitude, double centerLongitude,
                                     String boundaryGeoJson, String boundarySource, Instant dataUpdatedAt,
                                     long listingCount, List<PriceStats> askingPriceStats, String statsNote,
                                     List<NearbyPlace> nearbyPlaces) {}

    private final JdbcClient jdbc;

    public NeighborhoodController(JdbcClient jdbc) { this.jdbc = jdbc; }

    private static final String COUNT = "(SELECT count(DISTINCT p.id) FROM property p JOIN listing l ON l.property_id = p.id"
            + " AND l.publication_status = 'published' WHERE p.neighborhood_id = n.id)";

    @GetMapping
    @Operation(summary = "Neighborhood directory with current published-listing counts")
    public List<NeighborhoodSummary> list() {
        return jdbc.sql("SELECT n.slug, n.name, n.description, ST_Y(n.center::geometry) lat, ST_X(n.center::geometry) lng, "
                        + COUNT + " AS cnt FROM neighborhood n ORDER BY n.name")
                .query((rs, i) -> new NeighborhoodSummary(rs.getString("slug"), rs.getString("name"), rs.getString("description"),
                        rs.getDouble("lat"), rs.getDouble("lng"), rs.getLong("cnt"))).list();
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Neighborhood detail; statistics appear only when the sample is large enough")
    public NeighborhoodDetail detail(@PathVariable String slug) {
        record Row(java.util.UUID id, String slug, String name, String description, double lat, double lng, String boundary,
                   String boundarySource, Instant updated, long cnt) {}
        Row row = jdbc.sql("SELECT n.id, n.slug, n.name, n.description, ST_Y(n.center::geometry) lat, ST_X(n.center::geometry) lng,"
                        + " CASE WHEN n.boundary IS NULL THEN NULL ELSE ST_AsGeoJSON(n.boundary::geometry) END AS boundary,"
                        + " n.boundary_source, n.data_updated_at, " + COUNT + " AS cnt FROM neighborhood n WHERE n.slug = :slug")
                .param("slug", slug)
                .query((rs, i) -> new Row(rs.getObject("id", java.util.UUID.class), rs.getString("slug"), rs.getString("name"),
                        rs.getString("description"), rs.getDouble("lat"), rs.getDouble("lng"), rs.getString("boundary"),
                        rs.getString("boundary_source"), rs.getTimestamp("data_updated_at").toInstant(), rs.getLong("cnt")))
                .optional().orElseThrow(() -> ApiException.notFound("Neighborhood not found"));

        List<PriceStats> stats = jdbc.sql("SELECT l.currency_code, count(*) cnt, min(l.asking_price) mn,"
                        + " percentile_cont(0.5) WITHIN GROUP (ORDER BY l.asking_price) med, max(l.asking_price) mx"
                        + " FROM listing l JOIN property p ON p.id = l.property_id"
                        + " WHERE p.neighborhood_id = :id AND l.publication_status = 'published'"
                        + " GROUP BY l.currency_code HAVING count(*) >= :min ORDER BY l.currency_code")
                .param("id", row.id()).param("min", MIN_STATS_SAMPLE)
                .query((rs, i) -> new PriceStats(rs.getString("currency_code"), rs.getLong("cnt"), rs.getBigDecimal("mn"),
                        rs.getBigDecimal("med").setScale(2, java.math.RoundingMode.HALF_UP), rs.getBigDecimal("mx"))).list();

        List<NearbyPlace> places = jdbc.sql("SELECT pl.name, pl.category, ST_Y(pl.location::geometry) lat, ST_X(pl.location::geometry) lng,"
                        + " ds.name AS source_name, pl.last_checked_at FROM place pl JOIN data_source ds ON ds.id = pl.data_source_id"
                        + " JOIN neighborhood n ON n.id = :id WHERE ST_DWithin(pl.location, n.center, :radius) ORDER BY pl.name")
                .param("id", row.id()).param("radius", NEARBY_PLACES_RADIUS_M)
                .query((rs, i) -> new NearbyPlace(rs.getString("name"), rs.getString("category"), rs.getDouble("lat"),
                        rs.getDouble("lng"), rs.getString("source_name"), rs.getTimestamp("last_checked_at").toInstant())).list();

        String note = stats.isEmpty()
                ? "Insufficient data: asking-price statistics are shown only when at least " + MIN_STATS_SAMPLE
                + " published listings share a currency."
                : "Statistics describe asking prices of currently published listings only, per currency. They are not sale prices or market valuations.";
        return new NeighborhoodDetail(row.slug(), row.name(), row.description(), row.lat(), row.lng(), row.boundary(),
                row.boundarySource(), row.updated(), row.cnt(), stats, note, places);
    }
}
