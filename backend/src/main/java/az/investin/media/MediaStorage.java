package az.investin.media;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;
import org.springframework.core.io.Resource;

/**
 * Object-storage abstraction. The local implementation writes to disk;
 * an S3-compatible implementation can replace it without touching callers.
 */
public interface MediaStorage {
    /** Stores validated image bytes; returns the storage key (never a client-supplied name). */
    String store(InputStream data, String extension) throws IOException;

    Optional<Resource> load(String storageKey);

    void delete(String storageKey);
}
