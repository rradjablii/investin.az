package az.investin.admin;

import az.investin.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the first administrator from ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD, only if no admin exists.
 * There is no built-in default account. Remove the variables after first start.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    static final int MIN_PASSWORD_LENGTH = 12;

    private final JdbcClient jdbc;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    public AdminBootstrap(JdbcClient jdbc, PasswordEncoder encoder, AppProperties props) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        Long admins = jdbc.sql("SELECT count(*) FROM admin_user").query(Long.class).single();
        String email = props.adminBootstrapEmail();
        String password = props.adminBootstrapPassword();
        boolean emailSet = email != null && !email.isBlank();
        boolean passwordSet = password != null && !password.isBlank();
        if (admins != null && admins > 0) {
            if (emailSet || passwordSet) log.info("Admin bootstrap variables are set but an admin already exists; ignoring them. Remove them from the environment.");
            return;
        }
        if (!emailSet || !passwordSet) {
            log.warn("No administrator exists. Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD and restart to create one.");
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("ADMIN_BOOTSTRAP_PASSWORD must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        jdbc.sql("INSERT INTO admin_user (email, password_hash, role) VALUES (:e, :p, 'ADMIN')")
                .param("e", email.trim().toLowerCase()).param("p", encoder.encode(password)).update();
        log.info("Created bootstrap administrator {}. Remove ADMIN_BOOTSTRAP_* from the environment now.", email.trim());
    }
}
