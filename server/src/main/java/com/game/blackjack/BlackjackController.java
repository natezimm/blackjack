package com.game.blackjack;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.game.blackjack.dto.BalanceResponse;
import com.game.blackjack.dto.ErrorResponse;
import com.game.blackjack.dto.GameResponse;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/blackjack")
@Validated
public class BlackjackController {

    private static final int LOW_CARD_THRESHOLD = 20;
    private final BlackjackSessionService sessionService;

    public BlackjackController(BlackjackSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping("/start")
    public GameResponse startGame(
            @RequestParam(required = false, defaultValue = "1") @Min(1) @Max(8) int decks,
            @RequestParam(required = false, defaultValue = "false") boolean dealerHitsOnSoft17,
            HttpSession session) {

        BlackjackGame game = sessionService.getOrCreateGame(session);

        boolean configChanged = game.getNumberOfDecks() != decks;
        boolean lowCards = game.getDeckSize() < LOW_CARD_THRESHOLD;

        if (configChanged || lowCards) {
            game.initializeDeck(decks);
        }

        game.setDealerHitsOnSoft17(dealerHitsOnSoft17);
        game.dealInitialCards();
        return GameResponse.from(game);
    }

    @PostMapping("/bet")
    public ResponseEntity<?> placeBet(@Valid @RequestBody BetRequest betRequest, HttpSession session) {
        BlackjackGame game = sessionService.getOrCreateGame(session);
        if (!game.isBettingOpen()) {
            game.forfeitRound();
        }
        try {
            Integer amount = betRequest.getAmount();
            if (amount == null) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Bet amount is required"));
            }
            game.placeBet(amount);
            return ResponseEntity.ok(new BalanceResponse(game.getBalance()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/hit")
    public GameResponse hit(HttpSession session) {
        BlackjackGame game = sessionService.getOrCreateGame(session);
        game.hitPlayer();
        return GameResponse.from(game);
    }

    @PostMapping("/stand")
    public GameResponse stand(HttpSession session) {
        BlackjackGame game = sessionService.getOrCreateGame(session);
        game.stand();
        return GameResponse.from(game);
    }

    @PostMapping("/doubledown")
    public ResponseEntity<?> doubleDown(HttpSession session) {
        try {
            BlackjackGame game = sessionService.getOrCreateGame(session);
            game.doubleDown();
            return ResponseEntity.ok(GameResponse.from(game));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/split")
    public ResponseEntity<?> split(HttpSession session) {
        try {
            BlackjackGame game = sessionService.getOrCreateGame(session);
            game.split();
            return ResponseEntity.ok(GameResponse.from(game));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/insurance")
    public ResponseEntity<?> resolveInsurance(@Valid @RequestBody InsuranceRequest insuranceRequest, HttpSession session) {
        try {
            BlackjackGame game = sessionService.getOrCreateGame(session);
            Integer amount = insuranceRequest.getAmount();
            if (amount == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Insurance amount is required"));
            }
            game.resolveInsurance(amount);
            return ResponseEntity.ok(GameResponse.from(game));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/state")
    public GameResponse getState(HttpSession session) {
        BlackjackGame game = sessionService.getOrCreateGame(session);
        return GameResponse.from(game);
    }

    @PostMapping("/reset")
    public GameResponse reset(@Valid @RequestBody(required = false) ResetRequest payload, HttpSession session) {
        int decks = payload != null && payload.getDecks() != null
                ? payload.getDecks()
                : 1;
        boolean dealerHitsOnSoft17 = payload != null && payload.getDealerHitsOnSoft17() != null
                ? payload.getDealerHitsOnSoft17()
                : false;

        BlackjackGame game = sessionService.resetGame(session, decks, dealerHitsOnSoft17);
        return GameResponse.from(game);
    }

    @GetMapping("/gameover")
    public boolean isGameOver(HttpSession session) {
        BlackjackGame game = sessionService.getOrCreateGame(session);
        return game.isGameOver();
    }

}
