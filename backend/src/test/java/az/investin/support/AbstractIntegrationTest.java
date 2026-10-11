package az.investin.support;

import az.investin.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {
    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcClient jdbc;
    protected TestData data;

    @BeforeEach
    void cleanDatabase() {
        jdbc.sql("TRUNCATE inquiry, property_media, listing_verification, listing_status_history, listing, property, place, audit_log, data_source, admin_user CASCADE").update();
        data = new TestData(jdbc);
    }
}
