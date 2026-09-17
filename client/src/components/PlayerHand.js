import React from 'react';
import '../styles/PlayerHand.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';
import CardMotion, { useTableReducedMotion } from './CardMotion';

const PlayerHand = ({
  hand,
  showBet = false,
  isPlaceholder = false,
  isActive = false,
  isSplit = false,
  replacementDealDelay = 0,
}) => {
  const reducedMotion = useTableReducedMotion();
  const cards = hand.cards || hand;
  const bet = hand.bet || 0;
  const outcome = hand.outcome;

  const total = calculateTotal(cards);

  return (
    <div
      className={`player-hand ${isActive ? 'is-active' : ''} ${isSplit ? 'is-split' : ''} ${outcome ? `outcome-${outcome.toLowerCase()}` : ''}`.trim()}
      data-reduced-motion={reducedMotion}
    >
      <div className="hand">
        {cards.map((card, index) => (
          <CardMotion
            key={`${index}-${card.value}-${card.suit}`}
            skipEntrance={isSplit && index === 0}
            entranceDelay={isSplit && index === 1 ? replacementDealDelay : 0}
          >
            <img
              src={getCardImage(card.value, card.suit)}
              alt={`${card.value} of ${card.suit}`}
              className="card"
            />
          </CardMotion>
        ))}
        {isPlaceholder && cards.length === 0 && (
          <div className="empty-hand" aria-live="polite">
            <div className="empty-card-pair" aria-hidden="true">
              <span className="empty-card">
                <span>♠</span>
              </span>
              <span className="empty-card">
                <span>♠</span>
              </span>
            </div>
            <p>Choose your wager, then deal.</p>
          </div>
        )}
      </div>
      <div className="hand-header">
        <h2>Your Hand</h2>
        {showBet && <span className="hand-bet">Bet: ${bet}</span>}
        {(cards.length > 0 || isPlaceholder) && (
          <span className="hand-total">{cards.length > 0 ? total : 0}</span>
        )}
        {isActive && <span className="hand-turn">Your turn</span>}
      </div>
      {(outcome || hand.isBusted) && (
        <div
          className={`outcome-badge badge-${hand.isBusted ? 'busted' : outcome.toLowerCase()}`}
        >
          {hand.isBusted ? 'BUSTED' : outcome}
        </div>
      )}
    </div>
  );
};

export default PlayerHand;
