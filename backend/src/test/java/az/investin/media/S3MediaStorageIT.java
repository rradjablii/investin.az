package az.investin.media;

import static org.junit.jupiter.api.Assertions.*;

import az.investin.config.AppProperties;
import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

/** Runs the S3 implementation against a real S3-compatible server (Adobe S3Mock). */
class S3MediaStorageIT {
    static GenericContainer<?> minio = new GenericContainer<>(DockerImageName.parse("adobe/s3mock:latest"))
            .withEnv("COM_ADOBE_TESTING_S3MOCK_STORE_INITIAL_BUCKETS", "media").withExposedPorts(9090)
            .waitingFor(org.testcontainers.containers.wait.strategy.Wait.forHttp("/favicon.ico").forStatusCode(200).forPort(9090));

    @BeforeAll static void start() { minio.start(); }
    @AfterAll static void stop() { minio.stop(); }

    @Test
    void storesLoadsAndDeletes() throws Exception {
        String endpoint = "http://" + minio.getHost() + ":" + minio.getMappedPort(9090);
        S3Client admin = S3Client.builder().region(Region.US_EAST_1).endpointOverride(java.net.URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("testkey", "testsecret123")))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build()).build();

        var env = new MockEnvironment().withProperty("app.s3.bucket", "media").withProperty("app.s3.region", "us-east-1")
                .withProperty("app.s3.endpoint", endpoint).withProperty("app.s3.access-key", "testkey").withProperty("app.s3.secret-key", "testsecret123");
        var storage = new S3MediaStorage(new AppProperties("x", "", "", "", "", 60, true, 1, 1, 1), env);

        byte[] data = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1, 2, 3};
        String key = storage.store(new ByteArrayInputStream(data), "jpg");
        assertTrue(key.startsWith("uploads/") && key.endsWith(".jpg"));
        assertArrayEquals(data, storage.load(key).orElseThrow().getContentAsByteArray());
        assertTrue(storage.load("uploads/missing.jpg").isEmpty());
        storage.delete(key);
        assertTrue(storage.load(key).isEmpty());
        assertTrue(storage.load("demo/demo-1.svg").isPresent());
    }

    @Test
    void failsFastWhenMisconfigured() {
        assertThrows(IllegalStateException.class, () -> new S3MediaStorage(null, new MockEnvironment()));
    }
}
