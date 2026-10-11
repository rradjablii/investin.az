package az.investin.media;

import az.investin.common.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

/** Accepts only real JPEG/PNG/WebP content (checked by magic bytes, not the client's claimed type). SVG is rejected. */
public final class ImageValidator {
    private ImageValidator() {}

    public static String detectExtension(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("An image file is required");
        byte[] head = new byte[12];
        try (InputStream in = file.getInputStream()) {
            int n = in.readNBytes(head, 0, head.length);
            if (n < 12) throw invalid();
        } catch (IOException e) {
            throw invalid();
        }
        if ((head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF) return "jpg";
        if (Arrays.equals(Arrays.copyOf(head, 8), new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})) return "png";
        if (head[0] == 'R' && head[1] == 'I' && head[2] == 'F' && head[3] == 'F'
                && head[8] == 'W' && head[9] == 'E' && head[10] == 'B' && head[11] == 'P') return "webp";
        throw invalid();
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported_media", "Only JPEG, PNG or WebP images are accepted");
    }
}
