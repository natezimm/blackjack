import { render } from '@testing-library/react';
import CardSweep, { captureCardsForCollection } from './CardSweep';

it('captures the visible card face and accounts for the padded table border', () => {
  const { container } = render(
    <div className="table-surface">
      <div data-card-collection="" />
      <div className="hand">
        <div className="card-container">
          <div className="card-inner">
            <div className="card-back">
              <img src="/back.png" alt="Back" />
            </div>
            <div className="card-front">
              <img src="/ace.png" alt="Ace" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const table = container.firstChild;
  table.getBoundingClientRect = () => ({ x: 10, y: 20 });
  Object.defineProperty(table, 'clientLeft', { value: 8 });
  Object.defineProperty(table, 'clientTop', { value: 8 });
  table.querySelector('[data-card-collection]').getBoundingClientRect = () => ({
    x: 30,
    y: 40,
    width: 40,
    height: 60,
  });
  table.querySelector('.card-container').getBoundingClientRect = () => ({
    x: 100,
    y: 200,
    width: 90,
    height: 130,
  });
  const cards = captureCardsForCollection(table);
  expect(cards[0].src).toContain('/back.png');
  expect(cards[0].style).toMatchObject({
    left: 82,
    top: 172,
    '--collection-x': '-95px',
    '--collection-y': '-195px',
  });
  table.querySelector('.card-inner').classList.add('flipped');
  expect(captureCardsForCollection(table)[0].src).toContain('/ace.png');
  const sweep = render(<CardSweep cards={cards} />);
  expect(sweep.container.firstChild).toHaveAttribute('aria-hidden', 'true');
});
