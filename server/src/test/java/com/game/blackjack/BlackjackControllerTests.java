package com.game.blackjack;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BlackjackController.class)
@SuppressWarnings("null")
class BlackjackControllerTests {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        private MockHttpSession session;

        @BeforeEach
        void setUp() {
                session = new MockHttpSession();
        }

        @Test
        void startGame_returnsConfiguredResponse() throws Exception {
                mockMvc.perform(get("/api/blackjack/start")
                                .param("decks", "2")
                                .param("dealerHitsOnSoft17", "true")
                                .session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.numberOfDecks").value(2))
                                .andExpect(jsonPath("$.dealerHitsOnSoft17").value(true))
                                .andExpect(jsonPath("$.bettingOpen").value(false))
                                .andExpect(jsonPath("$.playerHands[0].cards", hasSize(2)))
                                .andExpect(jsonPath("$.dealerHand", hasSize(2)));
        }

        @Test
        void placeBet_validRequest_returnsBalance() throws Exception {
                mockMvc.perform(post("/api/blackjack/bet")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("amount", 100)))
                                .session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.balance").value(1000));
        }

        @Test
        void placeBet_missingAmount_returnsBadRequest() throws Exception {
                mockMvc.perform(post("/api/blackjack/bet")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}")
                                .session(session))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value("Bet amount is required"));
        }

        @Test
        void placeBet_exceedsBalance_returnsBadRequest() throws Exception {
                mockMvc.perform(post("/api/blackjack/bet")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("amount", 2000)))
                                .session(session))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value("Bet exceeds balance"));
        }

        @Test
        void placeBet_afterRoundClosed_forfeitsAndReturnsBalance() throws Exception {
                prepareGameForPlay(25);
                int balanceBefore = getSessionGame().getBalance();

                mockMvc.perform(post("/api/blackjack/bet")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("amount", 50)))
                                .session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.balance").value(balanceBefore));

                assertTrue(getSessionGame().isBettingOpen());
                assertEquals(50, getSessionGame().getCurrentBet());
        }

        @Test
        void hit_addsCardToPlayer() throws Exception {
                placeBet(50);
                mockMvc.perform(get("/api/blackjack/start")
                                .param("decks", "1")
                                .param("dealerHitsOnSoft17", "false")
                                .session(session))
                                .andExpect(status().isOk());

                mockMvc.perform(post("/api/blackjack/hit").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].cards", hasSize(3)));
        }

        @Test
        void stand_resolvesGame() throws Exception {
                prepareGameForPlay(25);

                mockMvc.perform(post("/api/blackjack/stand").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.gameOver").value(true));
        }

        @Test
        void stand_playerBust_reportsLoss() throws Exception {
                prepareGameForPlay(30);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("K", "Hearts"),
                                new Card("Q", "Diamonds"),
                                new Card("2", "Clubs")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("9", "Hearts"),
                                new Card("8", "Diamonds")));

                mockMvc.perform(post("/api/blackjack/stand").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].outcome").value("LOSS"));
        }

        @Test
        void stand_playerWins_whenDealerBusts() throws Exception {
                prepareGameForPlay(35);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("9", "Hearts"),
                                new Card("7", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("K", "Clubs"),
                                new Card("9", "Spades"),
                                new Card("5", "Hearts")));

                mockMvc.perform(post("/api/blackjack/stand").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].outcome").value("WIN"));
        }

        @Test
        void stand_playerLoses_whenDealerHigher() throws Exception {
                prepareGameForPlay(45);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("10", "Clubs"),
                                new Card("7", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("10", "Hearts"),
                                new Card("8", "Clubs")));

                mockMvc.perform(post("/api/blackjack/stand").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].outcome").value("LOSS"));
        }

        @Test
        void stand_playerWins_whenPlayerHigher() throws Exception {
                prepareGameForPlay(50);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("10", "Hearts"),
                                new Card("K", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("9", "Clubs"),
                                new Card("9", "Spades")));

                mockMvc.perform(post("/api/blackjack/stand").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].outcome").value("WIN"));
        }

        @Test
        void doubleDown_withoutInitialHand_returnsBadRequest() throws Exception {
                mockMvc.perform(post("/api/blackjack/doubledown")
                                .contentType(MediaType.APPLICATION_JSON)
                                .session(session))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value("Cannot double down"));
        }

        @Test
        void doubleDown_afterBetAndStart_resolvesGame() throws Exception {
                prepareGameForPlay(30);

                mockMvc.perform(post("/api/blackjack/doubledown").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.gameOver").value(true));
        }

        @Test
        void doubleDown_triggersDealerPlayWhenStillOpen() throws Exception {
                prepareGameForPlay(40);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("3", "Hearts"),
                                new Card("6", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("10", "Clubs"),
                                new Card("6", "Spades")));
                replaceDeck(game, List.of(
                                new Card("5", "Clubs"),
                                new Card("4", "Hearts"),
                                new Card("7", "Diamonds")));

                mockMvc.perform(post("/api/blackjack/doubledown").session(session))
                                .andExpect(status().isOk());

                assertTrue(getSessionGame().getDealerHand().size() > 2);
        }

        @Test
        void doubleDown_insufficientBalance_returnsBadRequest() throws Exception {
                prepareGameForPlay(1000);

                mockMvc.perform(post("/api/blackjack/doubledown").session(session))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value("Insufficient balance to double down"));
        }

        @Test
        void doubleDown_bustsPlayer_skipsDealerPlayResponse() throws Exception {
                prepareGameForPlay(20);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("9", "Clubs"),
                                new Card("8", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("10", "Hearts"),
                                new Card("6", "Spades")));
                replaceDeck(game, List.of(new Card("10", "Spades")));

                mockMvc.perform(post("/api/blackjack/doubledown").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.dealerHand", hasSize(2)))
                                .andExpect(jsonPath("$.gameOver").value(true));
        }

        @Test
        void doubleDown_playerWins_whenDealerBusts() throws Exception {
                prepareGameForPlay(25);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("9", "Hearts"),
                                new Card("7", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("9", "Clubs"),
                                new Card("7", "Spades")));
                replaceDeck(game, List.of(
                                new Card("2", "Clubs"),
                                new Card("10", "Diamonds")));

                mockMvc.perform(post("/api/blackjack/doubledown").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].outcome").value("WIN"));
        }

        @Test
        void doubleDown_playerLoses_whenDealerHigher() throws Exception {
                prepareGameForPlay(30);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("9", "Hearts"),
                                new Card("7", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("10", "Clubs"),
                                new Card("9", "Spades")));
                replaceDeck(game, List.of(new Card("2", "Hearts")));

                mockMvc.perform(post("/api/blackjack/doubledown").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].outcome").value("LOSS"));
        }

        @Test
        void doubleDown_playerWins_withHigherTotal() throws Exception {
                prepareGameForPlay(40);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("9", "Hearts"),
                                new Card("9", "Diamonds")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("8", "Clubs"),
                                new Card("9", "Spades")));
                replaceDeck(game, List.of(new Card("2", "Clubs")));

                mockMvc.perform(post("/api/blackjack/doubledown").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands[0].outcome").value("WIN"));
        }

        @Test
        void reset_withPayload_appliesSettings() throws Exception {
                mockMvc.perform(post("/api/blackjack/reset")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of(
                                                "decks", 3,
                                                "dealerHitsOnSoft17", true)))
                                .session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.numberOfDecks").value(3))
                                .andExpect(jsonPath("$.dealerHitsOnSoft17").value(true))
                                .andExpect(jsonPath("$.bettingOpen").value(true));
        }

        @Test
        void reset_withoutPayload_usesDefaults() throws Exception {
                mockMvc.perform(post("/api/blackjack/reset").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.numberOfDecks").value(1))
                                .andExpect(jsonPath("$.dealerHitsOnSoft17").value(false))
                                .andExpect(jsonPath("$.bettingOpen").value(true));
        }

        @Test
        void reset_withInvalidPayload_fallsBackToDefaults() throws Exception {
                mockMvc.perform(post("/api/blackjack/reset")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of(
                                                "decks", "many",
                                                "dealerHitsOnSoft17", "yes")))
                                .session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.numberOfDecks").value(1))
                                .andExpect(jsonPath("$.dealerHitsOnSoft17").value(false));
        }

        @Test
        void gameover_reflectsGameState() throws Exception {
                placeBet(40);
                mockMvc.perform(get("/api/blackjack/start")
                                .param("decks", "1")
                                .param("dealerHitsOnSoft17", "false")
                                .session(session))
                                .andExpect(status().isOk());

                mockMvc.perform(get("/api/blackjack/gameover").session(session))
                                .andExpect(status().isOk())
                                .andExpect(content().string("false"));

                mockMvc.perform(post("/api/blackjack/stand").session(session))
                                .andExpect(status().isOk());

                mockMvc.perform(get("/api/blackjack/gameover").session(session))
                                .andExpect(status().isOk())
                                .andExpect(content().string("true"));
        }

        @Test
        void state_reportsCurrentGameFields() throws Exception {
                prepareGameForPlay(60);

                mockMvc.perform(get("/api/blackjack/state").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.deckSize").value(48))
                                .andExpect(jsonPath("$.bettingOpen").value(false));
        }

        private BlackjackGame getSessionGame() {
                return (BlackjackGame) session.getAttribute("blackjackGame");
        }

        @SuppressWarnings("unchecked")
        private void replaceDeck(BlackjackGame game, List<Card> cards) throws Exception {
                Field deckField = BlackjackGame.class.getDeclaredField("deck");
                deckField.setAccessible(true);
                List<Card> deck = (List<Card>) deckField.get(game);
                deck.clear();
                deck.addAll(cards);
        }

        private void placeBet(int amount) throws Exception {
                mockMvc.perform(post("/api/blackjack/bet")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("amount", amount)))
                                .session(session))
                                .andExpect(status().isOk());
        }

        private void prepareGameForPlay(int amount) throws Exception {
                placeBet(amount);
                mockMvc.perform(get("/api/blackjack/start")
                                .param("decks", "1")
                                .param("dealerHitsOnSoft17", "false")
                                .session(session))
                                .andExpect(status().isOk());
        }

        @Test
        void split_validRequest_splitsHand() throws Exception {
                prepareGameForPlay(50);
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("8", "Hearts"),
                                new Card("8", "Diamonds")));

                mockMvc.perform(post("/api/blackjack/split").session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.playerHands", hasSize(2)))
                                .andExpect(jsonPath("$.playerHands[0].cards", hasSize(2)))
                                .andExpect(jsonPath("$.playerHands[1].cards", hasSize(2)));
        }

        @Test
        void split_invalidRequest_returnsBadRequest() throws Exception {
                prepareGameForPlay(50);
                // Default hand is not a pair usually, but let's force a non-pair to be safe
                BlackjackGame game = getSessionGame();
                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("10", "Hearts"),
                                new Card("5", "Diamonds")));

                mockMvc.perform(post("/api/blackjack/split").session(session))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        void insurance_missingAmount_returnsBadRequest() throws Exception {
                prepareGameForPlay(50);

                mockMvc.perform(post("/api/blackjack/insurance")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}")
                                .session(session))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value("Insurance amount is required"));
        }

        @Test
        void insurance_losesBetAndContinuesWhenDealerNoBlackjack() throws Exception {
                prepareGameForPlay(100);
                BlackjackGame game = getSessionGame();

                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("9", "Hearts"),
                                new Card("7", "Spades")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("9", "Clubs"),
                                new Card("A", "Diamonds")));

                setPrivateField(game, "insuranceOffered", true);
                setPrivateField(game, "insuranceResolved", false);
                setPrivateField(game, "insuranceBet", 0);
                setPrivateField(game, "insuranceOutcome", null);
                setPrivateField(game, "playerActed", false);

                mockMvc.perform(post("/api/blackjack/insurance")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("amount", 50)))
                                .session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.insuranceBet").value(50))
                                .andExpect(jsonPath("$.insuranceOutcome").value("LOSS"))
                                .andExpect(jsonPath("$.gameOver").value(false))
                                .andExpect(jsonPath("$.bettingOpen").value(false))
                                .andExpect(jsonPath("$.balance").value(850));
        }

        @Test
        void insurance_paysTwoToOneAndEndsRoundWhenDealerHasBlackjack() throws Exception {
                prepareGameForPlay(100);
                BlackjackGame game = getSessionGame();

                game.getPlayerHands().get(0).getCards().clear();
                game.getPlayerHands().get(0).getCards().addAll(Arrays.asList(
                                new Card("9", "Hearts"),
                                new Card("7", "Spades")));
                game.getDealerHand().clear();
                game.getDealerHand().addAll(Arrays.asList(
                                new Card("10", "Clubs"),
                                new Card("A", "Diamonds")));

                setPrivateField(game, "insuranceOffered", true);
                setPrivateField(game, "insuranceResolved", false);
                setPrivateField(game, "insuranceBet", 0);
                setPrivateField(game, "insuranceOutcome", null);
                setPrivateField(game, "playerActed", false);

                mockMvc.perform(post("/api/blackjack/insurance")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("amount", 50)))
                                .session(session))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.insuranceBet").value(50))
                                .andExpect(jsonPath("$.insuranceOutcome").value("WIN"))
                                .andExpect(jsonPath("$.gameOver").value(true))
                                .andExpect(jsonPath("$.bettingOpen").value(true))
                                .andExpect(jsonPath("$.balance").value(1000));
        }

        private void setPrivateField(Object target, String name, Object value) throws Exception {
                Field field = BlackjackGame.class.getDeclaredField(name);
                field.setAccessible(true);
                field.set(target, value);
        }
}
