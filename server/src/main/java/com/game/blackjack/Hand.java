package com.game.blackjack;

import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

public class Hand {
    private List<Card> cards;
    private int bet;
    private boolean isTurn;
    private boolean isStanding;
    private boolean isBusted;
    private boolean hasDoubledDown;
    private String outcome;

    public Hand(int initialBet) {
        this.cards = new ArrayList<>();
        this.bet = initialBet;
        this.isTurn = false;
        this.isStanding = false;
        this.isBusted = false;
        this.hasDoubledDown = false;
    }

    public void addCard(Card card) {
        cards.add(card);
    }

    public List<Card> getCards() {
        return cards;
    }

    public int getBet() {
        return bet;
    }

    public void setBet(int bet) {
        this.bet = bet;
    }

    @JsonProperty("isTurn")
    public boolean isTurn() {
        return isTurn;
    }

    public void setTurn(boolean turn) {
        isTurn = turn;
    }

    @JsonProperty("isStanding")
    public boolean isStanding() {
        return isStanding;
    }

    public void setStanding(boolean standing) {
        isStanding = standing;
    }

    @JsonProperty("isBusted")
    public boolean isBusted() {
        return isBusted;
    }

    public void setBusted(boolean busted) {
        isBusted = busted;
    }

    @JsonProperty("hasDoubledDown")
    public boolean hasDoubledDown() {
        return hasDoubledDown;
    }

    public void setDoubledDown(boolean doubledDown) {
        hasDoubledDown = doubledDown;
    }

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }
}
