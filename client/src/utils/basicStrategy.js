export const STRATEGY_ACTIONS = {
  hit: 'HIT',
  stand: 'STAND',
  double: 'DOUBLE',
  split: 'SPLIT',
  noInsurance: 'NO_INSURANCE',
};

const faceCards = new Set(['10', 'J', 'Q', 'K']);

export const getVisibleDealerUpcard = (dealerHand) => {
  if (!Array.isArray(dealerHand) || dealerHand.length < 2) {
    return null;
  }

  return dealerHand[1];
};

export const getCardStrategyValue = (card) => {
  if (!card || !card.value) return null;
  if (card.value === 'A') return 11;
  if (faceCards.has(card.value)) return 10;
  return parseInt(card.value, 10);
};

const getHandDetails = (cards) => {
  let total = 0;
  let aces = 0;

  cards.forEach((card) => {
    if (card.value === 'A') {
      aces += 1;
      total += 11;
    } else if (faceCards.has(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value, 10);
    }
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return {
    total,
    isSoft: aces > 0,
  };
};

const doubleOr = (fallbackAction, canDouble) =>
  canDouble ? STRATEGY_ACTIONS.double : fallbackAction;

const getPairAction = ({ pairValue, dealerValue, canSplit }) => {
  if (!canSplit) return null;

  if (pairValue === 11 || pairValue === 8) return STRATEGY_ACTIONS.split;
  if (pairValue === 10) return STRATEGY_ACTIONS.stand;
  if (pairValue === 9) {
    return [2, 3, 4, 5, 6, 8, 9].includes(dealerValue)
      ? STRATEGY_ACTIONS.split
      : STRATEGY_ACTIONS.stand;
  }
  if (pairValue === 7) {
    return dealerValue <= 7 ? STRATEGY_ACTIONS.split : STRATEGY_ACTIONS.hit;
  }
  if (pairValue === 6) {
    return dealerValue >= 2 && dealerValue <= 6
      ? STRATEGY_ACTIONS.split
      : STRATEGY_ACTIONS.hit;
  }
  if (pairValue === 4) {
    return dealerValue === 5 || dealerValue === 6
      ? STRATEGY_ACTIONS.split
      : STRATEGY_ACTIONS.hit;
  }
  if (pairValue === 3 || pairValue === 2) {
    return dealerValue <= 7 ? STRATEGY_ACTIONS.split : STRATEGY_ACTIONS.hit;
  }

  return null;
};

const getSoftAction = ({
  total,
  dealerValue,
  canDouble,
  dealerHitsOnSoft17,
}) => {
  if (total >= 20) return STRATEGY_ACTIONS.stand;

  if (total === 19) {
    if (dealerHitsOnSoft17 && dealerValue === 6) {
      return doubleOr(STRATEGY_ACTIONS.stand, canDouble);
    }
    return STRATEGY_ACTIONS.stand;
  }

  if (total === 18) {
    const doubleValues = dealerHitsOnSoft17 ? [2, 3, 4, 5, 6] : [3, 4, 5, 6];
    if (doubleValues.includes(dealerValue)) {
      return doubleOr(STRATEGY_ACTIONS.stand, canDouble);
    }
    if (dealerValue === 2 || dealerValue === 7 || dealerValue === 8) {
      return STRATEGY_ACTIONS.stand;
    }
    return STRATEGY_ACTIONS.hit;
  }

  if (total === 17) {
    return [3, 4, 5, 6].includes(dealerValue)
      ? doubleOr(STRATEGY_ACTIONS.hit, canDouble)
      : STRATEGY_ACTIONS.hit;
  }

  if (total === 15 || total === 16) {
    return [4, 5, 6].includes(dealerValue)
      ? doubleOr(STRATEGY_ACTIONS.hit, canDouble)
      : STRATEGY_ACTIONS.hit;
  }

  if (total === 13 || total === 14) {
    return [5, 6].includes(dealerValue)
      ? doubleOr(STRATEGY_ACTIONS.hit, canDouble)
      : STRATEGY_ACTIONS.hit;
  }

  return STRATEGY_ACTIONS.hit;
};

const getHardAction = ({
  total,
  dealerValue,
  canDouble,
  dealerHitsOnSoft17,
}) => {
  if (total >= 17) return STRATEGY_ACTIONS.stand;
  if (total >= 13) {
    return dealerValue >= 2 && dealerValue <= 6
      ? STRATEGY_ACTIONS.stand
      : STRATEGY_ACTIONS.hit;
  }
  if (total === 12) {
    return dealerValue >= 4 && dealerValue <= 6
      ? STRATEGY_ACTIONS.stand
      : STRATEGY_ACTIONS.hit;
  }
  if (total === 11) {
    const shouldDouble = dealerValue !== 11 || dealerHitsOnSoft17;
    return shouldDouble
      ? doubleOr(STRATEGY_ACTIONS.hit, canDouble)
      : STRATEGY_ACTIONS.hit;
  }
  if (total === 10) {
    return dealerValue >= 2 && dealerValue <= 9
      ? doubleOr(STRATEGY_ACTIONS.hit, canDouble)
      : STRATEGY_ACTIONS.hit;
  }
  if (total === 9) {
    return dealerValue >= 3 && dealerValue <= 6
      ? doubleOr(STRATEGY_ACTIONS.hit, canDouble)
      : STRATEGY_ACTIONS.hit;
  }

  return STRATEGY_ACTIONS.hit;
};

const formatDealerValue = (value) => (value === 11 ? 'A' : `${value}`);

const formatPairValue = (value) => {
  if (value === 11) return 'Aces';
  if (value === 10) return '10s';
  return `${value}s`;
};

const getRecommendationSummary = ({
  cards,
  dealerValue,
  isPair,
  pairValue,
}) => {
  const dealerLabel = formatDealerValue(dealerValue);
  if (isPair) {
    return `Pair ${formatPairValue(pairValue)} vs dealer ${dealerLabel}`;
  }

  const { total, isSoft } = getHandDetails(cards);
  return `${isSoft ? 'Soft' : 'Hard'} ${total} vs dealer ${dealerLabel}`;
};

export const getBasicStrategyRecommendation = ({
  playerHand,
  dealerHand,
  canDouble = false,
  canSplit = false,
  dealerHitsOnSoft17 = false,
} = {}) => {
  const cards = playerHand?.cards || playerHand || [];
  const dealerUpcard = getVisibleDealerUpcard(dealerHand);

  if (!Array.isArray(cards) || cards.length < 2 || !dealerUpcard) {
    return null;
  }

  const dealerValue = getCardStrategyValue(dealerUpcard);
  if (!dealerValue) return null;

  const firstCardValue = getCardStrategyValue(cards[0]);
  const secondCardValue = getCardStrategyValue(cards[1]);
  const isPair =
    cards.length === 2 &&
    firstCardValue !== null &&
    firstCardValue === secondCardValue;

  let action = null;
  let summaryUsesPair = false;
  if (isPair) {
    action = getPairAction({
      pairValue: firstCardValue,
      dealerValue,
      canSplit,
    });
    summaryUsesPair = action !== null;
  }

  if (!action) {
    const details = getHandDetails(cards);
    action = details.isSoft
      ? getSoftAction({
          total: details.total,
          dealerValue,
          canDouble,
          dealerHitsOnSoft17,
        })
      : getHardAction({
          total: details.total,
          dealerValue,
          canDouble,
          dealerHitsOnSoft17,
        });
  }

  return {
    action,
    summary: getRecommendationSummary({
      cards,
      dealerValue,
      isPair: summaryUsesPair,
      pairValue: firstCardValue,
    }),
  };
};

export const getInsuranceStrategyRecommendation = (
  insuranceDecisionPending
) => {
  if (!insuranceDecisionPending) return null;

  return {
    action: STRATEGY_ACTIONS.noInsurance,
    summary: 'Dealer Ace upcard',
  };
};

export const getStrategyButtonClass = (recommendation, action) => {
  if (!recommendation || recommendation.action !== action) return '';
  return 'recommended-action';
};
