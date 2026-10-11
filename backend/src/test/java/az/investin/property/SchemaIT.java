package az.investin.property;

import static org.junit.jupiter.api.Assertions.*;

import az.investin.support.AbstractIntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class SchemaIT extends AbstractIntegrationTest {

    @Test
    void migrationsAppliedAndPostgisAvailable() {
        Integer applied = jdbc.sql("SELECT count(*) FROM flyway_schema_history WHERE success").query(Integer.class).single();
        assertTrue(applied >= 2);
        String postgis = jdbc.sql("SELECT postgis_version()").query(String.class).single();
        assertNotNull(postgis);
    }

    @Test
    void geographicColumnsHaveGistIndexes() {
        List<String> tables = jdbc.sql("SELECT tablename FROM pg_indexes WHERE indexdef ILIKE '%USING gist%' ORDER BY tablename")
                .query(String.class).list();
        assertTrue(tables.containsAll(List.of("property", "place", "neighborhood")));
    }

    @Test
    void nonPositivePriceIsRejectedByTheDatabase() {
        var c = data.listing("db-1", 49.8, 40.4, "apartment", "USD", "100", 1, "30", "draft", null);
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.sql("UPDATE listing SET asking_price = 0 WHERE id = :id").param("id", c.listingId()).update());
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.sql("UPDATE listing SET currency_code = 'XXX' WHERE id = :id").param("id", c.listingId()).update());
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.sql("UPDATE listing SET publication_status = 'bogus' WHERE id = :id").param("id", c.listingId()).update());
    }

    @Test
    void invalidAreasAndLandSemanticsAreRejected() {
        var c = data.listing("db-2", 49.8, 40.4, "apartment", "USD", "100", 1, "30", "draft", null);
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.sql("UPDATE property SET area_sqm = 0 WHERE id = :id").param("id", c.propertyId()).update());
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.sql("UPDATE property SET property_type = 'land' WHERE id = :id").param("id", c.propertyId()).update(),
                "land must not carry bedrooms/floor area");
    }

    @Test
    void duplicateExternalReferencePerSourceIsRejected() {
        var a = data.listing("db-3", 49.8, 40.4, "apartment", "USD", "100", 1, "30", "draft", null);
        var b = data.listing("db-4", 49.8, 40.4, "apartment", "USD", "100", 1, "30", "draft", null);
        jdbc.sql("UPDATE listing SET external_reference = 'X-1' WHERE id = :id").param("id", a.listingId()).update();
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.sql("UPDATE listing SET external_reference = 'X-1' WHERE id = :id").param("id", b.listingId()).update());
    }

    @Test
    void propertyWithListingsCannotBeDeleted() {
        var c = data.listing("db-5", 49.8, 40.4, "apartment", "USD", "100", 1, "30", "draft", null);
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.sql("DELETE FROM property WHERE id = :id").param("id", c.propertyId()).update());
    }

    @Test
    void onlyOnePrimaryImagePerProperty() {
        var c = data.listing("db-6", 49.8, 40.4, "apartment", "USD", "100", 1, "30", "draft", null);
        data.media(c.propertyId(), c.listingId(), "uploads/a.jpg", true, "r");
        assertThrows(DataIntegrityViolationException.class, () -> data.media(c.propertyId(), c.listingId(), "uploads/b.jpg", true, "r"));
    }
}
