package com.nathan;

public class DeckOfCards{
    // array to hold cards
    private Card[] deckOfCards;
    private int cardsDrawn;

    // initialize deck to size of 52 and insert each card
    public DeckOfCards() {
        deckOfCards = new Card[52];
        int cardCount = 0;
        for (int suit = 0; suit <= 3; suit++) {
            for (int value = 1; value <= 13; value++) {
                deckOfCards[cardCount] = new Card(value,suit);
                cardCount++;
            }
        }
        cardsDrawn = 0;
    }

    // method randomly move cards around to shuffle
    public void shuffle() {
        for (int i = 51; i > 0; i--) {
            int rand = (int)(Math.random()*(i+1));
            Card temp = deckOfCards[i];
            deckOfCards[i] = deckOfCards[rand];
            deckOfCards[rand] = temp;
        }
        cardsDrawn = 0;
    }

    // method to add card to user hand
    public Card addCard() {
        if (cardsDrawn == 52)
            shuffle();
        cardsDrawn++;
        return deckOfCards[cardsDrawn - 1];
    }
}
