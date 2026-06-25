import {
  getBasicStrategyRecommendation,
  getInsuranceStrategyRecommendation,
  getVisibleDealerUpcard,
  STRATEGY_ACTIONS,
} from './basicStrategy';

const card = (value, suit = 'Spades') => ({ value, suit });
const dealer = (hidden, upcard) => [card(hidden), card(upcard)];

describe('getVisibleDealerUpcard', () => {
  it('uses dealer hand index 1 because index 0 is the hidden hole card', () => {
    expect(getVisibleDealerUpcard(dealer('10', 'A'))).toEqual(card('A'));
  });

  it('returns null until both dealer cards are available', () => {
    expect(getVisibleDealerUpcard([card('A')])).toBeNull();
  });
});

describe('getBasicStrategyRecommendation', () => {
  it('recommends splitting aces when split is legal', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('A'), card('A')] },
        dealerHand: dealer('10', '9'),
        canSplit: true,
      })
    ).toMatchObject({
      action: STRATEGY_ACTIONS.split,
      summary: 'Pair Aces vs dealer 9',
    });
  });

  it('falls back to hard-total strategy when a pair cannot be split', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('8'), card('8')] },
        dealerHand: dealer('10', '10'),
        canSplit: false,
      })
    ).toMatchObject({
      action: STRATEGY_ACTIONS.hit,
      summary: 'Hard 16 vs dealer 10',
    });
  });

  it('recommends double for hard 11 against a dealer 10 when double is legal', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('6'), card('5')] },
        dealerHand: dealer('4', '10'),
        canDouble: true,
      }).action
    ).toBe(STRATEGY_ACTIONS.double);
  });

  it('falls back to hit when a double recommendation is not legal', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('6'), card('5')] },
        dealerHand: dealer('4', '10'),
        canDouble: false,
      }).action
    ).toBe(STRATEGY_ACTIONS.hit);
  });

  it('uses H17 strategy for soft 18 against dealer 2', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('A'), card('7')] },
        dealerHand: dealer('10', '2'),
        canDouble: true,
        dealerHitsOnSoft17: true,
      }).action
    ).toBe(STRATEGY_ACTIONS.double);
  });

  it('uses S17 strategy for soft 18 against dealer 2', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('A'), card('7')] },
        dealerHand: dealer('10', '2'),
        canDouble: true,
        dealerHitsOnSoft17: false,
      }).action
    ).toBe(STRATEGY_ACTIONS.stand);
  });

  it('does not recommend until the active hand and dealer upcard are available', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('9')] },
        dealerHand: dealer('10', '6'),
      })
    ).toBeNull();
  });
});

describe('getInsuranceStrategyRecommendation', () => {
  it('recommends declining insurance when the decision is pending', () => {
    expect(getInsuranceStrategyRecommendation(true)).toEqual({
      action: STRATEGY_ACTIONS.noInsurance,
      summary: 'Dealer Ace upcard',
    });
  });
});
