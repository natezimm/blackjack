package com.nathan;

public class Card {
    // values for each suit and sorted by color
    public final static int Spades = 0;
    public final static int Clubs = 1;
    public final static int Diamonds = 2;
    public final static int Hearts = 3;

    // variables for the card
    private final int suit;
    private final int value;

    // constructor
    public Card(int value, int suit) {
        this.value = value;
        this.suit = suit;
    }

    // getter for suit of card
    public int getSuit() {
        return suit;
    }

    // getter for value of card
    public int getValue() {
        return value;
    }

    // getter to receive each card suit as a string
    public String getSuitAsString() {
        switch (suit) {
            case Spades:   return "Spades";
            case Clubs:   return "Clubs";
            case Diamonds: return "Diamonds";
            case Hearts:    return "Hearts";
            default:       return "N/A";
        }
    }

    // getter to receive each card value as a string
    public String getValueAsString() {
        switch (value) {
            case 1:   return "Ace";
            case 2:   return "2";
            case 3:   return "3";
            case 4:   return "4";
            case 5:   return "5";
            case 6:   return "6";
            case 7:   return "7";
            case 8:   return "8";
            case 9:   return "9";
            case 10:  return "10";
            case 11:  return "Jack";
            case 12:  return "Queen";
            case 13:  return "King";
            default:  return "N/A";
        }
    }

    public String toString() {
        return getValueAsString() + " of " + getSuitAsString();
    }
}
