import React from 'react';
import '../styles/PlayerHand.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';

const PlayerHand = ({ hand }) => {

    const total = calculateTotal(hand);

    return (
        <div className="player-hand">
            <h2>Player's Hand (Total: {total})</h2>
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