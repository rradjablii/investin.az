package az.investin.media;

import az.investin.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.storage-type", havingValue = "local", matchIfMissing = true)
public class LocalMediaStorage implements MediaStorage {
    private final Path root;

    public LocalMediaStorage(AppProperties props) {
        this.root = Path.of(props.storageDir()).toAbsolutePath().normalize();
    }

    public Path root() { return root; }

    @Override
    public String store(InputStream data, String extension) throws IOException {
        String key = "uploads/" + UUID.randomUUID() + "." + extension;
        Path target = resolve(key);
        Files.createDirectories(target.getParent());
        Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
        return key;
    }

    @Override
    public Optional<Resource> load(String storageKey) {
        if (storageKey.startsWith("demo/")) { // bundled, clearly-labelled demonstration images (dev only)
            String name = storageKey.substring("demo/".length());
            if (!name.matches("[a-z0-9-]+\\.svg")) return Optional.empty();
            ClassPathResource res = new ClassPathResource("demo-media/" + name);
            return res.exists() ? Optional.of(res) : Optional.empty();
        }
        Path p = resolve(storageKey);
        return Files.isRegularFile(p) ? Optional.of(new FileSystemResource(p)) : Optional.empty();
    }

    @Override
    public void delete(String storageKey) {
        if (storageKey.startsWith("demo/")) return;
        try {
            Files.deleteIfExists(resolve(storageKey));
        } catch (IOException ignored) {
            // best effort; the database row is the source of truth
        }
    }

    Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new IllegalArgumentException("Invalid storage key");
        return p;
    }
}
