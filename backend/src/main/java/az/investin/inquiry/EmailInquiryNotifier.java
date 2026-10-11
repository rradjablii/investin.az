package az.investin.inquiry;

import az.investin.config.AppProperties;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends a staff notification by SMTP when MAIL_HOST and INQUIRY_NOTIFY_TO are configured; otherwise only logs the id.
 * Delivery is asynchronous and best-effort: a mail failure is logged (without personal data) and never fails the visitor's request.
 * The e-mail goes only to the configured staff address, never to the visitor or to the seller automatically.
 */
@Component
public class EmailInquiryNotifier implements InquiryNotifier {
    private static final Logger log = LoggerFactory.getLogger(EmailInquiryNotifier.class);

    private final ObjectProvider<JavaMailSender> mail;
    private final AppProperties props;
    private final String host;

    public EmailInquiryNotifier(ObjectProvider<JavaMailSender> mail, AppProperties props,
                                @org.springframework.beans.factory.annotation.Value("${spring.mail.host:}") String host) {
        this.mail = mail;
        this.props = props;
        this.host = host;
    }

    boolean enabled() {
        return host != null && !host.isBlank() && props.inquiryNotifyTo() != null && !props.inquiryNotifyTo().isBlank();
    }

    @Override
    public void inquiryReceived(UUID id, String listingTitle, String name, String email, String phone, String message) {
        log.info("Inquiry {} stored", id);
        JavaMailSender sender = mail.getIfAvailable();
        if (!enabled() || sender == null) return;
        SimpleMailMessage m = new SimpleMailMessage();
        m.setFrom(props.mailFrom());
        m.setTo(props.inquiryNotifyTo().split("\\s*,\\s*"));
        m.setReplyTo(email);
        m.setSubject("New inquiry: " + clean(listingTitle, 100));
        m.setText("Listing: " + clean(listingTitle, 200) + "\nFrom: " + clean(name, 120) + " <" + clean(email, 254) + ">"
                + (phone == null ? "" : "\nPhone: " + clean(phone, 40)) + "\n\n" + message
                + "\n\n(Inquiry id " + id + ". Manage it in the admin area.)");
        CompletableFuture.runAsync(() -> {
            try {
                sender.send(m);
            } catch (RuntimeException e) {
                log.warn("Could not send notification for inquiry {}: {}", id, e.getClass().getSimpleName());
            }
        });
    }

    /** Strip line breaks so visitor input cannot inject mail headers or fake lines. */
    static String clean(String s, int max) {
        String v = s == null ? "" : s.replaceAll("[\\r\\n]+", " ").trim();
        return v.length() > max ? v.substring(0, max) : v;
    }
}
