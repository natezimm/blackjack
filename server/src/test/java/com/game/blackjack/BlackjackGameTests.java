package com.game.blackjack;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class BlackjackGameTests {

    @Test
    void initializeDeck_setsDeckSizeAndNumberOfDecks() {
        BlackjackGame game = new BlackjackGame();
        game.initializeDeck(2);
        assertEquals(2, game.getNumberOfDecks());
        assertEquals(104, game.getDeckSize());
    }

    @Test
    void dealInitialCards_assignsHandsAndDeductsBet() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(100);
        game.dealInitialCards();
        assertEquals(2, game.getPlayerHand().size());
        assertEquals(2, game.getDealerHand().size());
        assertFalse(game.isBettingOpen());
        assertEquals(900, game.getBalance());
        assertEquals(48, game.getDeckSize());
        assertFalse(game.isGameOver());
    }

    @Test
    void hitPlayer_bustsPlayerWhenValueExceeds21() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(10);
        game.getPlayerHand().clear();
        game.getPlayerHand().addAll(Arrays.asList(
                new Card("K", "Hearts"),
                new Card("Q", "Diamonds"),
                new Card("2", "Clubs")
        ));
        game.hitPlayer();
        assertTrue(game.isGameOver());
        assertEquals(0, game.getCurrentBet());
        assertTrue(game.isBettingOpen());
    }

    @Test
    void doubleDown_successfullyDoublesBet() throws Exception {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(100);
        game.dealInitialCards();
        int balanceBefore = game.getBalance();
        game.getPlayerHand().clear();
        game.getPlayerHand().addAll(Arrays.asList(
                new Card("7", "Hearts"),
                new Card("7", "Diamonds")
        ));
        game.getDealerHand().clear();
        game.getDealerHand().addAll(Arrays.asList(
                new Card("10", "Clubs"),
                new Card("6", "Spades")
        ));
        replaceDeck(game, List.of(new Card("5", "Clubs")));
        game.doubleDown();
        assertTrue(game.hasDoubledDown());
        assertEquals(200, game.getCurrentBet());
        assertEquals(balanceBefore - 100, game.getBalance());
    }

    @Test
    void doubleDown_throwsWhenInsufficientBalanceAfterInitialDeal() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(game.getBalance());
        game.dealInitialCards();
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, game::doubleDown);
        assertEquals("Insufficient balance to double down", exception.getMessage());
    }

    @Test
    void doubleDown_throwsWhenNotOnInitialTwoCards() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(50);
        game.dealInitialCards();
        game.getPlayerHand().add(new Card("2", "Clubs"));
        IllegalStateException exception = assertThrows(IllegalStateException.class, game::doubleDown);
        assertEquals("Can only double down on initial two cards", exception.getMessage());
    }

    @Test
    void resolveBet_awardsWinningsForPlayerVictory() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(100);
        game.dealInitialCards();
        game.resolveBet(true, false);
        assertEquals(1100, game.getBalance());
        assertTrue(game.isGameOver());
        assertEquals(0, game.getCurrentBet());
        assertTrue(game.isBettingOpen());
    }

    @Test
    void resolveBet_handlesTie() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(100);
        game.resolveBet(false, true);
        assertEquals(1100, game.getBalance());
        assertTrue(game.isGameOver());
        assertEquals(0, game.getCurrentBet());
        assertTrue(game.isBettingOpen());
    }

    @Test
    void forfeitRound_resetsGame() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(50);
        game.dealInitialCards();
        game.forfeitRound();
        assertTrue(game.isGameOver());
        assertEquals(0, game.getCurrentBet());
        assertTrue(game.isBettingOpen());
        assertTrue(game.getPlayerHand().isEmpty());
        assertTrue(game.getDealerHand().isEmpty());
        assertFalse(game.hasDoubledDown());
    }

    @Test
    void calculateHandValue_handlesAcesAndFaceCards() {
        BlackjackGame game = new BlackjackGame();
        List<Card> hand = Arrays.asList(
                new Card("A", "Hearts"),
                new Card("K", "Spades"),
                new Card("5", "Diamonds"),
                new Card("A", "Clubs")
        );
        assertEquals(17, game.calculateHandValue(hand));
    }

    @Test
    void dealerPlay_hitsOnSoft17() throws Exception {
        BlackjackGame game = new BlackjackGame();
        replaceDeck(game, Arrays.asList(
                new Card("5", "Clubs"),
                new Card("7", "Hearts"),
                new Card("9", "Spades")
        ));
        game.getDealerHand().clear();
        game.getDealerHand().addAll(Arrays.asList(
                new Card("A", "Hearts"),
                new Card("6", "Diamonds")
        ));
        game.getPlayerHand().clear();
        game.getPlayerHand().addAll(Arrays.asList(
                new Card("9", "Clubs"),
                new Card("8", "Diamonds")
        ));
        game.setDealerHitsOnSoft17(true);
        int dealerValueBefore = game.calculateHandValue(game.getDealerHand());
        int deckSizeBefore = game.getDeckSize();
        game.dealerPlay();
        assertNotEquals(dealerValueBefore, game.calculateHandValue(game.getDealerHand()));
        assertTrue(game.getDeckSize() < deckSizeBefore);
    }

    @Test
    void dealerPlay_standsOnHard17() throws Exception {
        BlackjackGame game = new BlackjackGame();
        replaceDeck(game, List.of(new Card("5", "Clubs")));
        game.getDealerHand().clear();
        game.getDealerHand().addAll(Arrays.asList(
                new Card("10", "Hearts"),
                new Card("7", "Diamonds")
        ));
        game.setDealerHitsOnSoft17(false);
        game.dealerPlay();
        assertEquals(2, game.getDealerHand().size());
        assertEquals(1, game.getDeckSize());
    }

    @Test
    void isTie_detectsEqualHands() {
        BlackjackGame game = new BlackjackGame();
        game.getPlayerHand().clear();
        game.getDealerHand().clear();
        game.getPlayerHand().addAll(Arrays.asList(
                new Card("10", "Hearts"),
                new Card("7", "Clubs")
        ));
        game.getDealerHand().addAll(Arrays.asList(
                new Card("9", "Spades"),
                new Card("8", "Diamonds")
        ));
        assertTrue(game.isTie());
    }

    @Test
    void setDealerHitsOnSoft17_updatesState() {
        BlackjackGame game = new BlackjackGame();
        game.setDealerHitsOnSoft17(true);
        assertTrue(game.isDealerHitsOnSoft17());
        game.setDealerHitsOnSoft17(false);
        assertFalse(game.isDealerHitsOnSoft17());
    }

    @Test
    void doubleDown_throwsWhenGameAlreadyOver() throws Exception {
        BlackjackGame game = new BlackjackGame();
        setPrivateField(game, "gameOver", true);
        IllegalStateException exception = assertThrows(IllegalStateException.class, game::doubleDown);
        assertEquals("Cannot double down after game is over", exception.getMessage());
    }

    @Test
    void doubleDown_throwsWhenAlreadyDoubledDown() throws Exception {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(50);
        game.dealInitialCards();
        replaceDeck(game, List.of(new Card("5", "Clubs")));
        game.doubleDown();

        if (game.getPlayerHand().size() > 2) {
            game.getPlayerHand().subList(2, game.getPlayerHand().size()).clear();
        }
        setPrivateField(game, "gameOver", false);
        IllegalStateException exception = assertThrows(IllegalStateException.class, game::doubleDown);
        assertEquals("Already doubled down", exception.getMessage());
    }

    @Test
    void doubleDown_throwsWhenInsufficientBalance() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(1000);
        game.dealInitialCards();

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, game::doubleDown);
        assertEquals("Insufficient balance to double down", exception.getMessage());
    }

    @Test
    void placeBet_throwsWhenBettingClosed() {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(50);
        game.dealInitialCards();

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> game.placeBet(10));
        assertEquals("Cannot bet after cards are dealt", exception.getMessage());
    }

    @Test
    void forfeitRound_noopsWhenBettingOpen() {
        BlackjackGame game = new BlackjackGame();
        game.forfeitRound();

        assertTrue(game.isBettingOpen());
        assertEquals(0, game.getCurrentBet());
        assertFalse(game.isGameOver());
    }

    @Test
    void forfeitRound_noopsWhenCurrentBetZeroButClosed() throws Exception {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(10);
        game.dealInitialCards();
        setPrivateField(game, "currentBet", 0);
        setPrivateField(game, "bettingOpen", false);

        game.forfeitRound();

        assertFalse(game.isGameOver());
        assertEquals(0, game.getCurrentBet());
        assertFalse(game.isBettingOpen());
    }

    @Test
    void isSoft17_identifiesSoft17() throws Exception {
        BlackjackGame game = new BlackjackGame();
        List<Card> hand = Arrays.asList(
                new Card("A", "Hearts"),
                new Card("6", "Diamonds")
        );

        assertTrue(invokeIsSoft17(game, hand));
    }

    @Test
    void isSoft17_returnsFalseForHard17() throws Exception {
        BlackjackGame game = new BlackjackGame();
        List<Card> hand = Arrays.asList(
                new Card("10", "Hearts"),
                new Card("7", "Clubs")
        );

        assertFalse(invokeIsSoft17(game, hand));
    }

    @Test
    void isSoft17_reducesAceValueWhenBust() throws Exception {
        BlackjackGame game = new BlackjackGame();
        List<Card> hand = Arrays.asList(
                new Card("A", "Hearts"),
                new Card("K", "Diamonds"),
                new Card("A", "Clubs")
        );

        assertFalse(invokeIsSoft17(game, hand));
    }

    @Test
    void isSoft17_handlesFaceCardJack() throws Exception {
        BlackjackGame game = new BlackjackGame();
        List<Card> hand = Arrays.asList(
                new Card("J", "Clubs"),
                new Card("6", "Diamonds")
        );

        assertFalse(invokeIsSoft17(game, hand.subList(0, 2)));
    }

    @Test
    void isSoft17_handlesFaceCardQueen() throws Exception {
        BlackjackGame game = new BlackjackGame();
        List<Card> hand = Arrays.asList(
                new Card("Q", "Spades"),
                new Card("6", "Diamonds")
        );

        assertFalse(invokeIsSoft17(game, hand.subList(0, 2)));
    }

    @Test
    void isSoft17_withoutAceBustsSkipsAdjustment() throws Exception {
        BlackjackGame game = new BlackjackGame();
        List<Card> hand = Arrays.asList(
                new Card("10", "Hearts"),
                new Card("9", "Diamonds"),
                new Card("6", "Clubs")
        );

        assertFalse(invokeIsSoft17(game, hand));
    }

    @Test
    void hitPlayer_noopsWhenGameOver() throws Exception {
        BlackjackGame game = new BlackjackGame();
        setPrivateField(game, "gameOver", true);
        int sizeBefore = game.getPlayerHand().size();
        game.hitPlayer();
        assertEquals(sizeBefore, game.getPlayerHand().size());
    }

    @Test
    void doubleDown_playerBusts_skipsDealerPlay() throws Exception {
        BlackjackGame game = new BlackjackGame();
        game.placeBet(20);
        game.dealInitialCards();
        game.getPlayerHand().clear();
        game.getPlayerHand().addAll(Arrays.asList(
                new Card("9", "Clubs"),
                new Card("8", "Diamonds")
        ));
        replaceDeck(game, List.of(new Card("10", "Hearts")));

        game.doubleDown();

        assertTrue(game.isGameOver());
        assertEquals(2, game.getDealerHand().size());
    }

    private void setPrivateField(Object target, String name, Object value) throws Exception {
        Field field = BlackjackGame.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }

    private boolean invokeIsSoft17(BlackjackGame game, List<Card> hand) throws Exception {
        Method method = BlackjackGame.class.getDeclaredMethod("isSoft17", List.class);
        method.setAccessible(true);
        return (boolean) method.invoke(game, hand);
    }

    @SuppressWarnings("unchecked")
    private static void replaceDeck(BlackjackGame game, List<Card> cards) throws Exception {
        Field deckField = BlackjackGame.class.getDeclaredField("deck");
        deckField.setAccessible(true);
        List<Card> deck = (List<Card>) deckField.get(game);
        deck.clear();
        deck.addAll(cards);
    }
}
