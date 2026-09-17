import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import DealerScene from './DealerScene';
import { TableMotionProvider } from './CardMotion';
import {
  CARD_FLIP_DURATION_MS,
  DEALER_FLIP_GESTURE_MS,
  DEALER_REACH_MS,
} from '../constants/motionTiming';

describe('dealer hole-card gesture', () => {
  const originalAnimate = Element.prototype.animate;
  const originalMatchMedia = window.matchMedia;
  let animation;
  let preference;

  const scene = (pulse = 0, reducedMotion = false, includeCard = true) => (
    <TableMotionProvider reducedMotion={reducedMotion}>
      <div data-dealer-hole-card="outside-table" />
      <div className="table-surface">
        <DealerScene revealPulse={pulse} />
        {includeCard && <div data-dealer-hole-card="inside-table" />}
      </div>
    </TableMotionProvider>
  );

  beforeEach(() => {
    animation = { cancel: jest.fn() };
    Element.prototype.animate = jest.fn(() => animation);
    preference = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    window.matchMedia = jest.fn(() => preference);
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if (this.hasAttribute('data-dealer-flip-contact')) {
          return { left: 130, top: 100, width: 2, height: 2 };
        }
        if (this.getAttribute('data-dealer-hole-card') === 'inside-table') {
          return { left: 240, top: 180, width: 76, height: 110 };
        }
        return { left: 0, top: 0, width: 0, height: 0 };
      });
  });

  afterEach(() => {
    cleanup();
    Element.prototype.animate = originalAnimate;
    window.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
  });

  it('reaches the same-table card edge before turning its wrist and returning', () => {
    const { rerender, container } = render(scene());
    expect(Element.prototype.animate).not.toHaveBeenCalled();
    rerender(scene(1));

    const [frames, timing] = Element.prototype.animate.mock.calls[0];
    expect(Element.prototype.animate.mock.instances[0]).toBe(
      container.querySelector('[data-dealer-flip-hand]')
    );
    expect(timing).toEqual({
      duration: DEALER_FLIP_GESTURE_MS,
      easing: 'linear',
    });
    expect(frames[1]).toEqual(
      expect.objectContaining({
        transform: 'translate(115.08px, 120.80px) rotate(0deg)',
        offset: DEALER_REACH_MS / DEALER_FLIP_GESTURE_MS,
      })
    );
    expect(frames[2].transform).toContain('rotate(-8deg)');
    expect(frames[3].offset * timing.duration).toBe(
      DEALER_REACH_MS + CARD_FLIP_DURATION_MS
    );
    expect(frames[4].transform).toBe(frames[0].transform);

    rerender(scene(1));
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);
    rerender(scene(2));
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2);
  });

  it('cancels for context reduced motion and does not replay when motion returns', () => {
    const { rerender } = render(scene());
    rerender(scene(1));
    rerender(scene(1, true));
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    rerender(scene(2, true));
    rerender(scene(2, false));
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);
  });

  it('observes system reduced motion and removes its listener on unmount', () => {
    const { rerender, unmount } = render(scene());
    preference.matches = true;
    rerender(scene(1));
    expect(Element.prototype.animate).not.toHaveBeenCalled();
    preference.matches = false;
    rerender(scene(2));
    const onPreferenceChange = preference.addEventListener.mock.calls[0][1];
    act(() => onPreferenceChange());
    expect(animation.cancel).not.toHaveBeenCalled();
    preference.matches = true;
    act(() => onPreferenceChange());
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    unmount();
    expect(preference.removeEventListener).toHaveBeenCalledWith(
      'change',
      onPreferenceChange
    );
    expect(animation.cancel).toHaveBeenCalledTimes(2);
  });

  it('skips the gesture when no hole card exists or browser animation is unavailable', () => {
    const { rerender } = render(scene(0, false, false));
    rerender(scene(1, false, false));
    expect(Element.prototype.animate).not.toHaveBeenCalled();
    Element.prototype.animate = undefined;
    expect(() => rerender(scene(2))).not.toThrow();
  });
});
