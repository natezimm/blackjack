import React from 'react';
import '../styles/CardShoe.css';

const CardShoe = ({ cardBackColor = 'red', isDealing = false }) => {
  const cardBack = `/card-images/card_back_${cardBackColor}.png`;

  return (
    <div
      className={`table-card-shoe${isDealing ? ' is-dealing' : ''}`}
      aria-hidden="true"
      data-testid="table-card-shoe"
    >
      <div className="shoe-accent-body">
        <div className="shoe-accent-well">
          <div className="shoe-accent-cards" />
          <img
            className="shoe-accent-top-card"
            src={cardBack}
            alt=""
            draggable="false"
          />
        </div>
        <div className="shoe-accent-lip" />
        <div className="shoe-accent-roller" />
      </div>
    </div>
  );
};

export default React.memo(CardShoe);
