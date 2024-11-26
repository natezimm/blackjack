import React from 'react';

const DealerHand = ({ hand }) => {
    return (
        <div>
            <h2>Dealer's Hand</h2>
            {hand.map((card, index) => (
                <div key={index}>
                    {card.value} of {card.suit}
                </div>
            ))}
        </div>
    );
};

export default DealerHand;