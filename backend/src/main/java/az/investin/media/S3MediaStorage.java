package az.investin.media;

import az.investin.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * S3-compatible object storage. Keep the bucket private: images are only ever served through /api/v1/media (which
 * enforces key validation and caching headers), so no public bucket policy is needed.
 */
@Component
@ConditionalOnProperty(name = "app.storage-type", havingValue = "s3")
public class S3MediaStorage implements MediaStorage {
    private final S3Client s3;
    private final String bucket;

    public S3MediaStorage(AppProperties props, org.springframework.core.env.Environment env) {
        this.bucket = require(env, "app.s3.bucket");
        var b = S3Client.builder()
                .region(Region.of(env.getProperty("app.s3.region", "auto")))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(env.getProperty("app.s3.path-style", Boolean.class, true)).build());
        String endpoint = env.getProperty("app.s3.endpoint", "");
        if (!endpoint.isBlank()) b.endpointOverride(URI.create(endpoint));
        String key = env.getProperty("app.s3.access-key", "");
        if (!key.isBlank()) b.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(key, require(env, "app.s3.secret-key"))));
        this.s3 = b.build();
    }

    private static String require(org.springframework.core.env.Environment env, String k) {
        String v = env.getProperty(k, "");
        if (v.isBlank()) throw new IllegalStateException(k + " must be set when app.storage-type=s3");
        return v;
    }

    @Override
    public String store(InputStream data, String extension) throws IOException {
        String key = "uploads/" + UUID.randomUUID() + "." + extension;
        byte[] bytes = data.readAllBytes(); // uploads are capped at 8 MB
        String type = extension.equals("png") ? "image/png" : extension.equals("webp") ? "image/webp" : "image/jpeg";
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(type).build(), RequestBody.fromBytes(bytes));
        return key;
    }

    @Override
    public Optional<Resource> load(String storageKey) {
        if (storageKey.startsWith("demo/")) { // bundled demo images are never uploaded to the bucket
            String name = storageKey.substring("demo/".length());
            if (!name.matches("[a-z0-9-]+\\.svg")) return Optional.empty();
            var res = new org.springframework.core.io.ClassPathResource("demo-media/" + name);
            return res.exists() ? Optional.of(res) : Optional.empty();
        }
        try {
            byte[] bytes = s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(storageKey).build()).asByteArray();
            return Optional.of(new ByteArrayResource(bytes));
        } catch (NoSuchKeyException e) {
            return Optional.empty();
        }
    }

    @Override
    public void delete(String storageKey) {
        if (storageKey.startsWith("demo/")) return;
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
        } catch (RuntimeException ignored) {
            // best effort; the database row is the source of truth
        }
    }
}
