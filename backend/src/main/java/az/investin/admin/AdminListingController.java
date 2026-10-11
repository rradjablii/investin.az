package az.investin.admin;

import az.investin.admin.AdminDtos.*;
import az.investin.common.ApiException;
import az.investin.property.PublicationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin: listings")
public class AdminListingController {
    public record NoteRequest(@Size(max = 1000) String note) {}

    public record VerificationRequest(String kind, @Size(max = 1000) String note) {}

    public record MediaPatch(String altText, String rightsReference, Integer displayOrder, Boolean primary) {}

    private final AdminListingService service;
    private final JsonMapper mapper;

    public AdminListingController(AdminListingService service, JsonMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping("/listings")
    @Operation(summary = "List listings in any status")
    public ListingPage list(@RequestParam(required = false) String status, @RequestParam(required = false) String q,
                            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        if (page < 0 || size < 1 || size > 100) throw ApiException.badRequest("Invalid pagination");
        return service.list(status, q, null, page, size);
    }

    @GetMapping("/review-queue")
    @Operation(summary = "Listings awaiting review, flagged, or stale")
    public ListingPage reviewQueue(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        if (page < 0 || size < 1 || size > 100) throw ApiException.badRequest("Invalid pagination");
        return service.list(null, null, "review-queue", page, size);
    }

    @GetMapping("/summary")
    public Summary summary() { return service.summary(); }

    @GetMapping("/listings/{id}")
    public AdminListing get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping("/listings")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a draft listing and its property")
    public AdminListing create(@RequestBody ListingForm form, Authentication auth) {
        return service.create(form, auth.getName());
    }

    @PatchMapping("/listings/{id}")
    @Operation(summary = "Partially update a listing: only the fields present in the body change (null clears)")
    public AdminListing patch(@PathVariable UUID id, @RequestBody ObjectNode patch, Authentication auth) {
        ListingForm current = service.get(id).form();
        ObjectNode merged = (ObjectNode) mapper.valueToTree(current);
        for (var it = patch.properties().iterator(); it.hasNext(); ) {
            var e = it.next();
            if (merged.has(e.getKey())) merged.set(e.getKey(), e.getValue());
        }
        ListingForm form;
        try {
            form = mapper.treeToValue(merged, ListingForm.class);
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid field value in request body");
        }
        return service.update(id, form, auth.getName(), isAdmin(auth));
    }

    @PostMapping("/listings/{id}/submit-review")
    public AdminListing submit(@PathVariable UUID id, Authentication auth) {
        return service.transition(id, PublicationStatus.REVIEW, null, auth.getName());
    }

    @PostMapping("/listings/{id}/publish")
    @Operation(summary = "Publish after server-side validation (ADMIN only)")
    public AdminListing publish(@PathVariable UUID id, Authentication auth) {
        return service.transition(id, PublicationStatus.PUBLISHED, null, auth.getName());
    }

    @PostMapping("/listings/{id}/unpublish")
    public AdminListing unpublish(@PathVariable UUID id, @RequestBody(required = false) NoteRequest body, Authentication auth) {
        return service.transition(id, PublicationStatus.UNPUBLISHED, body == null ? null : body.note(), auth.getName());
    }

    @PostMapping("/listings/{id}/archive")
    public AdminListing archive(@PathVariable UUID id, @RequestBody(required = false) NoteRequest body, Authentication auth) {
        return service.transition(id, PublicationStatus.ARCHIVED, body == null ? null : body.note(), auth.getName());
    }

    @PostMapping("/listings/{id}/restore")
    @Operation(summary = "Restore an archived listing to draft")
    public AdminListing restore(@PathVariable UUID id, Authentication auth) {
        return service.transition(id, PublicationStatus.DRAFT, "Restored from archive", auth.getName());
    }

    @PostMapping("/listings/{id}/flag-stale")
    @Operation(summary = "Flag a published listing as needing review; hides it from public discovery")
    public AdminListing flag(@PathVariable UUID id, @RequestBody(required = false) NoteRequest body, Authentication auth) {
        String note = body == null || body.note() == null || body.note().isBlank() ? "Flagged as possibly stale" : body.note();
        return service.transition(id, PublicationStatus.NEEDS_REVIEW, note, auth.getName());
    }

    @PostMapping("/listings/{id}/mark-checked")
    @Operation(summary = "Record that the listing was re-checked against its source just now")
    public AdminListing markChecked(@PathVariable UUID id, Authentication auth) {
        return service.markChecked(id, auth.getName());
    }

    @PostMapping("/listings/{id}/verifications")
    @Operation(summary = "Record a verification action that has actually taken place")
    public AdminListing verify(@PathVariable UUID id, @RequestBody VerificationRequest body, Authentication auth) {
        return service.addVerification(id, body.kind(), body.note(), auth.getName());
    }

    @GetMapping("/listings/{id}/publish-check")
    @Operation(summary = "Dry-run: what still blocks publication")
    public java.util.List<String> publishCheck(@PathVariable UUID id) {
        service.get(id);
        return service.publishProblems(id);
    }

    @PostMapping(value = "/listings/{id}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload an image (JPEG/PNG/WebP) with alt text and a rights reference")
    public AdminListing addMedia(@PathVariable UUID id, @RequestParam MultipartFile file, @RequestParam String altText,
                                 @RequestParam String rightsReference, @RequestParam(defaultValue = "false") boolean primary,
                                 Authentication auth) {
        return service.addMedia(id, file, altText, rightsReference, primary, auth.getName());
    }

    @PatchMapping("/media/{mediaId}")
    public AdminListing patchMedia(@PathVariable UUID mediaId, @RequestBody MediaPatch p, Authentication auth) {
        return service.updateMedia(mediaId, p.altText(), p.rightsReference(), p.displayOrder(), p.primary(), auth.getName());
    }

    @DeleteMapping("/media/{mediaId}")
    public AdminListing deleteMedia(@PathVariable UUID mediaId, Authentication auth) {
        return service.deleteMedia(mediaId, auth.getName());
    }

    private static boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
