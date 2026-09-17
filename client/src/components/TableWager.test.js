import { render, screen } from '@testing-library/react';
import TableWager from './TableWager';
import { CHIP_FLIGHT_DURATION_MS } from '../constants/motionTiming';

describe('table wagers', () => {
  const originalAnimate = HTMLElement.prototype.animate;
  let cancel;
  beforeEach(() => {
    cancel = jest.fn();
    HTMLElement.prototype.animate = jest.fn(() => ({ cancel }));
  });
  afterEach(() => {
    HTMLElement.prototype.animate = originalAnimate;
  });

  it('shows the full amount while bounding visual chip stacks', () => {
    const { container } = render(<TableWager amount={10000} />);
    expect(screen.getByText('$10,000 on the felt')).toBeInTheDocument();
    expect(container.querySelectorAll('.felt-chip')).toHaveLength(5);
  });

  it('cancels a deposited chip when cleared, and never replays it when reduced motion changes', () => {
    const deposit = { id: 1, amount: 25 };
    const View = ({ reducedMotion, cleared = false }) => (
      <>
        <button data-chip-amount="25">Chip</button>
        <TableWager
          amount={cleared ? 0 : 25}
          deposit={cleared ? null : deposit}
          reducedMotion={reducedMotion}
        />
      </>
    );
    const { rerender } = render(<View reducedMotion={false} />);
    expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(1);
    expect(HTMLElement.prototype.animate.mock.calls[0][1].duration).toBe(
      CHIP_FLIGHT_DURATION_MS
    );
    rerender(<View reducedMotion={true} />);
    expect(cancel).toHaveBeenCalled();
    rerender(<View reducedMotion={false} />);
    expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(1);
    rerender(<View reducedMotion={false} cleared />);
    expect(screen.getByText('Place your wager')).toBeInTheDocument();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('keeps settlement distinct from a newly placed wager', () => {
    const { container, rerender } = render(
      <TableWager
        amount={50}
        settlement={{ id: 1, wager: 50, payout: 50, result: 'mixed' }}
      />
    );
    expect(screen.getByText('$50 returned')).toBeInTheDocument();
    expect(container.querySelector('.table-wager')).toHaveAttribute(
      'data-settlement',
      'mixed'
    );
    rerender(<TableWager amount={100} settlement={null} />);
    expect(screen.getByText('$100 on the felt')).toBeInTheDocument();
    expect(
      container.querySelector('.wager-settlement')
    ).not.toBeInTheDocument();
  });
});
