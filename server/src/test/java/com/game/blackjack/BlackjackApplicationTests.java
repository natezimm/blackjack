package com.game.blackjack;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class BlackjackApplicationTests {

	@Test
	void contextLoads() {
	}

	@Test
	void corsConfigurer_producesConfigurerBean() {
		BlackjackApplication application = new BlackjackApplication();
		ApiRateLimitInterceptor rateLimiter =
			new ApiRateLimitInterceptor(120, Duration.ofMinutes(1));
		assertNotNull(application.corsConfigurer(rateLimiter));
	}

	@Test
	void apiRateLimitInterceptor_producesConfiguredBean() {
		BlackjackApplication application = new BlackjackApplication();
		assertNotNull(application.apiRateLimitInterceptor(120, 60));
	}

	@Test
	void main_delegatesToSpringApplicationRun() {
		try (MockedStatic<SpringApplication> mocked = Mockito.mockStatic(SpringApplication.class)) {
			ConfigurableApplicationContext context = Mockito.mock(ConfigurableApplicationContext.class);
			mocked.when(() -> SpringApplication.run(BlackjackApplication.class, new String[]{})).thenReturn(context);
			BlackjackApplication.main(new String[]{});
			mocked.verify(() -> SpringApplication.run(BlackjackApplication.class, new String[]{}));
		}
	}
}
