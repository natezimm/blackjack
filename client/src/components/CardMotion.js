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
  SHOE_EXTRACTION_MS,
} from '../constants/motionTiming';

export { CARD_DEAL_DURATION_MS, SHOE_EXTRACTION_MS };

const TableMotionContext = createContext({
  notifyDeal: () => {},
  reducedMotion: false,
});

export const useTableReducedMotion = () =>
  useContext(TableMotionContext).reducedMotion;

export const TableMotionProvider = ({
  children,
  onDeal,
  reducedMotion = false,
}) => {
  const onDealRef = useRef(onDeal);
  onDealRef.current = onDeal;

  const notifyDeal = useCallback(() => onDealRef.current?.(), []);
  const value = useMemo(
    () => ({ notifyDeal, reducedMotion }),
    [notifyDeal, reducedMotion]
  );

  return (
    <TableMotionContext.Provider value={value}>
      {children}
    </TableMotionContext.Provider>
  );
};

const CardMotion = ({ children, skipEntrance = false, entranceDelay = 0 }) => {
  const { notifyDeal, reducedMotion } = useContext(TableMotionContext);
  const elementRef = useRef(null);
  const animationRef = useRef(null);
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

    // The shoe extracts its small card first. This card takes over at the same
    // bounds, then travels on the outer wrapper so the inner card can still flip.
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
          easing: 'cubic-bezier(0.18, 0.72, 0.3, 1)',
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

    const beginDeal = () => {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        notifyDeal();
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
        clearTimeout(dealTimerRef.current);
      }
    };
    motionPreference?.addEventListener?.('change', stopForReducedMotion);

    return () => {
      animation.cancel();
      clearTimeout(dealTimerRef.current);
      motionPreference?.removeEventListener?.('change', stopForReducedMotion);
    };
  }, [notifyDeal]);

  useLayoutEffect(() => {
    if (reducedMotion) {
      animationRef.current?.cancel();
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
      <div className="card-motion-surface">{children}</div>
    </div>
  );
};

export default CardMotion;
