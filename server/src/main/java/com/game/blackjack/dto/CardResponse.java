package com.game.blackjack.dto;

import com.game.blackjack.Card;

public record CardResponse(String value, String suit) {

    public static CardResponse from(Card card) {
        return new CardResponse(card.getValue(), card.getSuit());
    }
}
