import React from 'react';
import { CARD_SWEEP_DURATION_MS } from '../constants/motionTiming';

export const captureCardsForCollection = (table) => {
  if (!table) return [];
  const target = table.querySelector('[data-card-collection]');
  if (!target) return [];
  const tableRect = table.getBoundingClientRect();
  const collection = target.getBoundingClientRect();
  return Array.from(
    table.querySelectorAll('.hand .card, .hand .card-container')
  ).map((card, index) => {
    const rect = card.getBoundingClientRect();
    const front = card.querySelector('.card-inner.flipped .card-front img');
    const image =
      card.tagName === 'IMG'
        ? card
        : front || card.querySelector('.card-back img');
    return {
      id: index,
      src: image.src,
      style: {
        left: rect.x - tableRect.x - table.clientLeft,
        top: rect.y - tableRect.y - table.clientTop,
        width: rect.width,
        height: rect.height,
        '--collection-x': `${collection.x + collection.width / 2 - rect.x - rect.width / 2}px`,
        '--collection-y': `${collection.y + collection.height / 2 - rect.y - rect.height / 2}px`,
      },
    };
  });
};

const CardSweep = ({ cards }) => (
  <div
    className="card-sweep"
    aria-hidden="true"
    style={{ '--card-sweep-duration': `${CARD_SWEEP_DURATION_MS}ms` }}
  >
    {cards.map((card) => (
      <img key={card.id} src={card.src} style={card.style} alt="" />
    ))}
  </div>
);

export default CardSweep;
