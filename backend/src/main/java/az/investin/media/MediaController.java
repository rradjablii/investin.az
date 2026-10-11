package az.investin.media;

import az.investin.common.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.awt.Image;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;

/** Serves stored images; optional ?w= returns a down-scaled JPEG/PNG for responsive delivery. */
@RestController
@RequestMapping("/api/v1/media")
@Tag(name = "Media (public)")
public class MediaController {
    private static final int[] WIDTHS = {320, 640, 960, 1280};

    private final MediaStorage storage;
    /** Resized variants are a disposable cache on local disk regardless of where originals live. */
    private final Path cacheRoot;

    public MediaController(MediaStorage storage, az.investin.config.AppProperties props) {
        this.storage = storage;
        this.cacheRoot = Path.of(props.storageDir()).toAbsolutePath().normalize().resolve(".cache");
    }

    @GetMapping("/**")
    @Operation(summary = "Fetch an image by storage key")
    public ResponseEntity<?> get(HttpServletRequest request, @RequestParam(required = false) Integer w) throws IOException {
        String path = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String key = path.substring("/api/v1/media/".length());
        if (key.isBlank() || key.contains("..") || key.contains("\\") || key.length() > 300) throw ApiException.notFound("Not found");
        Resource res = storage.load(key).orElseThrow(() -> ApiException.notFound("Not found"));
        String lower = key.toLowerCase(Locale.ROOT);
        CacheControl cache = CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic();

        if (lower.endsWith(".svg")) {
            return ResponseEntity.ok().cacheControl(cache).contentType(MediaType.valueOf("image/svg+xml"))
                    .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
                    .body(res);
        }
        MediaType type = lower.endsWith(".png") ? MediaType.IMAGE_PNG
                : lower.endsWith(".webp") ? MediaType.valueOf("image/webp") : MediaType.IMAGE_JPEG;
        if (w != null && !lower.endsWith(".webp")) {
            int target = snap(w);
            byte[] scaled = scaled(res, key, target, lower.endsWith(".png"));
            if (scaled != null) return ResponseEntity.ok().cacheControl(cache).contentType(type).body(scaled);
        }
        return ResponseEntity.ok().cacheControl(cache).contentType(type).body(res);
    }

    private static int snap(int w) {
        for (int s : WIDTHS) if (w <= s) return s;
        return WIDTHS[WIDTHS.length - 1];
    }

    private byte[] scaled(Resource res, String key, int width, boolean png) throws IOException {
        Path cached = cacheRoot.resolve(width + "_" + key.replace('/', '_'));
        if (Files.isRegularFile(cached)) return Files.readAllBytes(cached);
        BufferedImage src;
        try (var in = res.getInputStream()) {
            src = ImageIO.read(in);
        } catch (IOException | RuntimeException e) {
            return null; // undecodable image: serve the original bytes instead of failing
        }
        if (src == null || src.getWidth() <= width) return null;
        int h = Math.max(1, Math.round(src.getHeight() * (width / (float) src.getWidth())));
        BufferedImage dst = new BufferedImage(width, h, png ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        var g = dst.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(src.getScaledInstance(width, h, Image.SCALE_SMOOTH), 0, 0, null);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(dst, png ? "png" : "jpg", out);
        Files.createDirectories(cached.getParent());
        Files.write(cached, out.toByteArray());
        return out.toByteArray();
    }
}
