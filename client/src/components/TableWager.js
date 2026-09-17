import React, { useLayoutEffect, useRef } from 'react';
import chip5 from '../assets/chips/chip-5-small.png';
import chip10 from '../assets/chips/chip-10-small.png';
import chip25 from '../assets/chips/chip-25-small.png';
import chip100 from '../assets/chips/chip-100-small.png';
import { CHIP_FLIGHT_DURATION_MS } from '../constants/motionTiming';
import '../styles/TableWager.css';

const chipImages = { 5: chip5, 10: chip10, 25: chip25, 100: chip100 };

// Keep large bankrolls visually bounded; the caption always shows the full wager.
export const getChipStacks = (amount) => {
  let remaining = Math.max(0, amount);
  return [100, 25, 10, 5].flatMap((value) => {
    const count = Math.floor(remaining / value);
    remaining %= value;
    return count > 0 ? [{ value, count: Math.min(count, 5) }] : [];
  });
};

const ChipStacks = ({ amount }) => (
  <div className="felt-chip-stacks" aria-hidden="true">
    {getChipStacks(amount).map(({ value, count }) => (
      <div className="felt-chip-stack" key={value}>
        {Array.from({ length: count }, (_, index) => (
          <img
            key={index}
            className="felt-chip"
            src={chipImages[value]}
            alt=""
            style={{ '--chip-level': index }}
          />
        ))}
      </div>
    ))}
  </div>
);

const WagerFlight = ({ deposit, reducedMotion }) => {
  const flightRef = useRef(null);
  const reducedOnMountRef = useRef(reducedMotion);
  const animationRef = useRef(null);
  useLayoutEffect(() => {
    const chip = flightRef.current;
    if (reducedOnMountRef.current || !chip?.animate) return;
    const source = document.querySelector(
      `[data-chip-amount="${deposit.amount}"]`
    );
    if (!source) return;
    const from = source.getBoundingClientRect();
    const to = chip.getBoundingClientRect();
    const motion = chip.animate(
      [
        {
          transform: `translate(${from.x + from.width / 2 - to.x - to.width / 2}px, ${from.y + from.height / 2 - to.y - to.height / 2}px) rotate(-35deg) scale(1.25)`,
          opacity: 1,
        },
        {
          transform: 'translate(0, -8px) rotate(6deg)',
          opacity: 1,
          offset: 0.8,
        },
        { transform: 'translate(0, 0) rotate(0)', opacity: 0 },
      ],
      {
        duration: CHIP_FLIGHT_DURATION_MS,
        easing: 'cubic-bezier(.2,.7,.2,1)',
      }
    );
    animationRef.current = motion;
    return () => motion.cancel();
  }, [deposit]);
  useLayoutEffect(() => {
    if (reducedMotion) animationRef.current?.cancel();
  }, [reducedMotion]);
  return (
    <img
      ref={flightRef}
      src={chipImages[deposit.amount]}
      className="wager-flight"
      alt=""
      aria-hidden="true"
    />
  );
};

const TableWager = ({ amount, settlement, deposit, reducedMotion }) => {
  const settled = Boolean(settlement);
  const label = settled
    ? settlement.payout > 0
      ? `$${settlement.payout.toLocaleString()} returned`
      : `$${settlement.wager.toLocaleString()} collected`
    : amount > 0
      ? `$${amount.toLocaleString()} on the felt`
      : 'Place your wager';

  return (
    <div
      className={`table-wager ${settled ? 'has-settled' : ''} ${amount > 0 ? 'has-wager' : ''}`}
      data-settlement={settlement?.result}
    >
      <div className="wager-circle">
        <span className="wager-circle-mark" aria-hidden="true">
          ♠
        </span>
        {settled ? (
          <div className="wager-settlement" key={settlement.id}>
            <div className="wager-collection">
              <ChipStacks amount={settlement.wager} />
            </div>
            {settlement.payout > 0 && (
              <div className="wager-return">
                <ChipStacks amount={settlement.payout} />
              </div>
            )}
          </div>
        ) : (
          <ChipStacks amount={amount} />
        )}
        {deposit && !settled && (
          <WagerFlight
            key={deposit.id}
            deposit={deposit}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
      <span className="felt-wager-label" aria-live="polite">
        {label}
      </span>
    </div>
  );
};

export default TableWager;
