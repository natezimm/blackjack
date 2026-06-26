import { render, screen } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import BankrollGraph, {
  buildBankrollChartGeometry,
  buildBankrollSeries,
  buildVisibleBankrollSeries,
  formatBankrollDelta,
} from './BankrollGraph';

const history = [
  {
    id: 'newest',
    balance: 1025,
    net: 35,
    result: 'WIN',
  },
  {
    id: 'oldest',
    balance: 990,
    net: -10,
    result: 'LOSS',
  },
];

describe('BankrollGraph', () => {
  it('builds a chronological bankroll series from newest-first history', () => {
    expect(buildBankrollSeries(history)).toEqual([
      {
        id: 'start',
        label: 'Start',
        balance: 1000,
        handNumber: 0,
      },
      {
        id: 'oldest',
        label: 'Hand 1',
        balance: 990,
        net: -10,
        result: 'LOSS',
        handNumber: 1,
      },
      {
        id: 'newest',
        label: 'Hand 2',
        balance: 1025,
        net: 35,
        result: 'WIN',
        handNumber: 2,
      },
    ]);
  });

  it('ignores invalid entries when building the bankroll series', () => {
    expect(
      buildBankrollSeries([
        { id: 'missing-balance', net: 15 },
        null,
        { id: 'valid', balance: 1015, net: 15 },
      ])
    ).toEqual([
      {
        id: 'start',
        label: 'Start',
        balance: 1000,
        handNumber: 0,
      },
      {
        id: 'valid',
        label: 'Hand 1',
        balance: 1015,
        net: 15,
        result: null,
        handNumber: 1,
      },
    ]);
    expect(buildBankrollSeries(null)).toEqual([]);
  });

  it('falls back when history is missing optional graph fields', () => {
    expect(buildBankrollSeries([{ balance: 1075 }])).toEqual([
      {
        id: 'start',
        label: 'Start',
        balance: 1000,
        handNumber: 0,
      },
      {
        id: 'hand-1',
        label: 'Hand 1',
        balance: 1075,
        net: null,
        result: null,
        handNumber: 1,
      },
    ]);
  });

  it('pads flat bankroll chart geometry so the line can render', () => {
    const geometry = buildBankrollChartGeometry([
      { id: 'start', balance: 1000, handNumber: 0 },
      { id: 'push', balance: 1000, handNumber: 1 },
    ]);

    expect(geometry.minBalance).toBeLessThan(1000);
    expect(geometry.maxBalance).toBeGreaterThan(1000);
    expect(geometry.pointString).toContain(',');
    expect(geometry.areaPath).toContain('Z');
    expect(geometry.yTicks).toHaveLength(3);
    expect(geometry.xTicks[0]).toEqual(
      expect.objectContaining({ label: 'Start' })
    );
    expect(geometry.xTicks[1]).toEqual(
      expect.objectContaining({ label: 'Current' })
    );
  });

  it('returns empty chart geometry without series data', () => {
    const geometry = buildBankrollChartGeometry([]);

    expect(geometry.points).toEqual([]);
    expect(geometry.pointString).toBe('');
    expect(geometry.areaPath).toBe('');
    expect(geometry.baselineY).toBe(75);
    expect(geometry.yTicks).toEqual([]);
    expect(geometry.xTicks).toEqual([]);
  });

  it('keeps a pre-range balance point for selected hand windows', () => {
    const series = Array.from({ length: 13 }, (_, index) => ({
      id: index === 0 ? 'start' : `hand-${index}`,
      label: index === 0 ? 'Start' : `Hand ${index}`,
      handNumber: index,
      balance: 1000 + index * 10,
    }));

    expect(
      buildVisibleBankrollSeries(series, 'LAST_5_HANDS').map(
        (point) => point.id
      )
    ).toEqual(['hand-7', 'hand-8', 'hand-9', 'hand-10', 'hand-11', 'hand-12']);
    expect(buildVisibleBankrollSeries(series, 'ALL')).toHaveLength(13);
  });

  it('formats bankroll deltas', () => {
    expect(formatBankrollDelta(25)).toBe('+$25');
    expect(formatBankrollDelta(-25)).toBe('-$25');
    expect(formatBankrollDelta(0)).toBe('$0');
  });

  it('renders an empty state before a hand is completed', () => {
    render(<BankrollGraph handHistory={[]} currentBalance={975} />);

    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('$975')).toBeInTheDocument();
    expect(screen.getByText('No completed hands yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 5 hands' })).toBeDisabled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders an accessible bankroll graph after completed hands', () => {
    render(<BankrollGraph handHistory={history} currentBalance={1025} />);

    expect(
      screen.getByRole('img', {
        name: 'Bankroll graph from $1,000 to $1,025 over 2 hands',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('$1,025')).toBeInTheDocument();
    expect(screen.getByText('$1,050')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
    expect(screen.getByText('$950')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Prev')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('All hands')).toBeInTheDocument();
    expect(screen.getByText('Range net +$25')).toBeInTheDocument();
  });

  it('switches between hand ranges', async () => {
    const rangeHistory = Array.from({ length: 12 }, (_, index) => {
      const handNumber = 12 - index;
      return {
        id: `hand-${handNumber}`,
        balance: 1000 + handNumber * 10,
        net: 10,
        result: 'WIN',
      };
    });

    render(<BankrollGraph handHistory={rangeHistory} currentBalance={1120} />);

    await act(async () => {
      await userEvent.click(
        screen.getByRole('button', { name: 'Last 5 hands' })
      );
    });

    expect(
      screen.getByRole('img', {
        name: 'Bankroll graph from $1,070 to $1,120 over 5 hands',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('5 hands ago')).toBeInTheDocument();
    expect(screen.getAllByText('Last 5 hands')).toHaveLength(2);
    expect(screen.getByText('Range net +$50')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Last 5 hands' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a losing trend state', () => {
    const { container } = render(
      <BankrollGraph
        handHistory={[{ id: 'loss', balance: 950, net: -50 }]}
        currentBalance={950}
      />
    );

    expect(container.querySelector('.bankroll-graph')).toHaveClass('is-down');
    expect(screen.getByText('Range net -$50')).toBeInTheDocument();
  });
});
