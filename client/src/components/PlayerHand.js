import React from 'react';
import '../styles/PlayerHand.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';

const PlayerHand = ({ hand, isActive, showBet = false }) => {
    // legacy support or new structure check
    const cards = hand.cards || hand;
    const bet = hand.bet || 0;
    const outcome = hand.outcome;

    const total = calculateTotal(cards);

    return (
        <div className={`player-hand ${isActive ? 'active-hand' : ''} ${outcome ? `outcome-${outcome.toLowerCase()}` : ''}`}>
            {outcome && (
                <div className={`outcome-badge badge-${outcome.toLowerCase()}`}>
                    {outcome}
                </div>
            )}
            <div className="hand-header">
                {showBet && <span className="hand-bet">Bet: ${bet}</span>}
                <span className="hand-total">{total}</span>
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