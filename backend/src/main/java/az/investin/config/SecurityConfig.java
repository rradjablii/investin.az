package az.investin.config;

import az.investin.admin.AdminUserDetailsService;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }

    @Bean
    AuthenticationManager authenticationManager(AdminUserDetailsService users, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, SecurityContextRepository repo, org.springframework.jdbc.core.simple.JdbcClient jdbc) throws Exception {
        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepo.setCookiePath("/");
        http
            .addFilterAfter(new AdminSessionRevalidationFilter(jdbc), org.springframework.security.web.context.SecurityContextHolderFilter.class)
            .securityContext(c -> c.securityContextRepository(repo))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                    .sessionFixation(f -> f.changeSessionId()))
            // CSRF protects every cookie-authenticated (admin) mutation. The public inquiry form carries no
            // credentials and is protected by rate limiting + honeypot instead.
            .csrf(csrf -> csrf.csrfTokenRepository(csrfRepo)
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                    .ignoringRequestMatchers("/api/v1/inquiries"))
            .headers(h -> h
                    .contentTypeOptions(Customizer.withDefaults())
                    .frameOptions(f -> f.deny())
                    .referrerPolicy(r -> r.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))
            .authorizeHttpRequests(a -> a
                    .requestMatchers("/api/v1/admin/auth/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/admin/listings/*/publish", "/api/v1/admin/listings/*/unpublish",
                            "/api/v1/admin/listings/*/archive", "/api/v1/admin/data-sources").hasRole("ADMIN")
                    .requestMatchers("/api/v1/admin/users/**", "/api/v1/admin/users").hasRole("ADMIN")
                    .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN", "EDITOR")
                    .requestMatchers("/actuator/health/**", "/api/v1/docs/**", "/api/v1/openapi/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    .requestMatchers("/api/v1/**").permitAll()
                    .anyRequest().denyAll())
            .exceptionHandling(e -> e
                    .authenticationEntryPoint((req, res, ex) -> writeJson(res, HttpStatus.UNAUTHORIZED, "unauthorized", "Authentication required"))
                    .accessDeniedHandler((req, res, ex) -> writeJson(res, HttpStatus.FORBIDDEN, "forbidden", "Not allowed")))
            .formLogin(f -> f.disable())
            .httpBasic(b -> b.disable())
            .logout(l -> l.disable());
        return http.build();
    }

    private static void writeJson(jakarta.servlet.http.HttpServletResponse res, HttpStatus status, String code, String message) throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.getWriter().write("{\"status\":" + status.value() + ",\"code\":\"" + code + "\",\"message\":\"" + message + "\",\"details\":[]}");
    }
}
