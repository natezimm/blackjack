package com.game.blackjack;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

/**
 * Security configuration for the Blackjack application.
 * Configures security headers to protect against common web vulnerabilities.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.security.csp.enabled:true}")
    private boolean cspEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for REST API (using session-based auth with CORS)
            .csrf(csrf -> csrf.disable())

            // Configure security headers
            .headers(headers -> headers
                // Prevent clickjacking
                .frameOptions(frame -> frame.deny())

                // Prevent MIME type sniffing
                .contentTypeOptions(content -> {})

                // XSS Protection (legacy, but still useful for older browsers)
                .xssProtection(xss -> xss
                    .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))

                // Content Security Policy
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(buildCspPolicy()))

                // Referrer Policy
                .referrerPolicy(referrer -> referrer
                    .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))

                // Permissions Policy (formerly Feature Policy)
                .permissionsPolicy(permissions -> permissions
                    .policy("geolocation=(), microphone=(), camera=()"))
            )

            // Allow all requests (this is a game, no auth required)
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll());

        return http.build();
    }

    /**
     * Builds the Content Security Policy directive string.
     */
    private String buildCspPolicy() {
        if (!cspEnabled) {
            return "default-src 'self'";
        }

        return String.join("; ",
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "font-src 'self' https://cdnjs.cloudflare.com",
            "img-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        );
    }
}
