package com.game.blackjack;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
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
        return new GameResponse(game);
    }

    @PostMapping("/bet")
    public ResponseEntity<?> placeBet(@RequestBody Map<String, Integer> betRequest, HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        if (!game.isBettingOpen()) {
            game.forfeitRound();
        }
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
        return new GameResponse(game);
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
        return ResponseEntity.ok(new GameResponse(game, playerWins, tie));
    }

    @PostMapping("/doubledown")
    public ResponseEntity<?> doubleDown(HttpSession session) {
        try {
            BlackjackGame game = getOrCreateGame(session);
            game.doubleDown();

            // After doubling down, player must stand, so dealer plays
            if (!game.isGameOver()) {
                game.dealerPlay();
            }

            int playerValue = game.calculateHandValue(game.getPlayerHand());
            int dealerValue = game.calculateHandValue(game.getDealerHand());
            boolean playerWins = (playerValue <= 21 && (dealerValue > 21 || playerValue > dealerValue));
            boolean tie = game.isTie();
            game.resolveBet(playerWins, tie);

            return ResponseEntity.ok(new GameResponse(game, playerWins, tie));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @GetMapping("/state")
    public GameResponse getState(HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        return new GameResponse(game);
    }

    @PostMapping("/reset")
    public GameResponse reset(@RequestBody(required = false) Map<String, Object> payload, HttpSession session) {
        int decks = payload != null && payload.get("decks") instanceof Number
                ? ((Number) payload.get("decks")).intValue()
                : 1;
        boolean dealerHitsOnSoft17 = payload != null && payload.get("dealerHitsOnSoft17") instanceof Boolean
                ? (Boolean) payload.get("dealerHitsOnSoft17")
                : false;

        BlackjackGame game = new BlackjackGame();
        game.initializeDeck(decks);
        game.setDealerHitsOnSoft17(dealerHitsOnSoft17);
        session.setAttribute("blackjackGame", game);
        return new GameResponse(game);
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
        private int currentBet;
        private boolean bettingOpen;
        private int deckSize;
        private boolean dealerHitsOnSoft17;
        private int numberOfDecks;
        private boolean hasDoubledDown;

        public GameResponse(BlackjackGame game) {
            this.playerHand = game.getPlayerHand();
            this.dealerHand = game.getDealerHand();
            this.gameOver = game.isGameOver();
            this.balance = game.getBalance();
            this.currentBet = game.getCurrentBet();
            this.bettingOpen = game.isBettingOpen();
            this.deckSize = game.getDeckSize();
            this.dealerHitsOnSoft17 = game.isDealerHitsOnSoft17();
            this.numberOfDecks = game.getNumberOfDecks();
            this.hasDoubledDown = game.hasDoubledDown();
        }

        public GameResponse(BlackjackGame game, boolean playerWins, boolean tie) {
            this(game);
            this.playerWins = playerWins;
            this.tie = tie;
            this.gameOver = game.isGameOver();
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

        public int getCurrentBet() {
            return currentBet;
        }

        public boolean isBettingOpen() {
            return bettingOpen;
        }

        public int getDeckSize() {
            return deckSize;
        }

        public boolean isDealerHitsOnSoft17() {
            return dealerHitsOnSoft17;
        }

        public int getNumberOfDecks() {
            return numberOfDecks;
        }

        public boolean isHasDoubledDown() {
            return hasDoubledDown;
        }
    }
}
