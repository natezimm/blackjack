import React from 'react';

const PlayerHand = ({ hand }) => {
    const getCardImage = (value, suit) => {
        // Construct the filename dynamically based on card value and suit
        const fileName = `${value.toLowerCase()}_of_${suit.toLowerCase()}.png`;
        return `/card-images/${fileName}`; // Path relative to the public folder
    };

    return (
        <div>
            <h2>Player's Hand</h2>
            <div className="hand">
                {hand.map((card, index) => (
                    <div key={index} className="card">
                        <img
                            src={getCardImage(card.value, card.suit)}
                            alt={`${card.value} of ${card.suit}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerHand;