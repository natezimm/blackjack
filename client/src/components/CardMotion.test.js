import React, { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import CardMotion, {
  CARD_DEAL_DURATION_MS,
  SHOE_EXTRACTION_MS,
  TableMotionProvider,
} from './CardMotion';
import PlayerHand from './PlayerHand';

describe('card travel', () => {
  const originalAnimate = Element.prototype.animate;
  const originalMatchMedia = window.matchMedia;
  let animation;
  let preference;

  beforeEach(() => {
    animation = { cancel: jest.fn() };
    Element.prototype.animate = jest.fn(() => animation);
    preference = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    window.matchMedia = jest.fn(() => preference);
  });

  afterEach(() => {
    Element.prototype.animate = originalAnimate;
    window.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('takes over at the extracted card bounds after 360ms, then travels upright without fading', () => {
    const onDeal = jest.fn();
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if (this.hasAttribute('data-card-shoe-exit')) {
          return this.closest('.table-surface')
            ? { left: 500, top: 52, width: 46, height: 67 }
            : { left: 10, top: 10, width: 46, height: 67 };
        }
        if (this.hasAttribute('data-card-shoe')) {
          return { left: 500, top: 30, width: 46, height: 67 };
        }
        return { left: 200, top: 300, width: 92, height: 134 };
      });
    const { container } = render(
      <TableMotionProvider onDeal={onDeal}>
        <div data-card-shoe-exit="" />
        <div className="table-surface">
          <div data-card-shoe="" />
          <div data-card-shoe-exit="" />
          <CardMotion>
            <img className="card" src="/card.png" alt="Ace of Spades" />
          </CardMotion>
        </div>
      </TableMotionProvider>
    );

    const [frames, timing] = Element.prototype.animate.mock.calls[0];
    const handoffTransform = 'translate(277px, -281.5px) scale(0.5)';
    expect(timing).toEqual({
      duration: CARD_DEAL_DURATION_MS,
      easing: 'linear',
    });
    expect(frames).toEqual([
      expect.objectContaining({
        transform: handoffTransform,
        opacity: 0,
        offset: 0,
      }),
      expect.objectContaining({
        transform: handoffTransform,
        opacity: 0,
        offset: SHOE_EXTRACTION_MS / CARD_DEAL_DURATION_MS,
      }),
      expect.objectContaining({
        transform: handoffTransform,
        opacity: 1,
        offset: SHOE_EXTRACTION_MS / CARD_DEAL_DURATION_MS,
      }),
      expect.objectContaining({
        transform: 'translate(0, 0) scale(1)',
        opacity: 1,
        offset: 1,
      }),
    ]);
    expect(timing.duration).toBe(1200);
    expect(frames[2].offset * timing.duration).toBe(360);
    expect(frames.every((frame) => !frame.transform.includes('rotate'))).toBe(
      true
    );
    expect(onDeal).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-card-deal] .card')).toBe(
      screen.getByAltText('Ace of Spades')
    );
    expect(screen.getByAltText('Ace of Spades').style.transform).toBe('');
  });

  it('falls back to the shoe mouth when no separate extraction exit exists', () => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        return this.hasAttribute('data-card-shoe')
          ? { left: 500, top: 30, width: 46, height: 67 }
          : { left: 200, top: 300, width: 92, height: 134 };
      });
    render(
      <div className="table-surface">
        <div data-card-shoe="" />
        <CardMotion>Card</CardMotion>
      </div>
    );
    expect(Element.prototype.animate.mock.calls[0][0][2].transform).toBe(
      'translate(277px, -303.5px) scale(0.5)'
    );
  });

  it('only deals a newly appended card, using the latest callback after a render', () => {
    const firstDeal = jest.fn();
    const nextDeal = jest.fn();
    const cards = [{ value: 'A', suit: 'Spades' }];
    const table = (hand, onDeal) => (
      <TableMotionProvider onDeal={onDeal}>
        <PlayerHand hand={hand} />
      </TableMotionProvider>
    );
    const { rerender } = render(table(cards, firstDeal));

    rerender(table(cards, nextDeal));
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);
    expect(nextDeal).not.toHaveBeenCalled();

    rerender(table([...cards, { value: '9', suit: 'Hearts' }], nextDeal));
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2);
    expect(nextDeal).toHaveBeenCalledTimes(1);
    expect(firstDeal).toHaveBeenCalledTimes(1);
  });

  it('draws split replacements one at a time without redealing the original pair', () => {
    jest.useFakeTimers();
    const pair = [
      { value: '8', suit: 'Spades' },
      { value: '8', suit: 'Hearts' },
    ];
    const onDeal = jest.fn();
    const table = (hands) => (
      <TableMotionProvider onDeal={onDeal}>
        {hands.map((hand, index) => (
          <PlayerHand
            key={index}
            hand={hand}
            isSplit={hands.length > 1}
            replacementDealDelay={index * CARD_DEAL_DURATION_MS}
          />
        ))}
      </TableMotionProvider>
    );
    const { rerender } = render(table([pair]));
    const retainedCard = screen
      .getByAltText('8 of Spades')
      .closest('.card-motion');
    Element.prototype.animate.mockClear();
    onDeal.mockClear();

    rerender(
      table([
        [pair[0], { value: '3', suit: 'Clubs' }],
        [pair[1], { value: 'K', suit: 'Diamonds' }],
      ])
    );

    expect(screen.getByAltText('8 of Spades').closest('.card-motion')).toBe(
      retainedCard
    );
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2);
    expect(onDeal).toHaveBeenCalledTimes(1);
    expect(Element.prototype.animate.mock.calls[1][1]).toMatchObject({
      delay: CARD_DEAL_DURATION_MS,
      fill: 'backwards',
    });
    act(() => jest.advanceTimersByTime(CARD_DEAL_DURATION_MS));
    expect(onDeal).toHaveBeenCalledTimes(2);
    expect(Element.prototype.animate.mock.instances).toEqual([
      screen.getByAltText('3 of Clubs').closest('.card-motion'),
      screen.getByAltText('K of Diamonds').closest('.card-motion'),
    ]);
    expect(screen.getByAltText('8 of Hearts')).toBeInTheDocument();
  });

  it.each(['unmount', 'context', 'system'])(
    'cancels a queued draw on %s so the shoe never pulls a phantom card',
    (reason) => {
      jest.useFakeTimers();
      const onDeal = jest.fn();
      const table = (reducedMotion) => (
        <TableMotionProvider onDeal={onDeal} reducedMotion={reducedMotion}>
          <CardMotion entranceDelay={CARD_DEAL_DURATION_MS}>Card</CardMotion>
        </TableMotionProvider>
      );
      const { unmount, rerender } = render(table(false));
      if (reason === 'unmount') unmount();
      if (reason === 'context') rerender(table(true));
      if (reason === 'system') {
        preference.matches = true;
        act(() => preference.addEventListener.mock.calls[0][1]());
      }
      act(() => jest.advanceTimersByTime(CARD_DEAL_DURATION_MS * 2));
      expect(onDeal).not.toHaveBeenCalled();
      expect(animation.cancel).toHaveBeenCalled();
    }
  );

  it.each(['context', 'system'])(
    'deals instantly when reduced motion is requested by %s',
    (source) => {
      preference.matches = source === 'system';
      const onDeal = jest.fn();
      const { container } = render(
        <TableMotionProvider
          onDeal={onDeal}
          reducedMotion={source === 'context'}
        >
          <PlayerHand
            hand={{
              cards: [
                { value: 'A', suit: 'Spades' },
                { value: 'K', suit: 'Hearts' },
              ],
              outcome: 'Win',
            }}
            isSplit
          />
        </TableMotionProvider>
      );

      expect(Element.prototype.animate).not.toHaveBeenCalled();
      expect(onDeal).not.toHaveBeenCalled();
      expect(screen.getByAltText('A of Spades')).toBeInTheDocument();
      if (source === 'context') {
        expect(container.querySelector('.player-hand')).toHaveAttribute(
          'data-reduced-motion',
          'true'
        );
      }
    }
  );

  it('cancels an active flight when the system requests reduced motion', () => {
    render(<CardMotion>Card</CardMotion>);
    const onChange = preference.addEventListener.mock.calls[0][1];

    act(() => onChange());
    expect(animation.cancel).not.toHaveBeenCalled();
    preference.matches = true;
    act(() => onChange());
    expect(animation.cancel).toHaveBeenCalledTimes(1);
  });

  it('cancels an active flight when the context requests reduced motion without replaying it', () => {
    const table = (reducedMotion) => (
      <TableMotionProvider reducedMotion={reducedMotion}>
        <CardMotion>Card</CardMotion>
      </TableMotionProvider>
    );
    const { rerender } = render(table(false));
    rerender(table(true));
    expect(animation.cancel).toHaveBeenCalledTimes(1);
    rerender(table(false));
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);
  });

  it('cleans up the flight and media listener on unmount, including StrictMode mounts', () => {
    const onDeal = jest.fn();
    const { unmount } = render(
      <StrictMode>
        <TableMotionProvider onDeal={onDeal}>
          <CardMotion>Card</CardMotion>
        </TableMotionProvider>
      </StrictMode>
    );
    expect(onDeal).toHaveBeenCalledTimes(1);
    unmount();
    expect(animation.cancel).toHaveBeenCalled();
    expect(preference.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('keeps cards visible in browsers without the animation API or media queries', () => {
    Element.prototype.animate = undefined;
    window.matchMedia = undefined;
    render(<CardMotion>Card</CardMotion>);
    expect(screen.getByText('Card')).toBeInTheDocument();
  });
});
