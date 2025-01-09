package com.game.blackjack;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

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

    @PostMapping("/bet")
    public ResponseEntity<?> placeBet(@RequestBody Map<String, Integer> betRequest) {
        try {
            int bet = betRequest.get("amount");
            game.placeBet(bet);
            return ResponseEntity.ok(Collections.singletonMap("balance", game.getBalance()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/hit")
    public GameResponse hit() {
        game.hitPlayer();
        return new GameResponse(game.getPlayerHand(), game.getDealerHand());
    }

    @PostMapping("/stand")
    public ResponseEntity<?> stand() {
        game.dealerPlay();
        boolean playerWins = game.calculateHandValue(game.getPlayerHand()) > game.calculateHandValue(game.getDealerHand()) && game.calculateHandValue(game.getPlayerHand()) <= 21;
        boolean tie = game.isTie();
        game.resolveBet(playerWins, tie);
        return ResponseEntity.ok(new GameResponse(game.getPlayerHand(), game.getDealerHand(), playerWins, tie, game.isGameOver(), game.getBalance()));
    }

    @GetMapping("/gameover")
    public boolean isGameOver() {
        return game.isGameOver();
    }

    public static class GameResponse {
        private List<Card> playerHand;
        private List<Card> dealerHand;
        private boolean playerWins;
        private boolean tie;
        private boolean gameOver;
        private int balance;

        public GameResponse(List<Card> playerHand, List<Card> dealerHand) {
            this.playerHand = playerHand;
            this.dealerHand = dealerHand;
        }

        public GameResponse(List<Card> playerHand, List<Card> dealerHand, boolean playerWins, boolean tie, boolean gameOver, int balance) {
            this.playerHand = playerHand;
            this.dealerHand = dealerHand;
            this.playerWins = playerWins;
            this.tie = tie;
            this.gameOver = gameOver;
            this.balance = balance;
        }

        public List<Card> getPlayerHand() {
            return playerHand;
        }

        public List<Card> getDealerHand() {
            return dealerHand;
        }

        public boolean isPlayerWins() {
            return playerWins;
        }

        public boolean isTie() {
            return tie;
        }

        public boolean isGameOver() {
            return gameOver;
        }

        public int getBalance() {
            return balance;
        }
    }
}