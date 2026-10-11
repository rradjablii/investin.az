package az.investin.inquiry;

import az.investin.common.ApiException;
import az.investin.property.PropertyRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inquiries")
@Tag(name = "Inquiries (public)")
public class InquiryController {
    public record InquiryRequest(
            @NotNull UUID listingId,
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @Size(max = 40) String phone,
            @NotBlank @Size(min = 10, max = 2000) String message,
            /** Honeypot: real users never see or fill this field. */
            @Size(max = 200) String website) {}

    public record InquiryReceipt(String status) {}

    private final JdbcClient jdbc;
    private final PropertyRepository properties;
    private final InquiryNotifier notifier;

    public InquiryController(JdbcClient jdbc, PropertyRepository properties, InquiryNotifier notifier) {
        this.jdbc = jdbc;
        this.properties = properties;
        this.notifier = notifier;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send an inquiry about a published listing (rate limited, honeypot protected)")
    public InquiryReceipt create(@Valid @RequestBody InquiryRequest req) {
        if (req.website() != null && !req.website().isBlank()) {
            return new InquiryReceipt("received"); // bot: pretend success, store nothing
        }
        UUID propertyId = properties.findPublishedListingPropertyId(req.listingId())
                .orElseThrow(() -> ApiException.notFound("This listing is not available"));
        String phone = req.phone() == null || req.phone().isBlank() ? null : req.phone().trim();
        UUID id = jdbc.sql("INSERT INTO inquiry (property_id, listing_id, name, email, phone, message) "
                        + "VALUES (:p, :l, :n, :e, :ph, :m) RETURNING id")
                .param("p", propertyId).param("l", req.listingId()).param("n", req.name().trim())
                .param("e", req.email().trim()).param("ph", phone).param("m", req.message().trim())
                .query(UUID.class).single();
        String title = jdbc.sql("SELECT title FROM listing WHERE id = :id").param("id", req.listingId()).query(String.class).single();
        notifier.inquiryReceived(id, title, req.name().trim(), req.email().trim(), phone, req.message().trim());
        return new InquiryReceipt("received");
    }
}
