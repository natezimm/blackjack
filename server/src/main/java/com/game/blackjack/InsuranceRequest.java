package com.game.blackjack;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Request DTO for insurance bets.
 * Includes validation constraints for security.
 */
public class InsuranceRequest {

    @Min(value = 0, message = "Insurance amount cannot be negative")
    @Max(value = 50000, message = "Insurance amount too high")
    private Integer amount;

    public InsuranceRequest() {
    }

    public InsuranceRequest(Integer amount) {
        this.amount = amount;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }
}
