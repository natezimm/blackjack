package com.game.blackjack;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.lang.NonNull;

import java.util.Arrays;
import java.util.List;

@SpringBootApplication
public class BlackjackApplication {

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOriginsConfig;

    @Value("${app.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Value("${app.cors.max-age:3600}")
    private long maxAge;

    private static final List<String> DEFAULT_DEV_ORIGINS = Arrays.asList(
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8085"
    );

    private static final String PRODUCTION_ORIGIN = "https://blackjack.nathanzimmerman.com";

    public static void main(String[] args) {
        SpringApplication.run(BlackjackApplication.class, args);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                String[] allowedOrigins = getAllowedOrigins();

                registry.addMapping("/api/**")
                    .allowedOrigins(allowedOrigins)
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("Content-Type", "Accept", "X-Requested-With")
                    .exposedHeaders("Content-Type")
                    .allowCredentials(allowCredentials)
                    .maxAge(maxAge);
            }
        };
    }

    /**
     * Determines allowed CORS origins based on environment.
     * In production, only allows the configured production origin.
     * In development, allows localhost origins for testing.
     */
    private String[] getAllowedOrigins() {
        // If explicitly configured, use that
        if (allowedOriginsConfig != null && !allowedOriginsConfig.isEmpty()) {
            String[] configured = allowedOriginsConfig.split(",");
            // Trim whitespace and filter empty strings
            return Arrays.stream(configured)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
        }

        // Check if running in production mode
        String profile = System.getProperty("spring.profiles.active", "");
        if (profile.contains("prod")) {
            return new String[] { PRODUCTION_ORIGIN };
        }

        // Default to development origins
        List<String> origins = new java.util.ArrayList<>(DEFAULT_DEV_ORIGINS);
        origins.add(PRODUCTION_ORIGIN);
        return origins.toArray(new String[0]);
    }
}