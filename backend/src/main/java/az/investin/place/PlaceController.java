package az.investin.place;

import az.investin.common.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Places and search suggestions (public)")
public class PlaceController {
    static final Set<String> CATEGORIES = Set.of("transport", "education", "health", "shopping", "park", "culture", "other");

    public record PlaceDto(String id, String name, String category, double latitude, double longitude, String sourceName, Instant lastCheckedAt) {}

    public record Suggestion(String type, String label, String slug, Double latitude, Double longitude) {}

    private final JdbcClient jdbc;

    public PlaceController(JdbcClient jdbc) { this.jdbc = jdbc; }

    @GetMapping("/places")
    @Operation(summary = "Points of interest within a bounding box")
    public List<PlaceDto> places(@RequestParam double west, @RequestParam double south, @RequestParam double east,
                                 @RequestParam double north, @RequestParam(required = false) List<String> category) {
        if (south >= north || west >= east || south < -90 || north > 90 || west < -180 || east > 180
                || north - south > 5 || east - west > 5) {
            throw ApiException.badRequest("Invalid bounding box");
        }
        List<String> cats = new ArrayList<>();
        if (category != null) {
            for (String c : category) {
                for (String part : c.split(",")) {
                    String v = part.trim().toLowerCase(Locale.ROOT);
                    if (v.isEmpty()) continue;
                    if (!CATEGORIES.contains(v)) throw ApiException.badRequest("Unknown category: " + v);
                    cats.add(v);
                }
            }
        }
        String sql = "SELECT pl.id, pl.name, pl.category, ST_Y(pl.location::geometry) lat, ST_X(pl.location::geometry) lng,"
                + " ds.name AS source_name, pl.last_checked_at FROM place pl JOIN data_source ds ON ds.id = pl.data_source_id"
                + " WHERE ST_Intersects(pl.location, ST_MakeEnvelope(:w, :s, :e, :n, 4326)::geography)"
                + (cats.isEmpty() ? "" : " AND pl.category IN (:cats)") + " ORDER BY pl.name LIMIT 200";
        var spec = jdbc.sql(sql).param("w", west).param("s", south).param("e", east).param("n", north);
        if (!cats.isEmpty()) spec = spec.param("cats", cats);
        return spec.query((rs, i) -> new PlaceDto(rs.getString("id"), rs.getString("name"), rs.getString("category"),
                rs.getDouble("lat"), rs.getDouble("lng"), rs.getString("source_name"), rs.getTimestamp("last_checked_at").toInstant())).list();
    }

    @GetMapping("/search/suggestions")
    @Operation(summary = "Neighborhood and place name suggestions (min. 2 characters)")
    public List<Suggestion> suggestions(@RequestParam String q) {
        String term = q == null ? "" : q.trim();
        if (term.length() < 2) return List.of();
        if (term.length() > 80) throw ApiException.badRequest("Query too long");
        String like = "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        List<Suggestion> out = new ArrayList<>();
        out.addAll(jdbc.sql("SELECT slug, name, ST_Y(center::geometry) lat, ST_X(center::geometry) lng FROM neighborhood"
                        + " WHERE name ILIKE :q ORDER BY name LIMIT 5").param("q", like)
                .query((rs, i) -> new Suggestion("neighborhood", rs.getString("name"), rs.getString("slug"),
                        rs.getDouble("lat"), rs.getDouble("lng"))).list());
        out.addAll(jdbc.sql("SELECT name, ST_Y(location::geometry) lat, ST_X(location::geometry) lng FROM place"
                        + " WHERE name ILIKE :q ORDER BY name LIMIT 5").param("q", like)
                .query((rs, i) -> new Suggestion("place", rs.getString("name"), null, rs.getDouble("lat"), rs.getDouble("lng"))).list());
        return out;
    }
}
