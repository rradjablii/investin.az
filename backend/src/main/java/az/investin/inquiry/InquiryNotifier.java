package az.investin.inquiry;

import java.util.UUID;

/** Called after an inquiry is stored. Implementations must never throw into the request. */
public interface InquiryNotifier {
    void inquiryReceived(UUID inquiryId, String listingTitle, String name, String email, String phone, String message);
}
