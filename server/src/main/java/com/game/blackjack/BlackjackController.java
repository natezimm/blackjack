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

        // Only reshuffle if the deck configuration changed or if we are low on cards
        // (penetration limit)
        boolean configChanged = game.getNumberOfDecks() != decks;
        boolean lowCards = game.getDeckSize() < 20; // Re-shuffle if fewer than 20 cards remain

        if (configChanged || lowCards) {
            game.initializeDeck(decks);
        }

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
    public GameResponse stand(HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        game.stand();
        return new GameResponse(game);
    }

    @PostMapping("/doubledown")
    public ResponseEntity<?> doubleDown(HttpSession session) {
        try {
            BlackjackGame game = getOrCreateGame(session);
            game.doubleDown();
            return ResponseEntity.ok(new GameResponse(game));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/split")
    public ResponseEntity<?> split(HttpSession session) {
        try {
            BlackjackGame game = getOrCreateGame(session);
            game.split();
            return ResponseEntity.ok(new GameResponse(game));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/insurance")
    public ResponseEntity<?> resolveInsurance(@RequestBody Map<String, Integer> insuranceRequest, HttpSession session) {
        try {
            BlackjackGame game = getOrCreateGame(session);
            Integer amount = insuranceRequest.get("amount");
            if (amount == null) {
                return ResponseEntity.badRequest()
                        .body(Collections.singletonMap("error", "Insurance amount is required"));
            }
            game.resolveInsurance(amount);
            return ResponseEntity.ok(new GameResponse(game));
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
        private List<Hand> playerHands;
        private List<Card> dealerHand;
        // playerWins / tie removed as they are per-hand outcomes now managed within
        // Hand object
        // keeping implicit structure or could add "overallResult" if needed, but
        // Hand.outcome is source of truth.
        // For partial compatibility check if we want to keep them?
        // No, let's break clean given we control frontend.
        private boolean gameOver;
        private int balance;
        private int currentBet; // Total current bet?
        private boolean bettingOpen;
        private int deckSize;
        private boolean dealerHitsOnSoft17;
        private int numberOfDecks;
        private boolean hasDoubledDown; // Global flag?
        private int insuranceBet;
        private boolean insuranceOffered;
        private boolean insuranceResolved;
        private String insuranceOutcome;
        private int maxInsuranceBet;

        // Helper legacy getters for frontend if needed?
        // We will update frontend to look at playerHands.

        public GameResponse(BlackjackGame game) {
            this.playerHands = game.getPlayerHands();
            this.dealerHand = game.getDealerHand();
            this.gameOver = game.isGameOver();
            this.balance = game.getBalance();
            this.currentBet = game.getCurrentBet();
            this.bettingOpen = game.isBettingOpen();
            this.deckSize = game.getDeckSize();
            this.dealerHitsOnSoft17 = game.isDealerHitsOnSoft17();
            this.numberOfDecks = game.getNumberOfDecks();
            this.hasDoubledDown = game.hasDoubledDown();
            this.insuranceBet = game.getInsuranceBet();
            this.insuranceOffered = game.isInsuranceOffered();
            this.insuranceResolved = game.isInsuranceResolved();
            this.insuranceOutcome = game.getInsuranceOutcome();
            this.maxInsuranceBet = game.getMaxInsuranceBet();
        }

        public List<Hand> getPlayerHands() {
            return playerHands;
        }

        public List<Card> getDealerHand() {
            return dealerHand;
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

        public int getInsuranceBet() {
            return insuranceBet;
        }

        public boolean isInsuranceOffered() {
            return insuranceOffered;
        }

        public boolean isInsuranceResolved() {
            return insuranceResolved;
        }

        public String getInsuranceOutcome() {
            return insuranceOutcome;
        }

        public int getMaxInsuranceBet() {
            return maxInsuranceBet;
        }

        // Legacy compatibility for simple frontend checks (optional)
        // Leaving out to force migration.
    }
}
