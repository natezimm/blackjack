package com.game.blackjack.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.game.blackjack.Hand;

public record HandResponse(
    List<CardResponse> cards,
    int bet,
    @JsonProperty("isTurn") boolean turn,
    @JsonProperty("isStanding") boolean standing,
    @JsonProperty("isBusted") boolean busted,
    @JsonProperty("hasDoubledDown") boolean doubledDown,
    String outcome
) {

    public static HandResponse from(Hand hand) {
        return new HandResponse(
            hand.getCards().stream().map(CardResponse::from).toList(),
            hand.getBet(),
            hand.isTurn(),
            hand.isStanding(),
            hand.isBusted(),
            hand.hasDoubledDown(),
            hand.getOutcome()
        );
    }
}
