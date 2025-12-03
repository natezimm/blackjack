import React from 'react';
import '../styles/Card.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';

const DealerHand = ({ hand, reveal }) => {

    const total = reveal ? calculateTotal(hand) : '?';

    return (
        <div className="dealer-hand">
            <h2>Dealer's Hand (Total: {total})</h2>
            <div className="hand">
                {hand.map((card, index) => {
                    if (index === 0) {
                        return (
                            <div className="card-container" key={index}>
                                <div className={`card-inner ${reveal ? 'flipped' : ''}`}>
                                    <div className="card-back">
                                        <img src="/card-images/card_back_red.png" alt="Card Back" style={{ width: '100%', height: '100%', borderRadius: '5px' }} />
                                    </div>
                                    <div className="card-front">
                                        <img
                                            src={getCardImage(card.value, card.suit)}
                                            alt={`${card.value} of ${card.suit}`}
                                            style={{ width: '100%', height: '100%', borderRadius: '5px' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <img
                                key={index}
                                src={getCardImage(card.value, card.suit)}
                                alt={`${card.value} of ${card.suit}`}
                                className="card"
                            />
                        );
                    }
                })}
            </div>
        </div>
    );
};

export default DealerHand;