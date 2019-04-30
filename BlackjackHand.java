package com.nathan;

public class BlackjackHand extends Hand{
    // method to calculate value of a hand in terms of blackjack rules
    public int getHandValue() {
        int handTotal = 0;
        boolean handHasAce = false;
        int cardsInHand = numberOfCardsInHand();

        // add all cards in hand to total value of hand
        for (int i = 0; i < cardsInHand; i++) {
            Card card;
            int valueOfCard;
            card = getCard(i);
            valueOfCard = card.getValue();
            if (valueOfCard > 10) {
                valueOfCard = 10;
            }
            if (valueOfCard == 1) {
                handHasAce = true;
            }
            handTotal += valueOfCard;
        }
        // make one ace worth 11 if hand value is not over 21
        if(handHasAce == true && handTotal + 10 <= 21){ handTotal += 10;}
        return handTotal;
    }

}
