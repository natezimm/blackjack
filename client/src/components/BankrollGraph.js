import React, { useState } from 'react';

const STARTING_BANKROLL = 1000;
const CHART_WIDTH = 300;
const CHART_HEIGHT = 150;
const CHART_PADDING = {
  top: 12,
  right: 10,
  bottom: 34,
  left: 58,
};

const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

export const BANKROLL_RANGE_OPTIONS = [
  { key: 'LAST_5_HANDS', label: 'Last 5 hands', hands: 5 },
  { key: 'LAST_10_HANDS', label: 'Last 10 hands', hands: 10 },
  { key: 'LAST_20_HANDS', label: 'Last 20 hands', hands: 20 },
  { key: 'ALL', label: 'All', hands: null },
];

export const formatBankrollAmount = (value) => {
  const amount = isFiniteNumber(value) ? value : 0;
  return `$${Math.round(amount).toLocaleString()}`;
};

export const formatBankrollDelta = (value) => {
  const amount = isFiniteNumber(value) ? value : 0;
  if (amount === 0) return '$0';
  return `${amount > 0 ? '+' : '-'}${formatBankrollAmount(Math.abs(amount))}`;
};

export const buildBankrollSeries = (history) => {
  if (!Array.isArray(history)) return [];

  const completedHands = history
    .filter((entry) => entry && isFiniteNumber(entry.balance))
    .slice()
    .reverse();

  if (completedHands.length === 0) return [];

  const oldestHand = completedHands[0];
  const startingBalance = isFiniteNumber(oldestHand.net)
    ? oldestHand.balance - oldestHand.net
    : STARTING_BANKROLL;

  return [
    {
      id: 'start',
      label: 'Start',
      balance: startingBalance,
      handNumber: 0,
    },
    ...completedHands.map((entry, index) => ({
      id: entry.id || `hand-${index + 1}`,
      label: `Hand ${index + 1}`,
      balance: entry.balance,
      net: isFiniteNumber(entry.net) ? entry.net : null,
      result: entry.result || null,
      handNumber: index + 1,
    })),
  ];
};

export const buildVisibleBankrollSeries = (series, rangeKey) => {
  if (!Array.isArray(series) || series.length === 0) return [];

  const option =
    BANKROLL_RANGE_OPTIONS.find((range) => range.key === rangeKey) ||
    BANKROLL_RANGE_OPTIONS[BANKROLL_RANGE_OPTIONS.length - 1];

  if (!option.hands) return series;

  const startIndex = Math.max(series.length - option.hands - 1, 0);
  return series.slice(startIndex);
};

const getNiceStep = (spread) => {
  const roughStep = Math.max(1, spread / 2);
  const steps = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  return steps.find((step) => step >= roughStep) || steps[steps.length - 1];
};

const getNiceScale = (balances) => {
  const rawMin = Math.min(...balances);
  const rawMax = Math.max(...balances);
  const spread = rawMax - rawMin;
  const rangePadding =
    spread === 0
      ? Math.max(25, Math.round(Math.abs(rawMax) * 0.02))
      : Math.max(10, Math.ceil(spread * 0.12));
  const paddedMin = rawMin - rangePadding;
  const paddedMax = rawMax + rangePadding;
  const step = getNiceStep(paddedMax - paddedMin);
  const minBalance = Math.floor(paddedMin / step) * step;
  const maxBalance = Math.ceil(paddedMax / step) * step;
  const midBalance = (minBalance + maxBalance) / 2;

  return {
    minBalance,
    maxBalance,
    yTicks: [maxBalance, midBalance, minBalance],
  };
};

const formatXAxisLabel = (point, latestHandNumber) => {
  if (!point) return '';
  if (point.handNumber === latestHandNumber) return 'Current';
  if (point.handNumber === 0) return 'Start';

  const handsAgo = latestHandNumber - point.handNumber;
  if (handsAgo === 1) return 'Prev';
  return `${handsAgo} hands ago`;
};

export const buildBankrollChartGeometry = (series) => {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      points: [],
      pointString: '',
      areaPath: '',
      minBalance: STARTING_BANKROLL,
      maxBalance: STARTING_BANKROLL,
      baselineY: CHART_HEIGHT / 2,
      yTicks: [],
      xTicks: [],
    };
  }

  const balances = series.map((point) => point.balance);
  const { minBalance, maxBalance, yTicks } = getNiceScale(balances);
  const chartLeft = CHART_PADDING.left;
  const chartRight = CHART_WIDTH - CHART_PADDING.right;
  const chartTop = CHART_PADDING.top;
  const chartBottom = CHART_HEIGHT - CHART_PADDING.bottom;
  const drawableWidth = chartRight - chartLeft;
  const drawableHeight = chartBottom - chartTop;
  const range = maxBalance - minBalance || 1;

  const points = series.map((point, index) => {
    const x =
      series.length === 1
        ? chartLeft + drawableWidth / 2
        : chartLeft + (drawableWidth * index) / (series.length - 1);
    const y =
      chartTop + ((maxBalance - point.balance) / range) * drawableHeight;
    return {
      ...point,
      x,
      y,
    };
  });

  const pointString = points
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');
  const linePath = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ');
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${chartBottom.toFixed(
    2
  )} L ${points[0].x.toFixed(2)} ${chartBottom.toFixed(2)} Z`;
  const startingBalance = series[0]?.balance ?? STARTING_BANKROLL;
  const baselineY =
    chartTop + ((maxBalance - startingBalance) / range) * drawableHeight;
  const latestHandNumber = series[series.length - 1]?.handNumber || 0;
  const middlePoint = points[Math.floor((points.length - 1) / 2)];
  const xTicks = [
    {
      key: 'start',
      x: points[0].x,
      label: formatXAxisLabel(points[0], latestHandNumber),
    },
    ...(points.length > 2
      ? [
          {
            key: 'middle',
            x: middlePoint.x,
            label: formatXAxisLabel(middlePoint, latestHandNumber),
          },
        ]
      : []),
    {
      key: 'current',
      x: lastPoint.x,
      label: formatXAxisLabel(lastPoint, latestHandNumber),
    },
  ].filter(
    (tick, index, ticks) =>
      tick.label &&
      ticks.findIndex((item) => item.label === tick.label) === index
  );

  return {
    points,
    pointString,
    areaPath,
    minBalance,
    maxBalance,
    baselineY,
    yTicks: yTicks.map((value) => ({
      value,
      y: chartTop + ((maxBalance - value) / range) * drawableHeight,
      label: formatBankrollAmount(value),
    })),
    xTicks,
  };
};

const BankrollGraph = ({ handHistory, currentBalance }) => {
  const series = buildBankrollSeries(handHistory);
  const [selectedRange, setSelectedRange] = useState('ALL');
  const visibleSeries = buildVisibleBankrollSeries(series, selectedRange);
  const hasCompletedHands = series.length > 1;
  const displayBalance = hasCompletedHands
    ? series[series.length - 1].balance
    : currentBalance;
  const startingBalance = hasCompletedHands ? visibleSeries[0].balance : null;
  const delta = hasCompletedHands ? displayBalance - startingBalance : 0;
  const trendClass = delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
  const geometry = buildBankrollChartGeometry(visibleSeries);
  const totalHandCount = Math.max(series.length - 1, 0);
  const visibleHandCount = Math.max(visibleSeries.length - 1, 0);
  const selectedRangeOption =
    BANKROLL_RANGE_OPTIONS.find((range) => range.key === selectedRange) ||
    BANKROLL_RANGE_OPTIONS[BANKROLL_RANGE_OPTIONS.length - 1];
  const selectedRangeLabel = selectedRangeOption.hands
    ? `Last ${Math.min(selectedRangeOption.hands, totalHandCount)} hands`
    : 'All hands';
  const graphLabel = hasCompletedHands
    ? `Bankroll graph from ${formatBankrollAmount(
        startingBalance
      )} to ${formatBankrollAmount(displayBalance)} over ${visibleHandCount} ${
        visibleHandCount === 1 ? 'hand' : 'hands'
      }`
    : 'Bankroll graph with no completed hands';

  return (
    <section
      className={`bankroll-graph ${trendClass}`}
      aria-labelledby="bankroll-graph-title"
    >
      <div className="bankroll-graph-header">
        <div>
          <span className="bankroll-graph-kicker">Bankroll</span>
          <h3 id="bankroll-graph-title" className="bankroll-graph-title">
            Trend
          </h3>
        </div>
        <strong>{formatBankrollAmount(displayBalance)}</strong>
      </div>

      <div
        className="bankroll-range-controls"
        role="group"
        aria-label="Bankroll range"
      >
        {BANKROLL_RANGE_OPTIONS.map((range) => (
          <button
            key={range.key}
            type="button"
            className={selectedRange === range.key ? 'is-active' : ''}
            aria-pressed={selectedRange === range.key}
            onClick={() => setSelectedRange(range.key)}
            disabled={!hasCompletedHands}
          >
            {range.label}
          </button>
        ))}
      </div>

      {hasCompletedHands ? (
        <>
          <svg
            className="bankroll-chart"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label={graphLabel}
            focusable="false"
          >
            {geometry.yTicks.map((tick) => (
              <g key={tick.label}>
                <line
                  className="bankroll-grid-line"
                  x1={CHART_PADDING.left}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={tick.y}
                  y2={tick.y}
                />
                <text
                  className="bankroll-axis-label bankroll-y-label"
                  x={CHART_PADDING.left - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                >
                  {tick.label}
                </text>
              </g>
            ))}
            <line
              className="bankroll-axis-line"
              x1={CHART_PADDING.left}
              x2={CHART_PADDING.left}
              y1={CHART_PADDING.top}
              y2={CHART_HEIGHT - CHART_PADDING.bottom}
            />
            <line
              className="bankroll-axis-line"
              x1={CHART_PADDING.left}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y1={CHART_HEIGHT - CHART_PADDING.bottom}
              y2={CHART_HEIGHT - CHART_PADDING.bottom}
            />
            <line
              className="bankroll-baseline"
              x1={CHART_PADDING.left}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y1={geometry.baselineY}
              y2={geometry.baselineY}
            />
            <path className="bankroll-area" d={geometry.areaPath} />
            <polyline className="bankroll-line" points={geometry.pointString} />
            {geometry.points.map((point, index) => (
              <circle
                key={point.id}
                className={`bankroll-point ${
                  index === geometry.points.length - 1 ? 'is-latest' : ''
                }`.trim()}
                cx={point.x}
                cy={point.y}
                r={index === geometry.points.length - 1 ? 3.5 : 2.5}
              >
                <title>
                  {point.label}: {formatBankrollAmount(point.balance)}
                </title>
              </circle>
            ))}
            {geometry.xTicks.map((tick) => (
              <text
                key={tick.key}
                className="bankroll-axis-label bankroll-x-label"
                x={tick.x}
                y={CHART_HEIGHT - 10}
                textAnchor={
                  tick.key === 'start'
                    ? 'start'
                    : tick.key === 'current'
                      ? 'end'
                      : 'middle'
                }
              >
                {tick.label}
              </text>
            ))}
          </svg>
          <div className="bankroll-range-summary">
            <span>{selectedRangeLabel}</span>
            <strong>Range net {formatBankrollDelta(delta)}</strong>
          </div>
        </>
      ) : (
        <p className="bankroll-empty">No completed hands yet.</p>
      )}
    </section>
  );
};

export default BankrollGraph;
