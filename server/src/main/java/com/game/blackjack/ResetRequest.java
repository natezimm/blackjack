package com.game.blackjack;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Request DTO for game reset.
 * Includes validation constraints for security.
 */
public class ResetRequest {

    @Min(value = 1, message = "Must use at least 1 deck")
    @Max(value = 8, message = "Cannot use more than 8 decks")
    private Integer decks = 1;

    private Boolean dealerHitsOnSoft17 = false;

    public ResetRequest() {
    }

    public ResetRequest(Integer decks, Boolean dealerHitsOnSoft17) {
        this.decks = decks;
        this.dealerHitsOnSoft17 = dealerHitsOnSoft17;
    }

    public Integer getDecks() {
        return decks;
    }

    public void setDecks(Integer decks) {
        this.decks = decks;
    }

    public Boolean getDealerHitsOnSoft17() {
        return dealerHitsOnSoft17;
    }

    public void setDealerHitsOnSoft17(Boolean dealerHitsOnSoft17) {
        this.dealerHitsOnSoft17 = dealerHitsOnSoft17;
    }
}
