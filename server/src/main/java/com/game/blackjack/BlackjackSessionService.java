package com.game.blackjack;

import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpSession;

@Service
public class BlackjackSessionService {

    static final String SESSION_GAME_KEY = "blackjackGame";

    public BlackjackGame getOrCreateGame(HttpSession session) {
        BlackjackGame game = (BlackjackGame) session.getAttribute(SESSION_GAME_KEY);
        if (game == null) {
            game = new BlackjackGame();
            session.setAttribute(SESSION_GAME_KEY, game);
        }
        return game;
    }

    public BlackjackGame resetGame(HttpSession session, int decks, boolean dealerHitsOnSoft17) {
        BlackjackGame game = new BlackjackGame();
        game.initializeDeck(decks);
        game.setDealerHitsOnSoft17(dealerHitsOnSoft17);
        session.setAttribute(SESSION_GAME_KEY, game);
        return game;
    }
}
