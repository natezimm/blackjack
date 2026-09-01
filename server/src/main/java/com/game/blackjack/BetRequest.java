package com.game.blackjack;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class BetRequest {

    @NotNull(message = "Bet amount is required")
    @Min(value = 0, message = "Bet cannot be negative")
    @Max(value = 100000, message = "Bet cannot exceed $100,000")
    private Integer amount;

    public BetRequest() {
    }

    public BetRequest(Integer amount) {
        this.amount = amount;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }
}
