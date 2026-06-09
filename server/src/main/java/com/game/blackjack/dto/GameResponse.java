package com.game.blackjack.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.game.blackjack.BlackjackGame;

public record GameResponse(
    List<HandResponse> playerHands,
    List<CardResponse> dealerHand,
    boolean gameOver,
    int balance,
    int currentBet,
    boolean bettingOpen,
    int deckSize,
    boolean dealerHitsOnSoft17,
    int numberOfDecks,
    @JsonProperty("hasDoubledDown") boolean doubledDown,
    int insuranceBet,
    boolean insuranceOffered,
    boolean insuranceResolved,
    String insuranceOutcome,
    int maxInsuranceBet
) {

    public static GameResponse from(BlackjackGame game) {
        return new GameResponse(
            game.getPlayerHands().stream().map(HandResponse::from).toList(),
            game.getDealerHand().stream().map(CardResponse::from).toList(),
            game.isGameOver(),
            game.getBalance(),
            game.getCurrentBet(),
            game.isBettingOpen(),
            game.getDeckSize(),
            game.isDealerHitsOnSoft17(),
            game.getNumberOfDecks(),
            game.hasDoubledDown(),
            game.getInsuranceBet(),
            game.isInsuranceOffered(),
            game.isInsuranceResolved(),
            game.getInsuranceOutcome(),
            game.getMaxInsuranceBet()
        );
    }
}
