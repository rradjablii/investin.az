package az.investin.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Small in-memory fixed-window limiter per client address. Fine for a single-instance MVP;
 * replace with a shared store (Redis, gateway rules) when running several instances.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private record Window(long startedAt, int count) {}

    private final AppProperties props;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(AppProperties props) { this.props = props; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !props.rateLimitEnabled() || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String uri = req.getRequestURI();
        boolean post = "POST".equals(req.getMethod());
        String bucket;
        int limit;
        Duration window;
        if (post && uri.equals("/api/v1/admin/auth/login")) {
            bucket = "login"; limit = props.loginAttemptsPer15Min(); window = Duration.ofMinutes(15);
        } else if (post && uri.equals("/api/v1/inquiries")) {
            bucket = "inquiry"; limit = props.inquiriesPerHour(); window = Duration.ofHours(1);
        } else if (uri.startsWith("/api/v1/media/")) {
            chain.doFilter(req, res); // static-like, cached by browsers/CDN
            return;
        } else {
            bucket = "api"; limit = props.apiRequestsPerMinute(); window = Duration.ofMinutes(1);
        }
        if (!allow(bucket + ":" + req.getRemoteAddr(), limit, window.toMillis())) {
            res.setStatus(429);
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.setHeader("Retry-After", String.valueOf(window.toSeconds()));
            res.getWriter().write("{\"status\":429,\"code\":\"rate_limited\",\"message\":\"Too many requests, please try again later\",\"details\":[]}");
            return;
        }
        chain.doFilter(req, res);
    }

    public boolean allow(String key, int limit, long windowMs) {
        long now = System.currentTimeMillis();
        if (windows.size() > 50_000) windows.entrySet().removeIf(e -> now - e.getValue().startedAt() > 3_600_000);
        Window w = windows.merge(key, new Window(now, 1),
                (old, fresh) -> now - old.startedAt() > windowMs ? fresh : new Window(old.startedAt(), old.count() + 1));
        return w.count() <= limit;
    }
}
