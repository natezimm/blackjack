import React from 'react';
import '../styles/PlayerHand.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';

const PlayerHand = ({ hand, isActive, showBet = false, isPlaceholder = false }) => {
    const cards = hand.cards || hand;
    const bet = hand.bet || 0;
    const outcome = hand.outcome;

    const total = calculateTotal(cards);

    return (
        <div className={`player-hand ${isActive || isPlaceholder ? 'active-hand' : ''} ${outcome ? `outcome-${outcome.toLowerCase()}` : ''}`}>
            {(outcome || hand.isBusted) && (
                <div className={`outcome-badge badge-${hand.isBusted ? 'busted' : outcome.toLowerCase()}`}>
                    {hand.isBusted ? 'BUSTED' : outcome}
                </div>
            )}
            <div className="hand-header">
                {showBet && <span className="hand-bet">Bet: ${bet}</span>}
                {(cards.length > 0 || isPlaceholder) && <span className="hand-total">{cards.length > 0 ? total : 0}</span>}
            </div>
            <div className="hand">
                {cards.map((card, index) => (
                    <img
                        key={index}
                        src={getCardImage(card.value, card.suit)}
                        alt={`${card.value} of ${card.suit}`}
                        className="card"
                    />
                ))}
            </div>
        </div>
    );
};

export default PlayerHand;
