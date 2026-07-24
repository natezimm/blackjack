package com.game.blackjack;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiRateLimitInterceptorTests {

    private static final Object HANDLER = new Object();

    @Test
    void allowsRequestsWithinLimitAndAddsHeaders() throws Exception {
        ApiRateLimitInterceptor interceptor =
            new ApiRateLimitInterceptor(2, Duration.ofMinutes(1));

        MockHttpServletResponse firstResponse = invoke(interceptor, "POST", "203.0.113.1");
        MockHttpServletResponse secondResponse = invoke(interceptor, "GET", "203.0.113.1");

        assertEquals(200, firstResponse.getStatus());
        assertEquals("2", firstResponse.getHeader("RateLimit-Limit"));
        assertEquals("1", firstResponse.getHeader("RateLimit-Remaining"));
        assertEquals("2;w=60", firstResponse.getHeader("RateLimit-Policy"));
        assertEquals(200, secondResponse.getStatus());
        assertEquals("0", secondResponse.getHeader("RateLimit-Remaining"));
    }

    @Test
    void rejectsRequestsOverLimitWithJsonAndRetryHeaders() throws Exception {
        ApiRateLimitInterceptor interceptor =
            new ApiRateLimitInterceptor(1, Duration.ofMinutes(1));

        invoke(interceptor, "GET", "203.0.113.2");
        MockHttpServletRequest request = request("GET", "203.0.113.2");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, HANDLER);

        assertFalse(allowed);
        assertEquals(429, response.getStatus());
        assertEquals("0", response.getHeader("RateLimit-Remaining"));
        assertEquals("60", response.getHeader("Retry-After"));
        assertEquals("no-store", response.getHeader("Cache-Control"));
        assertEquals("application/json;charset=UTF-8", response.getContentType());
        assertEquals(
            "{\"error\":\"Too many requests, please try again later.\"}",
            response.getContentAsString());
    }

    @Test
    void maintainsIndependentLimitsForEachClient() throws Exception {
        ApiRateLimitInterceptor interceptor =
            new ApiRateLimitInterceptor(1, Duration.ofMinutes(1));

        invoke(interceptor, "GET", "203.0.113.3");
        MockHttpServletResponse otherClient = invoke(interceptor, "GET", "203.0.113.4");

        assertEquals(200, otherClient.getStatus());
        assertEquals("0", otherClient.getHeader("RateLimit-Remaining"));
    }

    @Test
    void resetsLimitAfterWindowExpiresAndCleansUpExpiredClients() throws Exception {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        ApiRateLimitInterceptor interceptor =
            new ApiRateLimitInterceptor(100, Duration.ofSeconds(1), clock);

        invoke(interceptor, "GET", "203.0.113.5");
        clock.advance(Duration.ofSeconds(2));

        MockHttpServletResponse resetResponse = null;
        for (int requestNumber = 0; requestNumber < 63; requestNumber++) {
            resetResponse = invoke(interceptor, "GET", "203.0.113.6");
        }

        assertEquals(200, resetResponse.getStatus());
        assertEquals("37", resetResponse.getHeader("RateLimit-Remaining"));
    }

    @Test
    void doesNotCountCorsPreflightRequests() throws Exception {
        ApiRateLimitInterceptor interceptor =
            new ApiRateLimitInterceptor(1, Duration.ofMinutes(1));

        MockHttpServletRequest request = request("OPTIONS", "203.0.113.7");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, HANDLER));
        assertEquals(200, response.getStatus());
        assertEquals(null, response.getHeader("RateLimit-Limit"));
    }

    @Test
    void groupsRequestsWithoutAnAddressIntoAnonymousBucket() throws Exception {
        ApiRateLimitInterceptor interceptor =
            new ApiRateLimitInterceptor(1, Duration.ofMinutes(1));

        invoke(interceptor, "GET", null);
        MockHttpServletRequest request = request("GET", " ");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, HANDLER));
        assertEquals(429, response.getStatus());
    }

    @Test
    void rejectsInvalidConfiguration() {
        assertThrows(
            IllegalArgumentException.class,
            () -> new ApiRateLimitInterceptor(0, Duration.ofMinutes(1)));
        assertThrows(
            IllegalArgumentException.class,
            () -> new ApiRateLimitInterceptor(1, Duration.ZERO));
        assertThrows(
            IllegalArgumentException.class,
            () -> new ApiRateLimitInterceptor(1, Duration.ofNanos(1)));
        assertThrows(
            IllegalArgumentException.class,
            () -> new ApiRateLimitInterceptor(1, Duration.ofMinutes(1), null));
    }

    private static MockHttpServletResponse invoke(
            ApiRateLimitInterceptor interceptor,
            String method,
            String remoteAddress) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertTrue(interceptor.preHandle(request(method, remoteAddress), response, HANDLER));
        return response;
    }

    private static MockHttpServletRequest request(String method, String remoteAddress) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, "/api/blackjack/state");
        request.setRemoteAddr(remoteAddress);
        return request;
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
