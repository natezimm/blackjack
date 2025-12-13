package com.game.blackjack;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class BlackjackApplicationTests {

	@Test
	void contextLoads() {
	}

	@Test
	void corsConfigurer_producesConfigurerBean() {
		BlackjackApplication application = new BlackjackApplication();
		assertNotNull(application.corsConfigurer());
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
