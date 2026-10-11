package az.investin.property;

import az.investin.common.ApiException;
import az.investin.property.PropertyDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/properties")
@Tag(name = "Properties (public)")
public class PropertyController {
    static final int MARKER_LIMIT = 1000;

    private final PropertyRepository repository;

    public PropertyController(PropertyRepository repository) { this.repository = repository; }

    @GetMapping
    @Operation(summary = "Search published properties by bounding box and filters")
    public SearchResponse search(
            @RequestParam(required = false) Double west, @RequestParam(required = false) Double south,
            @RequestParam(required = false) Double east, @RequestParam(required = false) Double north,
            @RequestParam(required = false) List<String> type,
            @RequestParam(required = false) BigDecimal minPrice, @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) Integer minBedrooms, @RequestParam(required = false) Integer maxBedrooms,
            @RequestParam(required = false) BigDecimal minArea, @RequestParam(required = false) BigDecimal maxArea,
            @RequestParam(required = false) List<String> constructionStatus,
            @RequestParam(required = false) String neighborhood, @RequestParam(required = false) Integer freshnessDays,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return repository.search(SearchCriteria.validated(west, south, east, north, type, minPrice, maxPrice, currency,
                minBedrooms, maxBedrooms, minArea, maxArea, constructionStatus, neighborhood, freshnessDays, sort, page, size));
    }

    @GetMapping("/markers")
    @Operation(summary = "Compact map markers for the same filters (capped at 1000)")
    public MarkerResponse markers(
            @RequestParam(required = false) Double west, @RequestParam(required = false) Double south,
            @RequestParam(required = false) Double east, @RequestParam(required = false) Double north,
            @RequestParam(required = false) List<String> type,
            @RequestParam(required = false) BigDecimal minPrice, @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) Integer minBedrooms, @RequestParam(required = false) Integer maxBedrooms,
            @RequestParam(required = false) BigDecimal minArea, @RequestParam(required = false) BigDecimal maxArea,
            @RequestParam(required = false) List<String> constructionStatus,
            @RequestParam(required = false) String neighborhood, @RequestParam(required = false) Integer freshnessDays) {
        return repository.markers(SearchCriteria.validated(west, south, east, north, type, minPrice, maxPrice, currency,
                minBedrooms, maxBedrooms, minArea, maxArea, constructionStatus, neighborhood, freshnessDays, "newest", 0, 1), MARKER_LIMIT);
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Public detail of a published property; 404 when not (or no longer) published")
    public PropertyDetail detail(@PathVariable String slug) {
        return repository.findDetail(slug).orElseThrow(() -> ApiException.notFound("Property not found or no longer available"));
    }
}
