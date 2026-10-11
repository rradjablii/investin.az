package az.investin.admin;

import az.investin.common.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/auth")
@Tag(name = "Admin authentication")
public class AdminAuthController {
    public record LoginRequest(@NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 200) String password) {}

    public record CsrfInfo(String headerName, String token) {}

    public record Me(String email, String role) {}

    private final AuthenticationManager authManager;
    private final SecurityContextRepository contextRepository;

    public AdminAuthController(AuthenticationManager authManager, SecurityContextRepository contextRepository) {
        this.authManager = authManager;
        this.contextRepository = contextRepository;
    }

    @GetMapping("/csrf")
    @Operation(summary = "Issue the CSRF token (also set as the XSRF-TOKEN cookie)")
    public CsrfInfo csrf(CsrfToken token) { return new CsrfInfo(token.getHeaderName(), token.getToken()); }

    @PostMapping("/login")
    @Operation(summary = "Start an admin session (cookie)")
    public Me login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        Authentication auth;
        try {
            auth = authManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(body.email().trim(), body.password()));
        } catch (AuthenticationException e) {
            // Same message for unknown user / wrong password / disabled account.
            throw new ApiException(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Invalid email or password");
        }
        if (request.getSession(false) != null) request.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return me(auth);
    }

    @PostMapping("/logout")
    @Operation(summary = "End the admin session")
    public void logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
    }

    @GetMapping("/me")
    @Operation(summary = "Current admin, or 401")
    public Me me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "Authentication required");
        }
        String role = auth.getAuthorities().stream().findFirst().map(a -> a.getAuthority().replace("ROLE_", "")).orElse("");
        return new Me(auth.getName(), role);
    }
}
