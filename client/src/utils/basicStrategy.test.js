import {
  getCardStrategyValue,
  getBasicStrategyRecommendation,
  getInsuranceStrategyRecommendation,
  getStrategyButtonClass,
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

describe('getCardStrategyValue', () => {
  it('normalizes aces, face cards, numeric cards, and invalid input', () => {
    expect(getCardStrategyValue(card('A'))).toBe(11);
    expect(getCardStrategyValue(card('Q'))).toBe(10);
    expect(getCardStrategyValue(card('7'))).toBe(7);
    expect(getCardStrategyValue(null)).toBeNull();
    expect(getCardStrategyValue({})).toBeNull();
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

  it('does not recommend for malformed card values', () => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: [card('9'), card('2')] },
        dealerHand: dealer('10', 'not-a-card'),
      })
    ).toBeNull();
  });

  it.each([
    ['10s stand', ['10', 'K'], '6', STRATEGY_ACTIONS.stand, 'Pair 10s'],
    ['9s split against 9', ['9', '9'], '9', STRATEGY_ACTIONS.split, 'Pair 9s'],
    ['9s stand against 7', ['9', '9'], '7', STRATEGY_ACTIONS.stand, 'Pair 9s'],
    ['7s split against 7', ['7', '7'], '7', STRATEGY_ACTIONS.split, 'Pair 7s'],
    ['7s hit against 8', ['7', '7'], '8', STRATEGY_ACTIONS.hit, 'Pair 7s'],
    ['6s split against 6', ['6', '6'], '6', STRATEGY_ACTIONS.split, 'Pair 6s'],
    ['6s hit against 7', ['6', '6'], '7', STRATEGY_ACTIONS.hit, 'Pair 6s'],
    ['4s split against 5', ['4', '4'], '5', STRATEGY_ACTIONS.split, 'Pair 4s'],
    ['4s hit against 4', ['4', '4'], '4', STRATEGY_ACTIONS.hit, 'Pair 4s'],
    ['3s split against 7', ['3', '3'], '7', STRATEGY_ACTIONS.split, 'Pair 3s'],
    ['2s hit against 8', ['2', '2'], '8', STRATEGY_ACTIONS.hit, 'Pair 2s'],
  ])('handles pair strategy: %s', (_, playerCards, upcard, action, summary) => {
    expect(
      getBasicStrategyRecommendation({
        playerHand: { cards: playerCards.map((value) => card(value)) },
        dealerHand: dealer('10', upcard),
        canSplit: true,
      })
    ).toMatchObject({
      action,
      summary: expect.stringContaining(summary),
    });
  });

  it.each([
    ['soft 20 stands', ['A', '9'], '10', false, STRATEGY_ACTIONS.stand],
    [
      'soft 19 doubles on H17 dealer 6',
      ['A', '8'],
      '6',
      true,
      STRATEGY_ACTIONS.double,
    ],
    [
      'soft 19 stands on S17 dealer 6',
      ['A', '8'],
      '6',
      false,
      STRATEGY_ACTIONS.stand,
    ],
    ['soft 18 hits against 9', ['A', '7'], '9', false, STRATEGY_ACTIONS.hit],
    [
      'soft 17 doubles against 3',
      ['A', '6'],
      '3',
      false,
      STRATEGY_ACTIONS.double,
    ],
    ['soft 17 hits against 2', ['A', '6'], '2', false, STRATEGY_ACTIONS.hit],
    [
      'soft 16 doubles against 4',
      ['A', '5'],
      '4',
      false,
      STRATEGY_ACTIONS.double,
    ],
    ['soft 15 hits against 3', ['A', '4'], '3', false, STRATEGY_ACTIONS.hit],
    [
      'soft 14 doubles against 5',
      ['A', '3'],
      '5',
      false,
      STRATEGY_ACTIONS.double,
    ],
    ['soft 13 hits against 4', ['A', '2'], '4', false, STRATEGY_ACTIONS.hit],
    ['soft 12 hits', ['A', 'A'], '6', false, STRATEGY_ACTIONS.hit],
  ])(
    'handles soft totals: %s',
    (_, playerCards, upcard, dealerHitsOnSoft17, action) => {
      expect(
        getBasicStrategyRecommendation({
          playerHand: { cards: playerCards.map((value) => card(value)) },
          dealerHand: dealer('10', upcard),
          canDouble: true,
          dealerHitsOnSoft17,
        }).action
      ).toBe(action);
    }
  );

  it.each([
    ['hard 17 stands', ['10', '7'], '10', false, STRATEGY_ACTIONS.stand],
    [
      'hard 13 stands against 6',
      ['10', '3'],
      '6',
      false,
      STRATEGY_ACTIONS.stand,
    ],
    ['hard 13 hits against 7', ['10', '3'], '7', false, STRATEGY_ACTIONS.hit],
    [
      'hard 12 stands against 4',
      ['10', '2'],
      '4',
      false,
      STRATEGY_ACTIONS.stand,
    ],
    ['hard 12 hits against 3', ['10', '2'], '3', false, STRATEGY_ACTIONS.hit],
    [
      'hard 11 hits against ace on S17',
      ['6', '5'],
      'A',
      false,
      STRATEGY_ACTIONS.hit,
    ],
    [
      'hard 11 doubles against ace on H17',
      ['6', '5'],
      'A',
      true,
      STRATEGY_ACTIONS.double,
    ],
    [
      'hard 10 doubles against 9',
      ['6', '4'],
      '9',
      false,
      STRATEGY_ACTIONS.double,
    ],
    ['hard 10 hits against 10', ['6', '4'], '10', false, STRATEGY_ACTIONS.hit],
    [
      'hard 9 doubles against 3',
      ['5', '4'],
      '3',
      false,
      STRATEGY_ACTIONS.double,
    ],
    ['hard 9 hits against 2', ['5', '4'], '2', false, STRATEGY_ACTIONS.hit],
    ['hard 8 hits', ['5', '3'], '6', false, STRATEGY_ACTIONS.hit],
    [
      'ace-adjusted hard 15 hits',
      ['A', '9', '5'],
      '10',
      false,
      STRATEGY_ACTIONS.hit,
    ],
  ])(
    'handles hard totals: %s',
    (_, playerCards, upcard, dealerHitsOnSoft17, action) => {
      expect(
        getBasicStrategyRecommendation({
          playerHand: { cards: playerCards.map((value) => card(value)) },
          dealerHand: dealer('10', upcard),
          canDouble: true,
          dealerHitsOnSoft17,
        }).action
      ).toBe(action);
    }
  );
});

describe('getInsuranceStrategyRecommendation', () => {
  it('recommends declining insurance when the decision is pending', () => {
    expect(getInsuranceStrategyRecommendation(true)).toEqual({
      action: STRATEGY_ACTIONS.noInsurance,
      summary: 'Dealer Ace upcard',
    });
  });

  it('does not recommend anything when insurance is not pending', () => {
    expect(getInsuranceStrategyRecommendation(false)).toBeNull();
  });
});

describe('getStrategyButtonClass', () => {
  it('only highlights the matching recommended action', () => {
    const recommendation = { action: STRATEGY_ACTIONS.hit };

    expect(getStrategyButtonClass(recommendation, STRATEGY_ACTIONS.hit)).toBe(
      'recommended-action'
    );
    expect(getStrategyButtonClass(recommendation, STRATEGY_ACTIONS.stand)).toBe(
      ''
    );
    expect(getStrategyButtonClass(null, STRATEGY_ACTIONS.hit)).toBe('');
  });
});
