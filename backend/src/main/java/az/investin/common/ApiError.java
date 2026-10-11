package az.investin.common;

import java.time.Instant;
import java.util.List;

/** Consistent error body for every non-2xx API response. */
public record ApiError(int status, String code, String message, List<String> details, Instant timestamp) {
    public static ApiError of(int status, String code, String message, List<String> details) {
        return new ApiError(status, code, message, details, Instant.now());
    }
}
