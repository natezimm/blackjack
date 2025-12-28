package com.game.blackjack;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.security.csp.enabled:true}")
    private boolean cspEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())

            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())

                .contentTypeOptions(content -> {})

                .xssProtection(xss -> xss
                    .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))

                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(buildCspPolicy()))

                .referrerPolicy(referrer -> referrer
                    .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))

                .permissionsPolicy(permissions -> permissions
                    .policy("geolocation=(), microphone=(), camera=()"))
            )

            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll());

        return http.build();
    }

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
