package az.investin.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(
        String storageDir,
        String adminBootstrapEmail,
        String adminBootstrapPassword,
        String inquiryNotifyTo,
        String mailFrom,
        int staleAfterDays,
        boolean rateLimitEnabled,
        int apiRequestsPerMinute,
        int inquiriesPerHour,
        int loginAttemptsPer15Min) {
}
