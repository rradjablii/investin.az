package az.investin.property;

import static org.junit.jupiter.api.Assertions.*;

import az.investin.common.ApiException;
import az.investin.common.Slugs;
import az.investin.config.AppProperties;
import az.investin.config.RateLimitFilter;
import az.investin.media.ImageValidator;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ImageAndSlugTest {
    @Test
    void detectsRealImageTypesByContent() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        byte[] webp = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};
        assertEquals("png", ImageValidator.detectExtension(new MockMultipartFile("f", "x.exe", "text/plain", png)));
        assertEquals("webp", ImageValidator.detectExtension(new MockMultipartFile("f", "x", "x", webp)));
    }

    @Test
    void rejectsSvgHtmlAndEmptyFiles() {
        assertThrows(ApiException.class, () -> ImageValidator.detectExtension(new MockMultipartFile("f", "a.jpg", "image/jpeg", "<svg xmlns='x'></svg>".getBytes())));
        assertThrows(ApiException.class, () -> ImageValidator.detectExtension(new MockMultipartFile("f", "a.jpg", "image/jpeg", "<html><script>".getBytes())));
        assertThrows(ApiException.class, () -> ImageValidator.detectExtension(new MockMultipartFile("f", "a.jpg", "image/jpeg", new byte[0])));
    }

    @Test
    void slugifyHandlesAzerbaijaniAndSymbols() {
        assertEquals("seher-merkezi-2", Slugs.slugify("Şəhər Mərkəzi #2"));
        assertEquals("flat-in-baku", Slugs.slugify("  Flat in Baku!! "));
        assertEquals("", Slugs.slugify("???"));
    }

    @Test
    void rateLimiterBlocksAfterLimit() {
        RateLimitFilter f = new RateLimitFilter(new AppProperties("x", "", "", "", "", 60, true, 100, 5, 10));
        for (int i = 0; i < 3; i++) assertTrue(f.allow("k", 3, 60_000));
        assertFalse(f.allow("k", 3, 60_000));
        assertTrue(f.allow("other", 3, 60_000));
    }
}
