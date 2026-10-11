package az.investin;

import az.investin.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class InvestinBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(InvestinBackendApplication.class, args);
    }
}
