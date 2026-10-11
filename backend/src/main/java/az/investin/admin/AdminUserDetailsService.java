package az.investin.admin;

import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class AdminUserDetailsService implements UserDetailsService {
    private final JdbcClient jdbc;

    public AdminUserDetailsService(JdbcClient jdbc) { this.jdbc = jdbc; }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return jdbc.sql("SELECT email, password_hash, role, enabled FROM admin_user WHERE lower(email) = lower(:e)")
                .param("e", email)
                .query((rs, i) -> User.withUsername(rs.getString("email")).password(rs.getString("password_hash"))
                        .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + rs.getString("role"))))
                        .disabled(!rs.getBoolean("enabled")).build())
                .optional().orElseThrow(() -> new UsernameNotFoundException("unknown user"));
    }
}
