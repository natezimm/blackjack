import React from 'react';
import '../styles/Card.css';
import { calculateTotal, getCardImage } from '../utils/cardUtils';
import CardMotion from './CardMotion';
import { CARD_FLIP_DURATION_MS } from '../constants/motionTiming';

const DealerHand = ({
  hand,
  reveal,
  showTotal = reveal,
  cardBackColor = 'red',
}) => {
  const total = showTotal ? calculateTotal(hand) : '?';
  const cardBackSrc = `/card-images/card_back_${cardBackColor}.png`;

  return (
    <div className="dealer-hand">
      <div className="hand-header">
        <h2>Dealer</h2>
        <span className="hand-total">{total}</span>
      </div>
      <div className="hand">
        {hand.length === 0 && (
          <div className="empty-card-pair" aria-hidden="true">
            <span className="empty-card empty-card--back">
              <span>21</span>
            </span>
            <span className="empty-card empty-card--back">
              <span>21</span>
            </span>
          </div>
        )}
        {hand.map((card, index) => {
          if (index === 0) {
            return (
              <CardMotion key={index}>
                <div
                  className="card-container"
                  data-dealer-hole-card=""
                  style={{
                    '--card-flip-duration': `${CARD_FLIP_DURATION_MS}ms`,
                  }}
                >
                  <div
                    className={`card-inner ${reveal ? 'flipped' : ''} ${!reveal ? 'no-flip-transition' : ''}`}
                  >
                    <div className="card-back" aria-hidden={reveal}>
                      <img src={cardBackSrc} alt="Card Back" />
                    </div>
                    <div className="card-front" aria-hidden={!reveal}>
                      <img
                        src={getCardImage(card.value, card.suit)}
                        alt={`${card.value} of ${card.suit}`}
                      />
                    </div>
                  </div>
                </div>
              </CardMotion>
            );
          } else {
            return (
              <CardMotion key={index}>
                <img
                  src={getCardImage(card.value, card.suit)}
                  alt={`${card.value} of ${card.suit}`}
                  className="card"
                />
              </CardMotion>
            );
          }
        })}
      </div>
    </div>
  );
};

export default DealerHand;
