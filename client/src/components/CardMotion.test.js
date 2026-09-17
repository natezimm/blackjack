import React, { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import CardMotion, {
  CARD_DEAL_DURATION_MS,
  SHOE_EXTRACTION_MS,
  TableMotionProvider,
  useTableDealMotion,
} from './CardMotion';
import PlayerHand from './PlayerHand';
import DealerHand from './DealerHand';
import { captureCardsForCollection } from './CardSweep';
import {
  CARD_GLIDE_EASING,
  CARD_PUSH_EASING,
  CARD_RELEASE_MS,
  CARD_TURNOVER_DURATION_MS,
} from '../constants/motionTiming';

describe('card travel', () => {
  const originalAnimate = Element.prototype.animate;
  const originalMatchMedia = window.matchMedia;
  let animation;
  let preference;

  const animationsFor = (selector) =>
    Element.prototype.animate.mock.calls.flatMap((call, index) => {
      const element = Element.prototype.animate.mock.instances[index];
      return element.matches(selector)
        ? [{ element, frames: call[0], timing: call[1] }]
        : [];
    });

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
        easing: CARD_PUSH_EASING,
      }),
      expect.objectContaining({
        opacity: 1,
        offset: CARD_RELEASE_MS / CARD_DEAL_DURATION_MS,
        easing: CARD_GLIDE_EASING,
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

  it.each([
    ['red', 0],
    ['blue', CARD_DEAL_DURATION_MS],
  ])(
    'turns the %s card back face up after extraction with a %sms entrance delay',
    (cardBackColor, entranceDelay) => {
      const { container } = render(
        <TableMotionProvider cardBackColor={cardBackColor}>
          <CardMotion turnFaceUp entranceDelay={entranceDelay}>
            <img className="card" src="/ace.png" alt="Ace of Spades" />
          </CardMotion>
        </TableMotionProvider>
      );

      expect(Element.prototype.animate).toHaveBeenCalledTimes(2);
      const [flight] = animationsFor('[data-card-deal]');
      const [turnover] = animationsFor('[data-card-turnover]');
      expect(flight.timing.duration).toBe(CARD_DEAL_DURATION_MS);
      expect(turnover.frames).toEqual([
        { transform: 'rotateY(180deg)' },
        { transform: 'rotateY(0deg)' },
      ]);
      expect(turnover.timing).toEqual({
        duration: CARD_TURNOVER_DURATION_MS,
        delay: entranceDelay + SHOE_EXTRACTION_MS,
        easing: 'ease-in-out',
        fill: 'backwards',
      });
      const handoff = flight.frames.find((frame) => frame.opacity === 1);
      expect(turnover.timing.delay - entranceDelay).toBe(
        handoff.offset * flight.timing.duration
      );
      expect(
        turnover.timing.delay + turnover.timing.duration - entranceDelay
      ).toBe(660);
      expect(container.querySelector('.card-turnover-back')).toHaveAttribute(
        'src',
        `/card-images/card_back_${cardBackColor}.png`
      );
      expect(container.querySelector('.card-turnover-back')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
      expect(container.querySelector('.card-turnover-back')).toHaveAttribute(
        'alt',
        ''
      );
      expect(screen.getAllByRole('img')).toEqual([
        screen.getByAltText('Ace of Spades'),
      ]);
      expect(turnover.element.style.transform).toBe('');
    }
  );

  it('turns dealer upcards face up while keeping the hole card for its separate reveal', () => {
    const hand = [
      { value: 'A', suit: 'Spades' },
      { value: '9', suit: 'Hearts' },
    ];
    const { container, rerender } = render(
      <DealerHand hand={hand} reveal={false} />
    );

    expect(animationsFor('[data-card-deal]')).toHaveLength(2);
    expect(animationsFor('[data-card-turnover]')).toHaveLength(1);
    const holeCard = container.querySelector('[data-dealer-hole-card]');
    expect(holeCard.closest('[data-card-turnover]')).toBeNull();
    expect(holeCard.querySelector('.card-inner')).not.toHaveClass('flipped');
    expect(
      screen.getByAltText('9 of Hearts').closest('[data-card-turnover]')
    ).toBe(animationsFor('[data-card-turnover]')[0].element);

    rerender(<DealerHand hand={hand} reveal />);

    expect(Element.prototype.animate).toHaveBeenCalledTimes(3);
    expect(holeCard.querySelector('.card-inner')).toHaveClass('flipped');
  });

  it('collects only the final card face after adding the decorative turnover back', () => {
    const { container } = render(
      <div className="table-surface">
        <div data-card-collection="" />
        <PlayerHand hand={[{ value: 'A', suit: 'Spades' }]} />
      </div>
    );
    const cards = captureCardsForCollection(container.firstChild);
    expect(cards).toHaveLength(1);
    expect(cards[0].src).toBe(screen.getByAltText('A of Spades').src);
  });

  it.each([
    ['dealer', { left: 320, top: 160, width: 76, height: 110 }],
    ['player', { left: 160, top: 400, width: 92, height: 134 }],
    ['right split hand', { left: 560, top: 400, width: 72, height: 105 }],
  ])('shares the card release point toward the %s', (_, destination) => {
    const origin = { left: 500, top: 52, width: 46, height: 67 };
    const armWidth = 60;
    let latestDealRef;
    let notifiedMotion;
    const ReadMotion = () => {
      latestDealRef = useTableDealMotion();
      return null;
    };
    const onDeal = jest.fn(() => {
      notifiedMotion = latestDealRef.current;
    });
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if (this.hasAttribute('data-card-shoe-exit')) return origin;
        if (this.classList.contains('dealer-dealing-arm')) {
          return { left: 400, top: 0, width: armWidth, height: 90 };
        }
        return destination;
      });
    render(
      <TableMotionProvider onDeal={onDeal}>
        <ReadMotion />
        <div className="table-surface">
          <div className="dealer-dealing-arm" />
          <div data-card-shoe-exit="" />
          <CardMotion>Card</CardMotion>
        </div>
      </TableMotionProvider>
    );

    const { release } = notifiedMotion;
    const originX = origin.left + origin.width / 2;
    const originY = origin.top + origin.height / 2;
    const destinationX = destination.left + destination.width / 2;
    const destinationY = destination.top + destination.height / 2;
    const trajectoryX = destinationX - originX;
    const trajectoryY = destinationY - originY;
    const pushX = release.x - originX;
    const pushY = release.y - originY;
    const pushDistance = Math.hypot(pushX, pushY);
    const progress = pushDistance / Math.hypot(trajectoryX, trajectoryY);

    // The hand follows a short portion of the actual recipient's trajectory.
    expect(pushX * trajectoryY - pushY * trajectoryX).toBeCloseTo(0);
    expect(pushX * trajectoryX + pushY * trajectoryY).toBeGreaterThan(0);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(0.22);
    expect(pushDistance).toBeLessThanOrEqual(armWidth * 0.85 + 0.001);
    expect(onDeal).toHaveBeenCalledWith();

    const frames = Element.prototype.animate.mock.calls[0][0];
    const releaseFrame = frames.find(
      (frame) => frame.offset === CARD_RELEASE_MS / CARD_DEAL_DURATION_MS
    );
    const [, dx, dy, scale] = releaseFrame.transform.match(
      /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/
    );
    expect(destinationX + Number(dx)).toBeCloseTo(release.x);
    expect(destinationY + Number(dy)).toBeCloseTo(release.y);
    const initialScale = origin.width / destination.width;
    expect(Number(scale)).toBeCloseTo(
      initialScale + (1 - initialScale) * progress
    );
  });

  it('publishes a queued card release only when that card begins dealing', () => {
    jest.useFakeTimers();
    let latestDealRef;
    const notifiedMotions = [];
    const ReadMotion = () => {
      latestDealRef = useTableDealMotion();
      return null;
    };
    const onDeal = jest.fn(() => {
      notifiedMotions.push(latestDealRef.current);
    });
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if (this.hasAttribute('data-card-shoe-exit')) {
          return { left: 500, top: 52, width: 46, height: 67 };
        }
        return {
          left: this.textContent === 'First' ? 100 : 300,
          top: 400,
          width: 92,
          height: 134,
        };
      });
    render(
      <TableMotionProvider onDeal={onDeal}>
        <ReadMotion />
        <div className="table-surface">
          <div data-card-shoe-exit="" />
          <CardMotion>First</CardMotion>
          <CardMotion entranceDelay={CARD_DEAL_DURATION_MS}>Second</CardMotion>
        </div>
      </TableMotionProvider>
    );

    expect(onDeal).toHaveBeenCalledTimes(1);
    const firstMotion = latestDealRef.current;
    act(() => jest.advanceTimersByTime(CARD_DEAL_DURATION_MS - 1));
    expect(onDeal).toHaveBeenCalledTimes(1);
    expect(latestDealRef.current).toBe(firstMotion);
    act(() => jest.advanceTimersByTime(1));
    expect(onDeal).toHaveBeenCalledTimes(2);
    expect(notifiedMotions[0]).toBe(firstMotion);
    expect(notifiedMotions[1]).toBe(latestDealRef.current);
    expect(notifiedMotions[1].release).not.toEqual(firstMotion.release);
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
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2);
    expect(animationsFor('[data-card-deal]')).toHaveLength(1);
    expect(animationsFor('[data-card-turnover]')).toHaveLength(1);
    expect(nextDeal).not.toHaveBeenCalled();

    rerender(table([...cards, { value: '9', suit: 'Hearts' }], nextDeal));
    expect(Element.prototype.animate).toHaveBeenCalledTimes(4);
    expect(animationsFor('[data-card-deal]')).toHaveLength(2);
    expect(animationsFor('[data-card-turnover]')).toHaveLength(2);
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
    expect(Element.prototype.animate).toHaveBeenCalledTimes(4);
    expect(onDeal).toHaveBeenCalledTimes(1);
    const flights = animationsFor('[data-card-deal]');
    const turnovers = animationsFor('[data-card-turnover]');
    expect(flights[1].timing).toMatchObject({
      delay: CARD_DEAL_DURATION_MS,
      fill: 'backwards',
    });
    expect(turnovers[1].timing).toMatchObject({
      delay: CARD_DEAL_DURATION_MS + SHOE_EXTRACTION_MS,
      fill: 'backwards',
    });
    act(() => jest.advanceTimersByTime(CARD_DEAL_DURATION_MS));
    expect(onDeal).toHaveBeenCalledTimes(2);
    expect(flights.map(({ element }) => element)).toEqual([
      screen.getByAltText('3 of Clubs').closest('.card-motion'),
      screen.getByAltText('K of Diamonds').closest('.card-motion'),
    ]);
    expect(turnovers.map(({ element }) => element)).toEqual([
      screen.getByAltText('3 of Clubs').closest('[data-card-turnover]'),
      screen.getByAltText('K of Diamonds').closest('[data-card-turnover]'),
    ]);
    expect(screen.getByAltText('8 of Hearts')).toBeInTheDocument();
  });

  it.each(['unmount', 'context', 'system'])(
    'cancels a queued draw and turnover on %s so the shoe never pulls a phantom card',
    (reason) => {
      jest.useFakeTimers();
      const onDeal = jest.fn();
      const flight = { cancel: jest.fn() };
      const turnover = { cancel: jest.fn() };
      Element.prototype.animate
        .mockReturnValueOnce(flight)
        .mockReturnValueOnce(turnover);
      const table = (reducedMotion) => (
        <TableMotionProvider onDeal={onDeal} reducedMotion={reducedMotion}>
          <CardMotion turnFaceUp entranceDelay={CARD_DEAL_DURATION_MS}>
            <img className="card" src="/ace.png" alt="Ace of Spades" />
          </CardMotion>
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
      expect(flight.cancel).toHaveBeenCalledTimes(1);
      expect(turnover.cancel).toHaveBeenCalledTimes(1);
      if (reason !== 'unmount') {
        expect(
          screen.getByAltText('Ace of Spades').closest('[data-card-turnover]')
            .style.transform
        ).toBe('');
      }
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
          <CardMotion turnFaceUp>Card</CardMotion>
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
    const { container } = render(<CardMotion turnFaceUp>Card</CardMotion>);
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(
      container.querySelector('[data-card-turnover]').style.transform
    ).toBe('');
  });
});
