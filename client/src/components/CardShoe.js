import React from 'react';
import { SHOE_EXTRACTION_MS } from '../constants/motionTiming';
import '../styles/CardShoe.css';

const CardShoe = ({ dealPulse = 0, cardBackColor = 'red' }) => {
  const cardBack = `/card-images/card_back_${cardBackColor}.png`;

  return (
    <div
      className="card-shoe"
      data-shoe-pulse={dealPulse}
      aria-hidden="true"
      style={{ '--shoe-extraction-duration': `${SHOE_EXTRACTION_MS}ms` }}
    >
      <div className="shoe-body" />
      <div className="shoe-card-well" />
      <div className="shoe-lower-opening" />
      <div className="shoe-paper-stack" />

      <div
        key={dealPulse}
        className={`shoe-card-feed${dealPulse > 0 ? ' is-extracting' : ''}`}
      >
        <img
          className="shoe-next-card"
          data-shoe-card="true"
          src={cardBack}
          alt=""
          draggable="false"
        />
        <img
          className="shoe-extracted-card"
          src={cardBack}
          alt=""
          draggable="false"
        />
      </div>

      <div className="shoe-side-rail shoe-side-rail-left" />
      <div className="shoe-side-rail shoe-side-rail-right" />
      <div className="shoe-back-stop" />
      <div className="shoe-pressure-bar" />
      <div className="shoe-front-foot shoe-front-foot-left" />
      <div className="shoe-front-foot shoe-front-foot-right" />
      <span className="shoe-brass-pin shoe-brass-pin-left" />
      <span className="shoe-brass-pin shoe-brass-pin-right" />
      <span className="shoe-mouth-marker" data-card-shoe="true" />
      <span className="shoe-exit-marker" data-card-shoe-exit="true" />
    </div>
  );
};

export default CardShoe;
