package az.investin.common;

import java.text.Normalizer;
import java.util.Locale;

public final class Slugs {
    private Slugs() {}

    public static String slugify(String input) {
        String s = Normalizer.normalize(input == null ? "" : input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('ə', 'e').replace('ı', 'i').replace('ö', 'o').replace('ü', 'u')
                .replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return s.length() > 100 ? s.substring(0, 100).replaceAll("-$", "") : s;
    }
}
