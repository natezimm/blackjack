package com.game.blackjack;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

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
}
