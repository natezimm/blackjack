import React from 'react';
import '../styles/Card.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';

const DealerHand = ({ hand, reveal, cardBackColor = 'red' }) => {

    const total = reveal ? calculateTotal(hand) : '?';
    const cardBackSrc = `/card-images/card_back_${cardBackColor}.png`;

    return (
        <div className="dealer-hand">
            <div className="hand-header">
                <h2>Dealer</h2>
                <span className="hand-total">{total}</span>
            </div>
            <div className="hand">
                {hand.map((card, index) => {
                    if (index === 0) {
                        return (
                            <div className="card-container" key={index}>
                                <div className={`card-inner ${reveal ? 'flipped' : ''} ${!reveal ? 'no-flip-transition' : ''}`}>
                                    <div className="card-back">
                                        <img src={cardBackSrc} alt="Card Back" style={{ width: '100%', height: '100%', borderRadius: '5px' }} />
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
