package az.investin.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * An existing admin session must not outlive the account: on every admin request the account is re-read, and the session is
 * dropped when it was disabled, deleted, or its role changed. (One indexed lookup per admin request.)
 */
public class AdminSessionRevalidationFilter extends OncePerRequestFilter {
    private final JdbcClient jdbc;

    public AdminSessionRevalidationFilter(JdbcClient jdbc) { this.jdbc = jdbc; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest r) {
        return !r.getRequestURI().startsWith("/api/v1/admin/") || r.getRequestURI().startsWith("/api/v1/admin/auth/login");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.isAuthenticated() && !(a instanceof AnonymousAuthenticationToken)) {
            String role = jdbc.sql("SELECT role FROM admin_user WHERE lower(email) = lower(:e) AND enabled").param("e", a.getName())
                    .query(String.class).optional().orElse(null);
            boolean same = role != null && a.getAuthorities().stream().anyMatch(g -> g.getAuthority().equals("ROLE_" + role));
            if (!same) {
                var s = req.getSession(false);
                if (s != null) s.invalidate();
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(req, res);
    }
}
