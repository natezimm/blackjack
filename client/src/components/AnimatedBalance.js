import React, { useEffect, useRef, useState } from 'react';
import { BALANCE_COUNT_DURATION_MS } from '../constants/motionTiming';

const AnimatedBalance = ({ value, paused = false, reducedMotion = false }) => {
  const [displayed, setDisplayed] = useState(value);
  const displayedRef = useRef(value);

  useEffect(() => {
    if (paused) return;

    const from = displayedRef.current;
    if (reducedMotion || from === value) {
      displayedRef.current = value;
      setDisplayed(value);
      return;
    }

    const startedAt = performance.now();
    let frame;
    const update = (now) => {
      const progress = Math.min(
        1,
        (now - startedAt) / BALANCE_COUNT_DURATION_MS
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      displayedRef.current = next;
      setDisplayed(next);
      if (progress < 1) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value, paused, reducedMotion]);

  return (
    <strong>
      <span aria-hidden="true">{`$${displayed}`}</span>
      <span className="balance-accessible">{`${paused ? displayed : value} dollars`}</span>
    </strong>
  );
};

export default AnimatedBalance;
