package com.game.blackjack;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class ApiRateLimitInterceptor implements HandlerInterceptor {

    private static final int CLEANUP_INTERVAL = 64;
    private static final String ANONYMOUS_CLIENT = "anonymous";
    private static final String RATE_LIMIT_MESSAGE =
        "{\"error\":\"Too many requests, please try again later.\"}";

    private final int permitLimit;
    private final long windowMillis;
    private final Clock clock;
    private final ConcurrentMap<String, RateWindow> clientWindows = new ConcurrentHashMap<>();
    private final AtomicLong requestCount = new AtomicLong();

    public ApiRateLimitInterceptor(int permitLimit, Duration window) {
        this(permitLimit, window, Clock.systemUTC());
    }

    ApiRateLimitInterceptor(int permitLimit, Duration window, Clock clock) {
        if (permitLimit <= 0) {
            throw new IllegalArgumentException("Rate-limit permit limit must be positive");
        }
        if (window == null || window.isNegative() || window.isZero() || window.toMillis() == 0) {
            throw new IllegalArgumentException("Rate-limit window must be at least one millisecond");
        }
        if (clock == null) {
            throw new IllegalArgumentException("Rate-limit clock is required");
        }

        this.permitLimit = permitLimit;
        this.windowMillis = window.toMillis();
        this.clock = clock;
    }

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        long now = clock.millis();
        String remoteAddress = request.getRemoteAddr();
        String clientKey = remoteAddress == null || remoteAddress.isBlank()
            ? ANONYMOUS_CLIENT
            : remoteAddress;

        RateWindow rateWindow = clientWindows.compute(clientKey, (key, current) -> {
            if (current == null || now >= current.resetAt()) {
                return new RateWindow(1, now + windowMillis);
            }
            return new RateWindow(current.requests() + 1, current.resetAt());
        });

        cleanupExpiredWindows(now);

        long remaining = Math.max(0, permitLimit - rateWindow.requests());
        long resetSeconds = Math.max(1, (rateWindow.resetAt() - now + 999) / 1000);
        long windowSeconds = Math.max(1, (windowMillis + 999) / 1000);
        response.setHeader("RateLimit-Policy", permitLimit + ";w=" + windowSeconds);
        response.setHeader("RateLimit-Limit", Integer.toString(permitLimit));
        response.setHeader("RateLimit-Remaining", Long.toString(remaining));
        response.setHeader("RateLimit-Reset", Long.toString(resetSeconds));

        if (rateWindow.requests() <= permitLimit) {
            return true;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", Long.toString(resetSeconds));
        response.setHeader("Cache-Control", "no-store");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(RATE_LIMIT_MESSAGE);
        return false;
    }

    private void cleanupExpiredWindows(long now) {
        if (requestCount.incrementAndGet() % CLEANUP_INTERVAL == 0) {
            clientWindows.entrySet().removeIf(entry -> now >= entry.getValue().resetAt());
        }
    }

    private record RateWindow(long requests, long resetAt) {
    }
}
