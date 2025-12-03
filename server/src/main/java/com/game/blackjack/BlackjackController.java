package com.game.blackjack;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blackjack")
public class BlackjackController {

    @GetMapping("/start")
    public GameResponse startGame(@RequestParam(required = false, defaultValue = "1") int decks,
            @RequestParam(required = false, defaultValue = "false") boolean dealerHitsOnSoft17, HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        game.initializeDeck(decks);
        game.setDealerHitsOnSoft17(dealerHitsOnSoft17);
        game.dealInitialCards();
        return new GameResponse(game.getPlayerHand(), game.getDealerHand());
    }

    @PostMapping("/bet")
    public ResponseEntity<?> placeBet(@RequestBody Map<String, Integer> betRequest, HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        try {
            Integer amount = betRequest.get("amount");
            if (amount == null) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Bet amount is required"));
            }
            int bet = amount;
            game.placeBet(bet);
            return ResponseEntity.ok(Collections.singletonMap("balance", game.getBalance()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/hit")
    public GameResponse hit(HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        game.hitPlayer();
        return new GameResponse(game.getPlayerHand(), game.getDealerHand());
    }

    @PostMapping("/stand")
    public ResponseEntity<?> stand(HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        game.dealerPlay();
        int playerValue = game.calculateHandValue(game.getPlayerHand());
        int dealerValue = game.calculateHandValue(game.getDealerHand());
        boolean playerWins = (playerValue <= 21 && (dealerValue > 21 || playerValue > dealerValue));
        boolean tie = game.isTie();
        game.resolveBet(playerWins, tie);
        return ResponseEntity.ok(new GameResponse(game.getPlayerHand(), game.getDealerHand(), playerWins, tie,
                game.isGameOver(), game.getBalance()));
    }

    @GetMapping("/gameover")
    public boolean isGameOver(HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        return game.isGameOver();
    }

    private BlackjackGame getOrCreateGame(HttpSession session) {
        BlackjackGame game = (BlackjackGame) session.getAttribute("blackjackGame");
        if (game == null) {
            game = new BlackjackGame();
            session.setAttribute("blackjackGame", game);
        }
        return game;
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

        public GameResponse(List<Card> playerHand, List<Card> dealerHand, boolean playerWins, boolean tie,
                boolean gameOver, int balance) {
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
