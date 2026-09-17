import React, { useId, useLayoutEffect, useRef } from 'react';
import CardShoe from './CardShoe';
import { useTableDealMotion, useTableReducedMotion } from './CardMotion';
import {
  CARD_DEAL_DURATION_MS,
  CARD_FLIP_DURATION_MS,
  CARD_PUSH_EASING,
  CARD_SWEEP_DURATION_MS,
  DEALER_FLIP_GESTURE_MS,
  DEALER_REACH_MS,
} from '../constants/motionTiming';
import dealerHand from '../assets/dealer/dealer-hand-cartoon.png';
import dealerHandMask from '../assets/dealer/dealer-hand.png';
import '../styles/DealerScene.css';

const DealerScene = ({
  dealPulse = 0,
  revealPulse = 0,
  collecting = false,
  cardBackColor = 'red',
}) => {
  const sceneId = useId().replace(/:/g, '');
  const paint = (name) => `url(#${sceneId}-${name})`;
  const restingArmRef = useRef(null);
  const dealingArmRef = useRef(null);
  const lastRevealPulseRef = useRef(revealPulse);
  const reducedMotion = useTableReducedMotion();
  const latestDealRef = useTableDealMotion();

  useLayoutEffect(() => {
    const arm = dealingArmRef.current;
    if (!dealPulse || !arm) return;

    const scene = arm.closest('.dealer-scene');
    const contact = arm.querySelector('[data-dealer-deal-contact]');
    const pickup = scene?.querySelector('[data-card-shoe]');
    const exit = scene?.querySelector('[data-card-shoe-exit]');
    if (!contact || !pickup || !exit) return;

    // Each keyed arm starts at rest. Measure again on every draw so the reach
    // follows the shoe after responsive layout changes, including a resize.
    const fingertip = contact.getBoundingClientRect();
    const setTarget = (name, target) => {
      const x = target.x - fingertip.left - fingertip.width / 2;
      const y = target.y - fingertip.top - fingertip.height / 2;
      arm.style.setProperty(`--dealer-${name}-x`, `${x.toFixed(2)}px`);
      arm.style.setProperty(`--dealer-${name}-y`, `${y.toFixed(2)}px`);
    };
    const center = (marker) => {
      const rect = marker.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const pickupPoint = center(pickup);
    const handoffPoint = center(exit);
    setTarget('pickup', pickupPoint);
    setTarget('handoff', handoffPoint);
    setTarget('release', latestDealRef?.current?.release || handoffPoint);
  }, [dealPulse, latestDealRef]);

  useLayoutEffect(() => {
    const newReveal = revealPulse !== lastRevealPulseRef.current;
    lastRevealPulseRef.current = revealPulse;
    const arm = restingArmRef.current;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (
      !newReveal ||
      !revealPulse ||
      reducedMotion ||
      preference?.matches ||
      !arm?.animate
    ) {
      return undefined;
    }

    const holeCard = arm
      .closest('.table-surface')
      ?.querySelector('[data-dealer-hole-card]');
    const contact = arm.querySelector('[data-dealer-flip-contact]');
    if (!holeCard || !contact) return undefined;

    const target = holeCard.getBoundingClientRect();
    const fingertip = contact.getBoundingClientRect();
    const x =
      target.left + target.width * 0.08 - fingertip.left - fingertip.width / 2;
    const y =
      target.top + target.height * 0.38 - fingertip.top - fingertip.height / 2;
    const pose = (dx, dy, angle = 0) =>
      `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${angle}deg)`;
    const animation = arm.animate(
      [
        {
          transform: pose(0, 0),
          filter: 'drop-shadow(1px 3px 1px #1b0b1640)',
          offset: 0,
          easing: 'cubic-bezier(0.22, 0.68, 0.28, 1)',
        },
        {
          transform: pose(x, y),
          filter: 'drop-shadow(1px 2px 1px #1b0b1659)',
          offset: DEALER_REACH_MS / DEALER_FLIP_GESTURE_MS,
          easing: 'ease-in-out',
        },
        {
          transform: pose(x + target.width * 0.44, y - 6, -8),
          filter: 'drop-shadow(2px 6px 3px #1b0b163b)',
          offset:
            (DEALER_REACH_MS + CARD_FLIP_DURATION_MS / 2) /
            DEALER_FLIP_GESTURE_MS,
          easing: 'ease-in-out',
        },
        {
          transform: pose(x + target.width * 0.62, y + 2, 5),
          filter: 'drop-shadow(1px 2px 1px #1b0b1659)',
          offset:
            (DEALER_REACH_MS + CARD_FLIP_DURATION_MS) / DEALER_FLIP_GESTURE_MS,
          easing: 'cubic-bezier(0.4, 0, 0.25, 1)',
        },
        {
          transform: pose(0, 0),
          filter: 'drop-shadow(1px 3px 1px #1b0b1640)',
          offset: 1,
        },
      ],
      { duration: DEALER_FLIP_GESTURE_MS, easing: 'linear' }
    );

    const stopForReducedMotion = () => {
      if (preference.matches) animation.cancel();
    };
    preference?.addEventListener?.('change', stopForReducedMotion);
    return () => {
      animation.cancel();
      preference?.removeEventListener?.('change', stopForReducedMotion);
    };
  }, [revealPulse, reducedMotion]);

  return (
    <div
      className={`dealer-scene${collecting ? ' is-collecting' : ''}`}
      data-deal-pulse={dealPulse}
      data-reveal-pulse={revealPulse}
      aria-hidden="true"
      style={{
        '--dealer-hand-mask': `url(${dealerHandMask})`,
        '--dealer-deal-duration': `${CARD_DEAL_DURATION_MS}ms`,
        '--dealer-push-easing': CARD_PUSH_EASING,
        '--dealer-sweep-duration': `${CARD_SWEEP_DURATION_MS}ms`,
      }}
    >
      <div className="dealer-chip-tray">
        <svg viewBox="0 0 142 44" focusable="false">
          <defs>
            <linearGradient id={`${sceneId}-tray`} x2="0" y2="1">
              <stop stopColor="#242226" />
              <stop offset="1" stopColor="#100f12" />
            </linearGradient>
          </defs>
          <rect
            x="1"
            y="4"
            width="140"
            height="38"
            rx="8"
            fill="#220f16"
            opacity=".35"
          />
          <rect
            x="1"
            y="1"
            width="140"
            height="37"
            rx="7"
            fill={paint('tray')}
            stroke="#9b815a"
          />
          {/* Match the player's $5, $10, $25, and $100 chips, in that order. */}
          {['#b53620', '#286bac', '#218342', '#292826'].map((color, index) => (
            <g key={color} transform={`translate(${15 + index * 30} 7)`}>
              <rect width="22" height="24" rx="4" fill="#080a0c" />
              {[0, 1, 2, 3, 4].map((chip) => (
                <g key={chip} transform={`translate(0 ${chip * 4})`}>
                  <path
                    d="M1 3Q11-2 21 3V6Q11 10 1 6Z"
                    fill={color}
                    stroke="#151516"
                    strokeWidth=".7"
                  />
                  <path
                    d="M5 3V6M17 3V6"
                    stroke="#fff4d8"
                    strokeWidth="2"
                    opacity=".7"
                  />
                  <path
                    d="M3 3Q11 0 19 3"
                    fill="none"
                    stroke="#fff4d8"
                    strokeWidth=".6"
                    opacity=".45"
                  />
                </g>
              ))}
            </g>
          ))}
          <path d="M7 34H135" stroke="#b79a6e" strokeOpacity=".45" />
        </svg>
      </div>

      <span className="dealer-collection-point" data-card-collection="true" />
      <div className="dealer-hands">
        <div
          className="dealer-resting-arm"
          ref={restingArmRef}
          data-dealer-flip-hand="true"
        >
          <img src={dealerHand} alt="" draggable="false" />
          <span
            className="dealer-flip-contact"
            data-dealer-flip-contact="true"
          />
        </div>
        <div
          key={dealPulse}
          ref={dealingArmRef}
          className={`dealer-dealing-arm${dealPulse > 0 ? ' is-dealing' : ''}`}
        >
          <img src={dealerHand} alt="" draggable="false" />
          <span
            className="dealer-deal-contact"
            data-dealer-deal-contact="true"
          />
        </div>
      </div>
      <div className="dealer-card-shoe">
        <CardShoe dealPulse={dealPulse} cardBackColor={cardBackColor} />
      </div>
    </div>
  );
};

export default DealerScene;
