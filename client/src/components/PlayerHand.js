import React from 'react';
import '../styles/PlayerHand.css';

const PlayerHand = ({ hand }) => {
    const getCardImage = (value, suit) => {
        const fileName = `${value.toLowerCase()}_of_${suit.toLowerCase()}.png`;
        return `/card-images/${fileName}`;
    };

    return (
        <div className="player-hand">
            <h2>Player's Hand</h2>
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