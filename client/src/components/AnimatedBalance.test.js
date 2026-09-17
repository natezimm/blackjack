import { act } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import AnimatedBalance from './AnimatedBalance';
import { BALANCE_COUNT_DURATION_MS } from '../constants/motionTiming';

describe('AnimatedBalance', () => {
  const displayFor = (value) =>
    screen.getByText(`${value.slice(1)} dollars`).previousSibling;
  let now;
  let nextFrame;
  let frames;

  const advanceFrame = (elapsed) => {
    now += elapsed;
    const pending = [...frames.values()];
    frames.clear();
    act(() => pending.forEach((callback) => callback(now)));
  };

  beforeEach(() => {
    now = 0;
    nextFrame = 0;
    frames = new Map();
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
      });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('holds a payout while paused, then counts to the revealed balance', () => {
    const { rerender } = render(<AnimatedBalance value={1000} />);
    expect(displayFor('$1000')).toHaveTextContent('$1000');
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    rerender(<AnimatedBalance value={1200} paused />);
    advanceFrame(600);
    expect(displayFor('$1000')).toHaveTextContent('$1000');
    expect(screen.queryByText('1200 dollars')).not.toBeInTheDocument();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    rerender(<AnimatedBalance value={1200} />);
    const balance = displayFor('$1200');
    expect(balance).toHaveTextContent('$1000');
    advanceFrame(BALANCE_COUNT_DURATION_MS / 2);
    const midway = Number(balance.textContent.slice(1));
    expect(midway).toBeGreaterThan(1000);
    expect(midway).toBeLessThan(1200);
    expect(Number.isInteger(midway)).toBe(true);
    advanceFrame(BALANCE_COUNT_DURATION_MS / 2);
    expect(balance).toHaveTextContent('$1200');
    expect(balance).toHaveAttribute('aria-hidden', 'true');
    expect(frames.size).toBe(0);
  });

  it('updates immediately for reduced motion without revealing a paused payout', () => {
    const { rerender } = render(<AnimatedBalance value={1000} reducedMotion />);
    rerender(<AnimatedBalance value={975} reducedMotion />);
    expect(displayFor('$975')).toHaveTextContent('$975');

    rerender(<AnimatedBalance value={1100} paused reducedMotion />);
    expect(displayFor('$975')).toHaveTextContent('$975');
    rerender(<AnimatedBalance value={1100} reducedMotion />);
    expect(displayFor('$1100')).toHaveTextContent('$1100');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('cancels an old target and counts from the current display to the latest value', () => {
    const { rerender } = render(<AnimatedBalance value={1000} />);
    rerender(<AnimatedBalance value={1200} />);
    advanceFrame(150);
    const visible = displayFor('$1200').textContent;
    const previousFrame = nextFrame;

    rerender(<AnimatedBalance value={800} />);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(previousFrame);
    expect(displayFor('$800').textContent).toBe(visible);
    expect(frames.size).toBe(1);
    advanceFrame(BALANCE_COUNT_DURATION_MS);
    expect(displayFor('$800')).toHaveTextContent('$800');
    expect(frames.size).toBe(0);
  });

  it('cancels the pending animation when unmounted', () => {
    const { rerender, unmount } = render(<AnimatedBalance value={1000} />);
    rerender(<AnimatedBalance value={1100} />);
    advanceFrame(100);
    const pendingFrame = nextFrame;

    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame);
    expect(frames.size).toBe(0);
  });
});
