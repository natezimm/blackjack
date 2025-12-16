package com.game.blackjack;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BlackjackGame {

    private List<Hand> playerHands;
    private int currentHandIndex;
    private List<Card> dealerHand;
    private List<Card> deck;
    private boolean gameOver;
    private int balance;
    private int initialBet;
    private boolean bettingOpen = true;
    private boolean dealerHitsOnSoft17 = false;
    private int numberOfDecks = 1;

    public BlackjackGame() {
        this.playerHands = new ArrayList<>();
        this.dealerHand = new ArrayList<>();
        this.deck = new ArrayList<>();
        this.gameOver = false;
        this.balance = 1000; // Initial balance
        this.initialBet = 0;
        initializeDeck(1);
    }

    public void initializeDeck(int numberOfDecks) {
        deck.clear();
        this.numberOfDecks = numberOfDecks;
        String[] suits = { "Hearts", "Diamonds", "Clubs", "Spades" };
        String[] values = { "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A" };

        for (int i = 0; i < numberOfDecks; i++) {
            for (String suit : suits) {
                for (String value : values) {
                    deck.add(new Card(value, suit));
                }
            }
        }
        Collections.shuffle(deck);
    }

    public void dealInitialCards() {
        playerHands.clear();
        dealerHand.clear();

        // Create initial hand
        Hand initialHand = new Hand(initialBet);
        playerHands.add(initialHand);
        currentHandIndex = 0;
        initialHand.setTurn(true);

        // Deal cards
        initialHand.addCard(deck.remove(0));
        dealerHand.add(deck.remove(0));
        initialHand.addCard(deck.remove(0));
        dealerHand.add(deck.remove(0));

        gameOver = false;
        balance -= initialBet;
        bettingOpen = false;
    }

    public void placeBet(int bet) {
        if (!bettingOpen) {
            throw new IllegalStateException("Cannot bet after cards are dealt");
        }
        if (bet <= balance) {
            initialBet = bet;
        } else {
            throw new IllegalArgumentException("Bet exceeds balance");
        }
    }

    public void resolveAllHands() {
        int dealerValue = calculateHandValue(dealerHand);

        for (Hand hand : playerHands) {
            int playerValue = calculateHandValue(hand.getCards());
            int bet = hand.getBet();

            // Logic for each hand
            if (hand.isBusted() || playerValue > 21) {
                hand.setOutcome("LOSS");
            } else {
                if (dealerValue > 21) {
                    // Dealer busts, player wins
                    balance += bet * 2;
                    hand.setOutcome("WIN");
                } else if (playerValue > dealerValue) {
                    // Player wins
                    balance += bet * 2;
                    hand.setOutcome("WIN");
                } else if (playerValue == dealerValue) {
                    // Push
                    balance += bet;
                    hand.setOutcome("TIE");
                } else {
                    hand.setOutcome("LOSS");
                }
            }
        }

        gameOver = true;
        initialBet = 0;
        bettingOpen = true;
    }

    public boolean isTie() {
        if (playerHands.isEmpty())
            return false;
        return calculateHandValue(playerHands.get(0).getCards()) == calculateHandValue(dealerHand);
    }

    public List<Hand> getPlayerHands() {
        return playerHands;
    }

    public List<Card> getDealerHand() {
        return dealerHand;
    }

    public Hand getCurrentHand() {
        if (playerHands.isEmpty() || currentHandIndex >= playerHands.size())
            return null;
        return playerHands.get(currentHandIndex);
    }

    public void hitPlayer() {
        if (!gameOver) {
            Hand currentHand = getCurrentHand();
            if (currentHand == null)
                return;

            Card newCard = deck.remove(0);
            currentHand.addCard(newCard);

            if (calculateHandValue(currentHand.getCards()) > 21) {
                currentHand.setBusted(true);
                stand();
            }
        }
    }

    public void doubleDown() {
        Hand currentHand = getCurrentHand();
        if (gameOver || currentHand == null) {
            throw new IllegalStateException("Cannot double down");
        }
        if (currentHand.getCards().size() != 2) {
            throw new IllegalStateException("Can only double down on initial two cards");
        }
        if (currentHand.hasDoubledDown()) {
            throw new IllegalStateException("Already doubled down");
        }
        if (currentHand.getBet() > balance) {
            throw new IllegalArgumentException("Insufficient balance to double down");
        }

        // Double the bet
        int bet = currentHand.getBet();
        balance -= bet;
        currentHand.setBet(bet * 2);
        currentHand.setDoubledDown(true);

        // Deal exactly one card
        Card newCard = deck.remove(0);
        currentHand.addCard(newCard);

        // Check bust/stand
        if (calculateHandValue(currentHand.getCards()) > 21) {
            currentHand.setBusted(true);
        }
        stand(); // Auto-stand after double down
    }

    public void split() {
        Hand currentHand = getCurrentHand();
        if (gameOver || currentHand == null) {
            throw new IllegalStateException("Cannot split");
        }
        if (currentHand.getCards().size() != 2) {
            throw new IllegalStateException("Can only split with two cards");
        }

        Card card1 = currentHand.getCards().get(0);
        Card card2 = currentHand.getCards().get(1);

        // Check values (taking 10, J, Q, K as 10)
        int v1 = getCardValueForSplit(card1);
        int v2 = getCardValueForSplit(card2);

        if (v1 != v2) {
            throw new IllegalStateException("Can only split pairs");
        }

        if (currentHand.getBet() > balance) {
            throw new IllegalArgumentException("Insufficient balance to split");
        }

        // Process split
        balance -= currentHand.getBet(); // Place bet for new hand

        // Remove second card from current hand
        currentHand.getCards().remove(1);

        // Create new hand with that card
        Hand newHand = new Hand(currentHand.getBet());
        newHand.addCard(card2);

        // Insert new hand after current hand
        playerHands.add(currentHandIndex + 1, newHand);

        // Deal one card to current hand
        currentHand.addCard(deck.remove(0));

        // Deal one card to new hand
        newHand.addCard(deck.remove(0));

        // Current hand continues playing (isTurn remains true)
    }

    private int getCardValueForSplit(Card card) {
        String val = card.getValue();
        if ("J".equals(val) || "Q".equals(val) || "K".equals(val))
            return 10;
        if ("A".equals(val))
            return 11;
        return Integer.parseInt(val);
    }

    public void stand() {
        Hand currentHand = getCurrentHand();
        if (currentHand != null) {
            currentHand.setStanding(true);
            currentHand.setTurn(false);
        }

        // Move to next hand
        currentHandIndex++;

        if (currentHandIndex < playerHands.size()) {
            // Play next hand
            playerHands.get(currentHandIndex).setTurn(true);
        } else {
            // All hands done, dealer plays
            dealerPlay();
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

    public void setDealerHitsOnSoft17(boolean dealerHitsOnSoft17) {
        this.dealerHitsOnSoft17 = dealerHitsOnSoft17;
    }

    public boolean isDealerHitsOnSoft17() {
        return dealerHitsOnSoft17;
    }

    public int getNumberOfDecks() {
        return numberOfDecks;
    }

    public void dealerPlay() {
        // Check if all hands are busted - if so, dealer doesn't need to play
        boolean allBusted = true;
        for (Hand h : playerHands) {
            if (!h.isBusted()) {
                allBusted = false;
                break;
            }
        }

        if (!allBusted) {
            while (calculateHandValue(dealerHand) < 17 || (dealerHitsOnSoft17 && isSoft17(dealerHand))) {
                dealerHand.add(deck.remove(0));
            }
        }

        resolveAllHands();
    }

    private boolean isSoft17(List<Card> hand) {
        int value = 0;
        int aceCount = 0;

        for (Card card : hand) {
            String cardValue = card.getValue();
            if ("J".equals(cardValue)) {
                value += 10;
            } else if ("Q".equals(cardValue)) {
                value += 10;
            } else if ("K".equals(cardValue)) {
                value += 10;
            } else if ("A".equals(cardValue)) {
                aceCount++;
                value += 11;
            } else {
                value += Integer.parseInt(cardValue);
            }
        }

        while (value > 21) {
            if (aceCount <= 0) {
                break;
            }
            value -= 10;
            aceCount--;
        }

        if (value != 17) {
            return false;
        }
        return aceCount > 0;
    }

    public int getBalance() {
        return balance;
    }

    public int getCurrentBet() {
        if (playerHands.isEmpty())
            return initialBet;
        int total = 0;
        for (Hand h : playerHands)
            total += h.getBet();
        return total;
    }

    public boolean isGameOver() {
        return gameOver;
    }

    public boolean isBettingOpen() {
        return bettingOpen;
    }

    public int getDeckSize() {
        return deck.size();
    }

    public void forfeitRound() {
        if (!bettingOpen && initialBet > 0) {
            bettingOpen = true;
            gameOver = true;
            playerHands.clear();
            dealerHand.clear();
            initialBet = 0;
        }
    }

    public boolean hasDoubledDown() {
        for (Hand h : playerHands) {
            if (h.hasDoubledDown())
                return true;
        }
        return false;
    }
}
