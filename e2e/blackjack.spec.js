import { expect, test } from '@playwright/test';

const emptyState = {
  playerHands: [],
  dealerHand: [],
  balance: 1000,
  currentBet: 0,
  bettingOpen: true,
  gameOver: false,
  numberOfDecks: 1,
  cardBackColor: 'red',
  dealerHitsOnSoft17: false,
  deckSize: 52,
  revealDealerCard: false,
  insuranceBet: 0,
  insuranceOffered: false,
  insuranceResolved: true,
  insuranceOutcome: null,
};

const dealtState = {
  ...emptyState,
  playerHands: [
    {
      cards: [
        { value: '10', suit: 'hearts' },
        { value: '7', suit: 'clubs' },
      ],
      bet: 25,
      isTurn: true,
      outcome: null,
      isBusted: false,
    },
  ],
  dealerHand: [
    { value: 'A', suit: 'spades' },
    { value: '9', suit: 'diamonds' },
  ],
  balance: 975,
  currentBet: 25,
  bettingOpen: false,
  deckSize: 48,
};

const mockBlackjackApi = async (page) => {
  await page.route('**/api/blackjack/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET' && url.pathname.endsWith('/state')) {
      await route.fulfill({ json: emptyState });
      return;
    }

    if (request.method() === 'POST' && url.pathname.endsWith('/bet')) {
      await route.fulfill({ json: { ...emptyState, currentBet: 25 } });
      return;
    }

    if (request.method() === 'GET' && url.pathname.endsWith('/start')) {
      await route.fulfill({ json: dealtState });
      return;
    }

    await route.fulfill({ json: dealtState });
  });
};

const clickChip = async (page, amount) => {
  await page
    .locator('.chip-img')
    .filter({ has: page.getByAltText(`$${amount} chip`) })
    .click({ force: true });
};

test.describe('blackjack client', () => {
  test.beforeEach(async ({ page }) => {
    await mockBlackjackApi(page);
  });

  test('loads the table and betting controls', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Blackjack/);
    await expect(
      page.getByRole('heading', { name: 'Blackjack' })
    ).toBeVisible();
    await expect(page.locator('.betting-panel')).toBeVisible();
    await expect(page.getByText('Balance')).toBeVisible();
    await expect(page.locator('.table-insights')).toBeVisible();
    await expect(
      page.locator('.bankroll-graph').getByText('No completed hands yet.')
    ).toBeVisible();
    await expect(page.getByAltText('$25 chip')).toBeVisible();
    await expect(page.getByRole('button', { name: 'DEAL' })).toBeDisabled();

    const bettingPanelBox = await page.locator('.betting-panel').boundingBox();
    const tableSurfaceBox = await page.locator('.table-surface').boundingBox();
    expect(bettingPanelBox).not.toBeNull();
    expect(tableSurfaceBox).not.toBeNull();
    expect(bettingPanelBox.height).toBeLessThanOrEqual(
      tableSurfaceBox.height + 24
    );
  });

  test('fits the iPad Pro viewport without horizontal clipping', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/');

    await expect(page.locator('.table-layout')).toBeVisible();
    await expect(page.locator('.table-surface')).toBeVisible();

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    const layoutBox = await page.locator('.table-layout').boundingBox();
    const surfaceBox = await page.locator('.table-surface').boundingBox();
    expect(layoutBox).not.toBeNull();
    expect(surfaceBox).not.toBeNull();
    expect(layoutBox.x + layoutBox.width).toBeLessThanOrEqual(1024);
    expect(surfaceBox.x + surfaceBox.width).toBeLessThanOrEqual(1024);
  });

  test('opens settings and stats panels', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Game settings' }).click();
    await expect(
      page.getByRole('heading', { name: 'Game Settings' })
    ).toBeVisible();
    await expect(page.getByText('Dealer Hits on Soft 17')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Show stats' }).click();
    await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
    await expect(page.getByText('Highest Bankroll')).toBeVisible();
  });

  test('places a bet and deals a hand', async ({ page }) => {
    await page.goto('/');

    await clickChip(page, 25);

    await expect(
      page
        .locator('.betting-summary')
        .filter({ hasText: 'Current Bet' })
        .locator('strong')
    ).toHaveText('$25');

    await page.getByRole('button', { name: 'DEAL' }).click();

    await expect(page.getByRole('button', { name: 'HIT' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'STAND' })).toBeVisible();
    await expect(page.getByAltText('10 of hearts')).toBeVisible({
      timeout: 4_000,
    });
  });
});
