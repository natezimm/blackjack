import React from 'react';

const PlayerHand = ({ hand }) => {
    return (
        <div>
            <h2>Player's Hand</h2>
            {hand.map((card, index) => (
                <div key={index}>
                    {card.value} of {card.suit}
                </div>
            ))}
        </div>
    );
};

export default PlayerHand;