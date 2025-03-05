package com.game.blackjack;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BlackjackGame {

    private List<Card> playerHand;
    private List<Card> dealerHand;
    private List<Card> deck;
    private boolean gameOver;
    private int balance;
    private int currentBet;

    public BlackjackGame() {
        this.playerHand = new ArrayList<>();
        this.dealerHand = new ArrayList<>();
        this.deck = new ArrayList<>();
        this.gameOver = false;
        this.balance = 1000; // Initial balance
        this.currentBet = 0;
        initializeDeck();
    }

    private void initializeDeck() {
        String[] suits = {"Hearts", "Diamonds", "Clubs", "Spades"};
        String[] values = {"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"};

        for (String suit : suits) {
            for (String value : values) {
                deck.add(new Card(value, suit));
            }
        }
        Collections.shuffle(deck);
    }

    public void dealInitialCards() {
        playerHand.clear();
        dealerHand.clear();
        playerHand.add(deck.remove(0));
        dealerHand.add(deck.remove(0));
        playerHand.add(deck.remove(0));
        dealerHand.add(deck.remove(0));
        gameOver = false;
        balance -= currentBet;
    }

    public void placeBet(int bet) {
        if (bet <= balance) {
            currentBet = bet;
        } else {
            throw new IllegalArgumentException("Bet exceeds balance");
        }
    }

    public void resolveBet(boolean playerWins, boolean tie) {
        if (playerWins) {
            balance += currentBet * 2;
        } else if (tie) {
            balance += currentBet;
        }
        currentBet = 0;
    }

    public boolean isTie() {
        return calculateHandValue(playerHand) == calculateHandValue(dealerHand);
    }

    public List<Card> getPlayerHand() {
        return playerHand;
    }

    public List<Card> getDealerHand() {
        return dealerHand;
    }

    public void hitPlayer() {
        if (!gameOver) {
            Card newCard = deck.remove(0);
            playerHand.add(newCard);
            checkGameOver();
        }
    }

    private void checkGameOver() {
        int playerValue = calculateHandValue(playerHand);
        int dealerValue = calculateHandValue(dealerHand);

        if (playerValue > 21 || dealerValue >= 21) {
            gameOver = true;
        }
    }

    public int calculateHandValue(List<Card> hand) {
        int value = 0;
        int aceCount = 0;

        for (Card card : hand) {
            if ("J".equals(card.getValue()) || "Q".equals(card.getValue()) || "K".equals(card.getValue())) {
                value += 10;
            } else if ("A".equals(card.getValue())) {
                aceCount++;
                value += 11;
            } else {
                value += Integer.parseInt(card.getValue());
            }
        }

        while (value > 21 && aceCount > 0) {
            value -= 10;
            aceCount--;
        }

        return value;
    }

    public void dealerPlay() {
        // Dealer hits until their hand is at least 17
        while (calculateHandValue(dealerHand) < 17) {
            dealerHand.add(deck.remove(0));
        }
    
        checkGameOver();
    }

    public int getBalance() {
        return balance;
    }

    public int getCurrentBet() {
        return currentBet;
    }

    public boolean isGameOver() {
        return gameOver;
    }
}