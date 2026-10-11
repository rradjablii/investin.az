package az.investin.inquiry;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import az.investin.config.AppProperties;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class EmailInquiryNotifierTest {
    @SuppressWarnings("unchecked")
    private static ObjectProvider<JavaMailSender> provider(JavaMailSender s) {
        ObjectProvider<JavaMailSender> p = mock(ObjectProvider.class);
        when(p.getIfAvailable()).thenReturn(s);
        return p;
    }

    private static AppProperties props(String to) {
        return new AppProperties("x", "", "", to, "from@investin.az", 60, true, 100, 5, 10);
    }

    @Test
    void sendsOnlyToConfiguredStaffAddressAndStripsHeaderInjection() {
        JavaMailSender sender = mock(JavaMailSender.class);
        var n = new EmailInquiryNotifier(provider(sender), props("staff@investin.az"), "smtp.example");
        n.inquiryReceived(UUID.randomUUID(), "Flat\r\nBcc: evil@x.com", "Ann\nBcc: x", "ann@example.com", null, "Hello there");
        ArgumentCaptor<SimpleMailMessage> c = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender, timeout(2000)).send(c.capture());
        assertArrayEquals(new String[]{"staff@investin.az"}, c.getValue().getTo());
        assertFalse(c.getValue().getSubject().contains("\n"));
        assertFalse(c.getValue().getText().contains("\nBcc:"));
    }

    @Test
    void doesNothingWhenNotConfigured() {
        JavaMailSender sender = mock(JavaMailSender.class);
        new EmailInquiryNotifier(provider(sender), props(""), "").inquiryReceived(UUID.randomUUID(), "t", "n", "a@b.co", null, "m");
        new EmailInquiryNotifier(provider(sender), props("staff@investin.az"), "").inquiryReceived(UUID.randomUUID(), "t", "n", "a@b.co", null, "m");
        verifyNoInteractions(sender);
    }

    @Test
    void mailFailureNeverPropagates() {
        JavaMailSender sender = mock(JavaMailSender.class);
        doThrow(new org.springframework.mail.MailSendException("down")).when(sender).send(any(SimpleMailMessage.class));
        var n = new EmailInquiryNotifier(provider(sender), props("staff@investin.az"), "smtp.example");
        assertDoesNotThrow(() -> n.inquiryReceived(UUID.randomUUID(), "t", "n", "a@b.co", null, "m"));
        verify(sender, timeout(2000)).send(any(SimpleMailMessage.class));
    }
}
