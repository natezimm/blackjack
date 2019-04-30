package com.nathan;

import java.util.ArrayList;

public class Hand{
    // arraylist to hold cards in user hand
    private ArrayList<Card> hand;

    // constructor
    public Hand(){
        hand = new ArrayList<Card>();
    }

    // method to add card to hand
    public void addCard(Card card){
            hand.add(card);
    }

    // method to retrieve card at certain position
    public Card getCard(int cardPosition){
            return hand.get(cardPosition);
    }

    // method to retrieve number of cards in a hand
    public int numberOfCardsInHand(){
        return hand.size();
    }

    // method to sort the cards in a hand by suit and value
    public void sortHand(){
        ArrayList<Card> newHand = new ArrayList<Card>();
        while(hand.size() > 0){
            int position = 0;
            int n = hand.size();
            Card previousCard = hand.get(0);
            for(int i = 0; i < n; i++){
                Card nextCard = hand.get(i);
                if(nextCard.getSuit() < previousCard.getSuit() ||
                        (nextCard.getSuit() == previousCard.getSuit() && nextCard.getValue() < previousCard.getValue()))
                {
                    position = i;
                    previousCard = nextCard;
                }
            }
            hand.remove(position);
            newHand.add(previousCard);
        }
        hand = newHand;
    }

}
