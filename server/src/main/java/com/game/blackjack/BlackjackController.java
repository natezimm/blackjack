package com.game.blackjack;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blackjack")
public class BlackjackController {

    private final BlackjackGame game;

    public BlackjackController() {
        this.game = new BlackjackGame();
    }

    @GetMapping("/start")
    public GameResponse startGame() {
        game.dealInitialCards();
        return new GameResponse(game.getPlayerHand(), game.getDealerHand());
    }

    @PostMapping("/hit")
    public GameResponse hit() {
        game.hitPlayer();
        return new GameResponse(game.getPlayerHand(), game.getDealerHand());
    }

    @PostMapping("/stand")
    public GameResponse stand() {
        game.dealerPlay();
        return new GameResponse(game.getPlayerHand(), game.getDealerHand());
    }

    @GetMapping("/gameover")
    public boolean isGameOver() {
        return game.isGameOver();
    }

    public static class GameResponse {
        private List<Card> playerHand;
        private List<Card> dealerHand;

        public GameResponse(List<Card> playerHand, List<Card> dealerHand) {
            this.playerHand = playerHand;
            this.dealerHand = dealerHand;
        }

        public List<Card> getPlayerHand() {
            return playerHand;
        }

        public List<Card> getDealerHand() {
            return dealerHand;
        }
    }
}