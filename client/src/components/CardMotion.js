import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  CARD_DEAL_DURATION_MS,
  CARD_GLIDE_EASING,
  CARD_PUSH_EASING,
  CARD_RELEASE_MS,
  CARD_TURNOVER_DURATION_MS,
  SHOE_EXTRACTION_MS,
} from '../constants/motionTiming';

export { CARD_DEAL_DURATION_MS, SHOE_EXTRACTION_MS };

const TableMotionContext = createContext({
  notifyDeal: () => {},
  latestDealRef: { current: null },
  cardBackColor: 'red',
  reducedMotion: false,
});

export const useTableReducedMotion = () =>
  useContext(TableMotionContext).reducedMotion;

export const useTableDealMotion = () =>
  useContext(TableMotionContext).latestDealRef;

export const TableMotionProvider = ({
  children,
  onDeal,
  reducedMotion = false,
  cardBackColor = 'red',
}) => {
  const onDealRef = useRef(onDeal);
  const latestDealRef = useRef(null);
  onDealRef.current = onDeal;

  const notifyDeal = useCallback((motion) => {
    latestDealRef.current = motion;
    onDealRef.current?.();
  }, []);
  const value = useMemo(
    () => ({ notifyDeal, latestDealRef, reducedMotion, cardBackColor }),
    [notifyDeal, reducedMotion, cardBackColor]
  );

  return (
    <TableMotionContext.Provider value={value}>
      {children}
    </TableMotionContext.Provider>
  );
};

const CardMotion = ({
  children,
  skipEntrance = false,
  entranceDelay = 0,
  turnFaceUp = false,
}) => {
  const { notifyDeal, reducedMotion, cardBackColor } =
    useContext(TableMotionContext);
  const elementRef = useRef(null);
  const animationRef = useRef(null);
  const turnoverRef = useRef(null);
  const turnoverAnimationRef = useRef(null);
  const notifiedRef = useRef(false);
  const entranceDelayRef = useRef(entranceDelay);
  const dealTimerRef = useRef(null);
  const reducedOnMountRef = useRef(reducedMotion);
  const skipEntranceRef = useRef(skipEntrance);

  useLayoutEffect(() => {
    const motionPreference = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    );
    const element = elementRef.current;

    if (
      skipEntranceRef.current ||
      reducedOnMountRef.current ||
      motionPreference?.matches ||
      !element.animate
    ) {
      return undefined;
    }

    const table = element.closest('.table-surface');
    const shoeExit =
      table?.querySelector('[data-card-shoe-exit]') ||
      table?.querySelector('[data-card-shoe]');
    const destination = element.getBoundingClientRect();
    const origin = shoeExit?.getBoundingClientRect();
    const fromX = origin
      ? origin.left +
        origin.width / 2 -
        destination.left -
        destination.width / 2
      : 28;
    const fromY = origin
      ? origin.top +
        origin.height / 2 -
        destination.top -
        destination.height / 2
      : -75;
    const sourceScale =
      origin?.width > 0 && destination.width > 0
        ? origin.width / destination.width
        : 1;
    const handoffTransform = `translate(${fromX}px, ${fromY}px) scale(${sourceScale})`;
    const handoffOffset = SHOE_EXTRACTION_MS / CARD_DEAL_DURATION_MS;
    const armWidth =
      table?.querySelector('.dealer-dealing-arm')?.getBoundingClientRect()
        .width || 84;
    const travelDistance = Math.hypot(fromX, fromY);
    const pushDistance = Math.min(travelDistance * 0.22, armWidth * 0.85);
    const pushProgress = travelDistance > 0 ? pushDistance / travelDistance : 0;
    const releaseX = fromX * (1 - pushProgress);
    const releaseY = fromY * (1 - pushProgress);
    const releaseScale = sourceScale + (1 - sourceScale) * pushProgress;
    const release = {
      x: destination.left + destination.width / 2 + releaseX,
      y: destination.top + destination.height / 2 + releaseY,
    };

    // The shoe extracts its small card first. This card takes over at the same
    // bounds, shares a short push with the dealer, then glides to its recipient.
    // Motion stays on the outer wrapper so the inner card can still flip.
    const animation = element.animate(
      [
        {
          transform: handoffTransform,
          opacity: 0,
          zIndex: 12,
          offset: 0,
        },
        {
          transform: handoffTransform,
          opacity: 0,
          zIndex: 12,
          offset: handoffOffset,
        },
        {
          transform: handoffTransform,
          opacity: 1,
          zIndex: 12,
          offset: handoffOffset,
          easing: CARD_PUSH_EASING,
        },
        {
          transform: `translate(${releaseX}px, ${releaseY}px) scale(${releaseScale})`,
          opacity: 1,
          zIndex: 12,
          offset: CARD_RELEASE_MS / CARD_DEAL_DURATION_MS,
          easing: CARD_GLIDE_EASING,
        },
        {
          transform: 'translate(0, 0) scale(1)',
          opacity: 1,
          zIndex: 12,
          offset: 1,
        },
      ],
      {
        duration: CARD_DEAL_DURATION_MS,
        easing: 'linear',
        ...(entranceDelayRef.current > 0
          ? { delay: entranceDelayRef.current, fill: 'backwards' }
          : {}),
      }
    );
    animationRef.current = animation;

    // Match the shoe's back at handoff, then turn only the card surface.
    // The outer flight and its shared fingertip contact stay on the same path.
    const turnoverAnimation = turnoverRef.current?.animate(
      [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }],
      {
        duration: CARD_TURNOVER_DURATION_MS,
        delay: entranceDelayRef.current + SHOE_EXTRACTION_MS,
        easing: 'ease-in-out',
        fill: 'backwards',
      }
    );
    turnoverAnimationRef.current = turnoverAnimation;

    const beginDeal = () => {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        notifyDeal({ release });
      }
    };
    if (entranceDelayRef.current > 0) {
      dealTimerRef.current = setTimeout(beginDeal, entranceDelayRef.current);
    } else {
      beginDeal();
    }

    const stopForReducedMotion = () => {
      if (motionPreference.matches) {
        animation.cancel();
        turnoverAnimation?.cancel();
        clearTimeout(dealTimerRef.current);
      }
    };
    motionPreference?.addEventListener?.('change', stopForReducedMotion);

    return () => {
      animation.cancel();
      turnoverAnimation?.cancel();
      clearTimeout(dealTimerRef.current);
      motionPreference?.removeEventListener?.('change', stopForReducedMotion);
    };
  }, [notifyDeal]);

  useLayoutEffect(() => {
    if (reducedMotion) {
      animationRef.current?.cancel();
      turnoverAnimationRef.current?.cancel();
      clearTimeout(dealTimerRef.current);
    }
  }, [reducedMotion]);

  return (
    <div
      ref={elementRef}
      className="card-motion"
      data-card-deal=""
      data-reduced-motion={reducedMotion}
    >
      <div
        className={`card-motion-surface${turnFaceUp ? ' has-turnover' : ''}`}
      >
        {turnFaceUp ? (
          <div
            className="card-turnover"
            data-card-turnover=""
            ref={turnoverRef}
          >
            <div className="card-turnover-front">{children}</div>
            <img
              className="card-turnover-back"
              src={`/card-images/card_back_${cardBackColor}.png`}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default CardMotion;
