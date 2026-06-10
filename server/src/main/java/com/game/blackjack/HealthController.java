package com.game.blackjack;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping({"/api/health", "/api/blackjack/health"})
    public Map<String, String> health() {
        return Map.of(
            "status", "UP",
            "service", "blackjack"
        );
    }
}
