package com.game.blackjack;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "app.rate-limit.permit-limit=2",
    "app.rate-limit.window-seconds=60"
})
@AutoConfigureMockMvc
class ApiRateLimitIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rateLimitAppliesAcrossEveryApiController() throws Exception {
        mockMvc.perform(get("/api/health").with(request -> {
            request.setRemoteAddr("203.0.113.20");
            return request;
        }).header("Origin", "http://localhost:3000"))
            .andExpect(status().isOk())
            .andExpect(header().string("RateLimit-Remaining", "1"));

        mockMvc.perform(get("/api/blackjack/health").with(request -> {
            request.setRemoteAddr("203.0.113.20");
            return request;
        }).header("Origin", "http://localhost:3000"))
            .andExpect(status().isOk())
            .andExpect(header().string("RateLimit-Remaining", "0"));

        mockMvc.perform(get("/api/blackjack/state").with(request -> {
            request.setRemoteAddr("203.0.113.20");
            return request;
        }).header("Origin", "http://localhost:3000"))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
            .andExpect(header().string("Retry-After", "60"))
            .andExpect(jsonPath("$.error")
                .value("Too many requests, please try again later."));
    }
}
