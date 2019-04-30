package com.nathan;

import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        // initialize money and bet variables
        int userMoney;
        int userBet;
        boolean userWins;

        System.out.println("Welcome to blackjack.");
        System.out.println();

        // give user $1000 to play
        userMoney = 1000;

        Scanner scanner = new Scanner(System.in);

        while(true) {
            System.out.println("You have $" + userMoney + ".");
            do {
                System.out.println("How much do you want to bet? (Enter 0 to end game.)");
                userBet = scanner.nextInt();
                if(userBet < 0 || userBet > userMoney){
                    System.out.println("Your bet must be between 0 and " + userMoney + ".");
                }
            } while (userBet < 0 || userBet > userMoney);
            if (userBet == 0){
                break;
            }
            userWins = playGame();
            if(userWins){
                userMoney += userBet;
            } else {
                userMoney -= userBet;
            }
            System.out.println();
            if (userMoney == 0){
                System.out.println("You are out of money. Game over.");
                break;
            }
        }

        System.out.println();
        System.out.println("You left with $" + userMoney + ".");
    }

    static boolean playGame() {
        Scanner scanner = new Scanner(System.in);

        // initialize deck for game
        DeckOfCards deck = new DeckOfCards();
        // shuffle the deck
        deck.shuffle();

        // initialize dealer and deal two cards
        BlackjackHand dealer = new BlackjackHand();
        dealer.addCard(deck.addCard());
        dealer.addCard(deck.addCard());

        // initialize hand and deal two cards
        BlackjackHand hand = new BlackjackHand();
        hand.addCard(deck.addCard());
        hand.addCard(deck.addCard());

        System.out.println();
        System.out.println();

        // check to see if dealer has blackjack
        if(dealer.getHandValue() == 21){
            dealer.sortHand();
            hand.sortHand();
            System.out.println("Dealer has the " + dealer.getCard(0) +
                    " and the " + dealer.getCard(1) + ".");
            System.out.println("You have the " + hand.getCard(0) +
                    " and the " + hand.getCard(1));
            System.out.println();
            System.out.println("Dealer has blackjack. Dealer wins.");
            return false;
        }

        // check to see if user has blackjack
        if(hand.getHandValue() == 21){
            dealer.sortHand();
            hand.sortHand();
            System.out.println("Dealer has the " + dealer.getCard(0) +
                    " and the " + dealer.getCard(1) + ".");
            System.out.println("You have the " + hand.getCard(0) +
                    " and the " + hand.getCard(1));
            System.out.println();
            System.out.println("You have blackjack. You win.");
            return true;
        }

//      If both the dealer and the user do not have blackjack, then the game continues.
//      The user will first draw cards until the user stops or until the user goes
//      over 21. If over 21, the user loses.

        while(true){
            System.out.println();
            System.out.println();
            System.out.println("Your cards are:");
            hand.sortHand();
            for(int i = 0; i < hand.numberOfCardsInHand(); i++){
                System.out.println("     " + hand.getCard(i));
            }
            System.out.println("Your total is " + hand.getHandValue());
            System.out.println();
            System.out.println("Dealer is showing the " + dealer.getCard(0));
            System.out.println();
            System.out.println("Do you want to hit or stand?");
            System.out.println("Enter H for Hit or S for Stand.");
            char userChoice;
            do {
                userChoice = Character.toUpperCase(scanner.next().charAt(0));
                if(userChoice != 'H' && userChoice != 'S'){
                    System.out.println("Please enter H or S: ");
                }
            } while (userChoice != 'H' && userChoice != 'S');
            // User gets card if hit is selected. Loop ends if user stands.
            if (userChoice == 'S'){
                break;
            } else {
                Card nextCard = deck.addCard();
                hand.addCard(nextCard);
                System.out.println();
                System.out.println("You hit.");
                System.out.println("Your card is the " + nextCard);
                System.out.println("Your total now is " + hand.getHandValue());
                if (hand.getHandValue() > 21){
                    System.out.println();
                    System.out.println("You went over 21. You lose.");
                    System.out.println("Dealer's other card was the " + dealer.getCard(1));
                    System.out.println("Dealer's total was " + dealer.getHandValue() + ".");
                    return false;
                }
            }
        }

        // the user has value of 21 or lower and stopped getting new cards
        // the dealer now must draw until over 16

        System.out.println();
        System.out.println("You stand.");
        System.out.println("Dealer's cards are:");
        dealer.sortHand();
        System.out.println("     " + dealer.getCard(0));
        System.out.println("     " + dealer.getCard(1));
        while (dealer.getHandValue() <= 16) {
            Card nextCard = deck.addCard();
            System.out.println("Dealer hits. Dealer gets the " + nextCard);
            dealer.addCard(nextCard);
            if (dealer.getHandValue() > 21){
                System.out.println();
                System.out.println("Dealer went over 21. You win.");
                return true;
            }
        }
        System.out.println("Dealer's total is " + dealer.getHandValue());

        // both players have 21 or less. compare to see who wins.
        System.out.println();
        if (dealer.getHandValue() == hand.getHandValue()){
            System.out.println("Dealer wins for a tie. You lose.");
            return false;
        } else if (dealer.getHandValue() > hand.getHandValue()) {
            System.out.println("Dealer wins. Dealer has " + dealer.getHandValue() +
                    " and you have " + hand.getHandValue() + ".");
            return false;
        } else {
            System.out.println("You win. You have " + hand.getHandValue() +
                    " and dealer has " + dealer.getHandValue() + ".");
            return true;
        }
    }
}
