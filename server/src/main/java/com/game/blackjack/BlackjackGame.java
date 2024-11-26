package com.game.blackjack;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BlackjackGame {

    private List<Card> playerHand;
    private List<Card> dealerHand;
    private List<Card> deck;
    private boolean gameOver;

    public BlackjackGame() {
        this.playerHand = new ArrayList<>();
        this.dealerHand = new ArrayList<>();
        this.deck = new ArrayList<>();
        this.gameOver = false;
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
    }

    public List<Card> getPlayerHand() {
        return playerHand;
    }

    public List<Card> getDealerHand() {
        return dealerHand;
    }

    public void hitPlayer() {
        if (!gameOver) {
            playerHand.add(deck.remove(0));
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

    private int calculateHandValue(List<Card> hand) {
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
            dealerHand.add(deck.remove(0)); // Deal a new card to the dealer
        }
    
        checkGameOver(); // Check if the game is over (e.g., dealer busts or reaches 21)
    }

    public boolean isGameOver() {
        return gameOver;
    }
}