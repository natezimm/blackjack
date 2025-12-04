import React from 'react';
import '../styles/PlayerHand.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';

const PlayerHand = ({ hand }) => {

    const total = calculateTotal(hand);

    return (
        <div className="player-hand">
            <div className="hand-header">
                <h2>You</h2>
                <span className="hand-total">{total}</span>
            </div>
            <div className="hand">
                {hand.map((card, index) => (
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