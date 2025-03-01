import React from 'react';
import '../styles/DealerHand.css';

const calculateTotal = (hand) => {
    let total = 0;
    let aces = 0;

    hand.forEach(card => {
        if (card.value === 'A') {
            aces += 1;
            total += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            total += 10;
        } else {
            total += parseInt(card.value, 10);
        }
    });

    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }

    return total;
};

const DealerHand = ({ hand, reveal }) => {
    const getCardImage = (value, suit) => {
        const fileName = `${value.toLowerCase()}_of_${suit.toLowerCase()}.png`;
        return `/card-images/${fileName}`;
    };

    const total = reveal ? calculateTotal(hand) : '?';

    return (
        <div className="dealer-hand">
            <h2>Dealer's Hand (Total: {total})</h2>
            <div className="hand">
                {hand.map((card, index) => (
                    <img
                        key={index}
                        src={
                            index === 0 && !reveal
                                ? '/card-images/card_back_red.png'
                                : getCardImage(card.value, card.suit)
                        }
                        alt={
                            index === 0 && !reveal
                                ? 'Card Back'
                                : `${card.value} of ${card.suit}`
                        }
                        className="card"
                    />
                ))}
            </div>
        </div>
    );
};

export default DealerHand;