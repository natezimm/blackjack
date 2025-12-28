package com.game.blackjack;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/blackjack")
public class BlackjackController {

    private static final int MIN_DECKS = 1;
    private static final int MAX_DECKS = 8;
    private static final int LOW_CARD_THRESHOLD = 20;

    @GetMapping("/start")
    public GameResponse startGame(
            @RequestParam(required = false, defaultValue = "1") @Min(1) @Max(8) int decks,
            @RequestParam(required = false, defaultValue = "false") boolean dealerHitsOnSoft17,
            HttpSession session) {

        int validDecks = Math.max(MIN_DECKS, Math.min(MAX_DECKS, decks));

        BlackjackGame game = getOrCreateGame(session);

        boolean configChanged = game.getNumberOfDecks() != validDecks;
        boolean lowCards = game.getDeckSize() < LOW_CARD_THRESHOLD;

        if (configChanged || lowCards) {
            game.initializeDeck(validDecks);
        }

        game.setDealerHitsOnSoft17(dealerHitsOnSoft17);
        game.dealInitialCards();
        return new GameResponse(game);
    }

    @PostMapping("/bet")
    public ResponseEntity<?> placeBet(@Valid @RequestBody BetRequest betRequest, HttpSession session) {
        BlackjackGame game = getOrCreateGame(session);
        if (!game.isBettingOpen()) {
            game.forfeitRound();
        }
        try {
            Integer amount = betRequest.getAmount();
            if (amount == null) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Bet amount is required"));
            }
            game.placeBet(amount);
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
    public ResponseEntity<?> resolveInsurance(@Valid @RequestBody InsuranceRequest insuranceRequest, HttpSession session) {
        try {
            BlackjackGame game = getOrCreateGame(session);
            Integer amount = insuranceRequest.getAmount();
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
    public GameResponse reset(@Valid @RequestBody(required = false) ResetRequest payload, HttpSession session) {
        int decks = payload != null && payload.getDecks() != null
                ? Math.max(MIN_DECKS, Math.min(MAX_DECKS, payload.getDecks()))
                : 1;
        boolean dealerHitsOnSoft17 = payload != null && payload.getDealerHitsOnSoft17() != null
                ? payload.getDealerHitsOnSoft17()
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
        private boolean gameOver;
        private int balance;
        private int currentBet;
        private boolean bettingOpen;
        private int deckSize;
        private boolean dealerHitsOnSoft17;
        private int numberOfDecks;
        private boolean hasDoubledDown;
        private int insuranceBet;
        private boolean insuranceOffered;
        private boolean insuranceResolved;
        private String insuranceOutcome;
        private int maxInsuranceBet;

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
    }
}
