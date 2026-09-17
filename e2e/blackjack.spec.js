import { expect, test } from '@playwright/test';

const INITIAL_DEAL_TIMEOUT_MS = 8_000;

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

const hitState = {
  ...dealtState,
  playerHands: [
    {
      ...dealtState.playerHands[0],
      cards: [
        ...dealtState.playerHands[0].cards,
        { value: '2', suit: 'diamonds' },
      ],
    },
  ],
  deckSize: 47,
};

const settlementStartState = {
  ...dealtState,
  dealerHand: [
    { value: '10', suit: 'spades' },
    { value: '6', suit: 'diamonds' },
  ],
};

const settlementState = (outcome) => ({
  ...settlementStartState,
  playerHands: [
    { ...settlementStartState.playerHands[0], isTurn: false, outcome },
  ],
  dealerHand: [
    ...settlementStartState.dealerHand,
    { value: { WIN: '10', LOSS: '4', TIE: 'A' }[outcome], suit: 'clubs' },
  ],
  balance: { WIN: 1025, LOSS: 975, TIE: 1000 }[outcome],
  currentBet: 0,
  bettingOpen: true,
  gameOver: true,
  deckSize: 47,
});

const mockBlackjackApi = async (page, responses = {}) => {
  await page.route('**/api/blackjack/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET' && url.pathname.endsWith('/state')) {
      await route.fulfill({ json: responses.state || emptyState });
      return;
    }

    if (request.method() === 'POST' && url.pathname.endsWith('/bet')) {
      await route.fulfill({ json: { ...emptyState, currentBet: 25 } });
      return;
    }

    if (request.method() === 'GET' && url.pathname.endsWith('/start')) {
      await route.fulfill({ json: responses.start || dealtState });
      return;
    }

    if (url.pathname.endsWith('/hit')) {
      await route.fulfill({ json: responses.hit || hitState });
      return;
    }

    if (url.pathname.endsWith('/split') && responses.split) {
      await route.fulfill({ json: responses.split });
      return;
    }

    if (url.pathname.endsWith('/stand') && responses.stand) {
      await route.fulfill({ json: responses.stand });
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

const observeDealerFlip = async (page) => {
  await page.addInitScript(() => {
    window.dealerFlipTimeline = {
      gesture: null,
      holeFlippedAt: null,
      nextDealerCardAt: null,
    };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const timeline = window.dealerFlipTimeline;
      if (this.matches('[data-dealer-flip-hand]')) {
        const hole = document.querySelector('[data-dealer-hole-card]');
        const inner = document.querySelector('.dealer-hand .card-inner');
        const contact = this.querySelector('[data-dealer-flip-contact]');
        const holeBounds = hole?.getBoundingClientRect();
        const contactBounds = contact?.getBoundingClientRect();
        const reached = new DOMMatrix(keyframes[1].transform);
        timeline.gesture = {
          startedAt: performance.now(),
          duration: options.duration,
          reachDuration: keyframes[1].offset * options.duration,
          holeAlreadyFlipped: inner?.classList.contains('flipped'),
          contactError:
            holeBounds && contactBounds
              ? Math.hypot(
                  contactBounds.x +
                    contactBounds.width / 2 +
                    reached.m41 -
                    (holeBounds.x + holeBounds.width * 0.08),
                  contactBounds.y +
                    contactBounds.height / 2 +
                    reached.m42 -
                    (holeBounds.y + holeBounds.height * 0.38)
                )
              : null,
        };
      } else if (
        this.matches('[data-card-deal]') &&
        this.closest('.dealer-hand') &&
        timeline.gesture &&
        timeline.nextDealerCardAt === null
      ) {
        timeline.nextDealerCardAt = performance.now();
      }
      return animate.call(this, keyframes, options);
    };

    new MutationObserver(() => {
      const timeline = window.dealerFlipTimeline;
      const inner = document.querySelector('.dealer-hand .card-inner');
      if (
        timeline.gesture &&
        timeline.holeFlippedAt === null &&
        inner?.classList.contains('flipped')
      ) {
        timeline.holeFlippedAt = performance.now();
        const style = getComputedStyle(inner);
        const properties = style.transitionProperty.split(', ');
        const durations = style.transitionDuration.split(', ');
        const transformIndex = properties.indexOf('transform');
        timeline.flipDuration =
          Number.parseFloat(durations[Math.max(0, transformIndex)]) * 1000;
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });
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
    await expect(page.locator('.dealer-scene')).toBeVisible();
    await expect(page.locator('[data-card-shoe]')).toBeVisible();
    await expect(page.locator('[data-shoe-card]')).toBeVisible();
    await expect(page.locator('[data-card-shoe-exit]')).toHaveCount(1);
    await expect(page.locator('.dealer-discard')).toBeHidden();
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

  test('draws split replacements separately and waits for the second landing', async ({
    page,
  }) => {
    const pair = [
      { value: '8', suit: 'hearts' },
      { value: '8', suit: 'clubs' },
    ];
    const start = {
      ...dealtState,
      playerHands: [{ ...dealtState.playerHands[0], cards: pair }],
    };
    const split = {
      ...start,
      balance: 950,
      currentBet: 50,
      deckSize: 46,
      playerHands: [
        {
          ...start.playerHands[0],
          cards: [pair[0], { value: '3', suit: 'spades' }],
        },
        {
          ...start.playerHands[0],
          isTurn: false,
          cards: [pair[1], { value: 'K', suit: 'diamonds' }],
        },
      ],
    };
    await mockBlackjackApi(page, { start, split });
    await page.goto('/');
    await clickChip(page, 25);
    await page.getByRole('button', { name: 'DEAL', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'SPLIT', exact: true })
    ).toBeEnabled({ timeout: INITIAL_DEAL_TIMEOUT_MS });
    await page.evaluate(() => {
      window.splitDrawTimes = [];
      document.addEventListener('animationstart', (event) => {
        if (event.target.matches('.shoe-extracted-card'))
          window.splitDrawTimes.push(performance.now());
      });
    });
    await page.getByRole('button', { name: 'SPLIT', exact: true }).click();
    await expect(page.locator('.player-hand')).toHaveCount(2);
    await expect(
      page.getByRole('button', { name: 'HIT', exact: true })
    ).toBeDisabled();
    await expect
      .poll(() => page.evaluate(() => window.splitDrawTimes.length))
      .toBe(2);
    await expect(
      page.getByRole('button', { name: 'HIT', exact: true })
    ).toBeDisabled();
    const drawTimes = await page.evaluate(() => window.splitDrawTimes);
    expect(drawTimes[1] - drawTimes[0]).toBeGreaterThan(1_100);
    await expect(
      page.getByRole('button', { name: 'HIT', exact: true })
    ).toBeEnabled();
    await expect(page.getByAltText('3 of spades')).toBeVisible();
    await expect(page.getByAltText('K of diamonds')).toBeVisible();
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

  test('moves wager chips and deals cards from the shoe through a hit', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.dealtCardFlights = [];
      window.shoeExtractions = [];
      document.addEventListener('animationstart', (event) => {
        if (event.target.matches('.shoe-extracted-card')) {
          const animation = event.target
            .getAnimations()
            .find((entry) => entry.animationName === event.animationName);
          const frames = animation?.effect.getKeyframes() || [];
          window.shoeExtractions.push({
            name: event.animationName,
            duration: animation?.effect.getTiming().duration,
            startedAt: performance.now(),
            transforms: frames.map((frame) => frame.transform).filter(Boolean),
          });
        }
      });
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        if (this.matches('[data-card-deal]')) {
          const shoe = document.querySelector('[data-card-shoe-exit]');
          const origin = shoe?.getBoundingClientRect();
          const destination = this.getBoundingClientRect();
          const firstVisibleFrame = keyframes.findIndex(
            (frame) => Number(frame.opacity) > 0
          );
          const visibleFrame = keyframes[firstVisibleFrame];
          const transform = new DOMMatrix(visibleFrame.transform);
          window.dealtCardFlights.push({
            duration: options.duration,
            hiddenLeadIn:
              firstVisibleFrame > 0 &&
              keyframes
                .slice(0, firstVisibleFrame)
                .every((frame) => Number(frame.opacity) === 0),
            hiddenDuration: visibleFrame.offset * options.duration,
            distance: Math.hypot(transform.m41, transform.m42),
            widthError: origin
              ? Math.abs(destination.width * transform.m11 - origin.width)
              : null,
            originError: origin
              ? Math.hypot(
                  destination.x +
                    destination.width / 2 +
                    transform.m41 -
                    origin.x -
                    origin.width / 2,
                  destination.y +
                    destination.height / 2 +
                    transform.m42 -
                    origin.y -
                    origin.height / 2
                )
              : null,
          });
        }
        return animate.call(this, keyframes, options);
      };
    });
    await page.goto('/');

    await clickChip(page, 25);

    await expect(
      page
        .locator('.betting-summary')
        .filter({ hasText: 'Current Bet' })
        .locator('strong')
    ).toHaveText('$25');
    await expect(page.locator('.table-wager')).toContainText('$25 on the felt');

    await page.getByRole('button', { name: 'DEAL' }).click();

    await expect(page.getByRole('button', { name: 'HIT' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'STAND' })).toBeVisible();
    await expect(page.getByAltText('10 of hearts')).toBeVisible({
      timeout: 4_000,
    });
    await expect(
      page.getByRole('button', { name: 'HIT', exact: true })
    ).toBeEnabled({ timeout: INITIAL_DEAL_TIMEOUT_MS });
    await page.screenshot({
      path: test.info().outputPath('table-in-play.png'),
      fullPage: true,
    });
    await page.locator('.dealer-scene').screenshot({
      path: test.info().outputPath('dealer-detail.png'),
    });

    const dealPulse = Number(
      await page.locator('.dealer-scene').getAttribute('data-deal-pulse')
    );
    expect(dealPulse).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'HIT', exact: true }).click();
    await expect(page.getByAltText('2 of diamonds')).toBeVisible();
    await expect
      .poll(async () =>
        Number(
          await page.locator('.dealer-scene').getAttribute('data-deal-pulse')
        )
      )
      .toBeGreaterThan(dealPulse);
    await expect(
      page.getByRole('button', { name: 'STAND', exact: true })
    ).toBeEnabled();

    await expect
      .poll(() => page.evaluate(() => window.dealtCardFlights.length))
      .toBe(5);
    await expect
      .poll(() => page.evaluate(() => window.shoeExtractions.length))
      .toBe(5);
    const flights = await page.evaluate(() => window.dealtCardFlights);
    for (const flight of flights) {
      expect(flight.duration).toBe(1_200);
      expect(flight.hiddenLeadIn).toBe(true);
      expect(flight.hiddenDuration).toBe(360);
      expect(flight.distance).toBeGreaterThan(20);
      expect(flight.originError).not.toBeNull();
      expect(flight.originError).toBeLessThan(1);
      expect(flight.widthError).not.toBeNull();
      expect(flight.widthError).toBeLessThan(1);
    }
    const extractions = await page.evaluate(() => window.shoeExtractions);
    for (const extraction of extractions) {
      expect(extraction.name).toBe('shoe-card-extract');
      expect(extraction.duration).toBe(360);
      expect(new Set(extraction.transforms).size).toBeGreaterThan(1);
    }
    for (let index = 1; index < 4; index += 1) {
      expect(
        extractions[index].startedAt - extractions[index - 1].startedAt
      ).toBeGreaterThan(1_250);
    }
    const restingCards = await page
      .locator('[data-card-deal]')
      .evaluateAll((cards) =>
        cards.flatMap((card) =>
          [card, ...card.querySelectorAll('.card-motion-surface, .card')].map(
            (surface) => {
              const transform = new DOMMatrix(
                getComputedStyle(surface).transform
              );
              return { rotationX: transform.m12, rotationY: transform.m21 };
            }
          )
        )
      );
    for (const card of restingCards) {
      expect(card.rotationX).toBeCloseTo(0);
      expect(card.rotationY).toBeCloseTo(0);
    }
    await expect(page.locator('.dealer-discard')).toBeHidden();
  });

  test('rests clear of the shoe and reaches it when hitting after responsive resizes', async ({
    page,
  }) => {
    const cards = [
      { value: '2', suit: 'clubs' },
      { value: '2', suit: 'hearts' },
    ];
    const state = {
      ...dealtState,
      playerHands: [{ ...dealtState.playerHands[0], cards: [...cards] }],
    };
    const responses = { state };
    await mockBlackjackApi(page, responses);
    await page.addInitScript(() => {
      window.dealerDealContacts = [];
      document.addEventListener('animationstart', (event) => {
        if (event.animationName !== 'dealer-deal-gesture') return;
        const arm = event.target;
        const animation = arm
          .getAnimations()
          .find((entry) => entry.animationName === event.animationName);
        animation.pause();
        animation.currentTime = 360;
        const contact = arm
          .querySelector('[data-dealer-deal-contact]')
          .getBoundingClientRect();
        const exit = arm
          .closest('.dealer-scene')
          .querySelector('[data-card-shoe-exit]')
          .getBoundingClientRect();
        window.dealerDealContacts.push(
          Math.hypot(
            contact.x + contact.width / 2 - exit.x - exit.width / 2,
            contact.y + contact.height / 2 - exit.y - exit.height / 2
          )
        );
        animation.play();
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    const hit = page.getByRole('button', { name: 'HIT', exact: true });

    for (const width of [320, 390, 600, 760, 768, 820, 1024, 1280]) {
      await expect(hit).toBeEnabled();
      await page.setViewportSize({ width, height: 900 });
      const restingArm = await page
        .locator('.dealer-dealing-arm')
        .boundingBox();
      const shoe = await page.locator('.dealer-card-shoe').boundingBox();
      expect(
        shoe.x - restingArm.x - restingArm.width,
        `resting hand clearance at ${width}px`
      ).toBeGreaterThan(4);
      cards.push({ value: '2', suit: 'diamonds' });
      responses.hit = {
        ...state,
        playerHands: [{ ...state.playerHands[0], cards: [...cards] }],
        deckSize: state.deckSize - cards.length + 2,
      };
      const previousContacts = await page.evaluate(
        () => window.dealerDealContacts.length
      );
      await hit.click();
      await expect
        .poll(() => page.evaluate(() => window.dealerDealContacts.length))
        .toBe(previousContacts + 1);
      const contactError = await page.evaluate(() =>
        window.dealerDealContacts.at(-1)
      );
      expect(contactError, `shoe contact at ${width}px`).toBeLessThan(1);
    }
  });

  for (const { outcome, settlement, label } of [
    { outcome: 'WIN', settlement: 'win', label: '$50 returned' },
    { outcome: 'LOSS', settlement: 'loss', label: '$25 collected' },
    { outcome: 'TIE', settlement: 'push', label: '$25 returned' },
  ]) {
    test(`settles a ${outcome.toLowerCase()} wager after the dealer finishes`, async ({
      page,
    }) => {
      if (outcome === 'WIN') {
        test.setTimeout(45_000);
        await observeDealerFlip(page);
      }
      await mockBlackjackApi(page, {
        start: settlementStartState,
        stand: settlementState(outcome),
      });
      await page.goto('/');
      await clickChip(page, 25);
      await page.getByRole('button', { name: 'DEAL', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'STAND', exact: true })
      ).toBeEnabled({ timeout: INITIAL_DEAL_TIMEOUT_MS });

      await expect(page.locator('[data-dealer-hole-card]')).toHaveCount(1);
      await expect(page.locator('.dealer-hand .card-inner')).not.toHaveClass(
        /flipped/
      );
      await page.getByRole('button', { name: 'STAND', exact: true }).click();
      if (outcome === 'WIN') {
        await page.waitForFunction(
          () => window.dealerFlipTimeline.holeFlippedAt !== null,
          null,
          { timeout: 5_000 }
        );
        await page.locator('.table-surface').screenshot({
          path: test.info().outputPath('table-at-flip-contact.png'),
        });
      }
      await expect(page.locator('.dealer-hand .card-inner')).toHaveClass(
        /flipped/
      );
      await expect(page.locator('.table-wager')).not.toHaveAttribute(
        'data-settlement',
        /win|push|loss|mixed/
      );
      await expect(page.locator('.table-wager')).toContainText(
        '$25 on the felt'
      );

      await expect(page.locator('.table-wager')).toHaveAttribute(
        'data-settlement',
        settlement
      );
      await expect(page.locator('.table-wager')).toContainText(label);
      await expect(
        page.getByAltText(
          `${{ WIN: '10', LOSS: '4', TIE: 'A' }[outcome]} of clubs`
        )
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Add $25 to wager', exact: true })
      ).toBeEnabled();
      await clickChip(page, 25);
      await expect(
        page.getByRole('button', { name: 'DEAL', exact: true })
      ).toBeEnabled();

      if (outcome === 'WIN') {
        const timeline = await page.evaluate(() => window.dealerFlipTimeline);
        expect(timeline.gesture).not.toBeNull();
        expect(timeline.gesture.holeAlreadyFlipped).toBe(false);
        expect(timeline.gesture.duration).toBe(1_900);
        expect(timeline.gesture.reachDuration).toBeCloseTo(550);
        expect(timeline.gesture.contactError).not.toBeNull();
        expect(timeline.gesture.contactError).toBeLessThan(1);
        expect(
          timeline.holeFlippedAt - timeline.gesture.startedAt
        ).toBeGreaterThanOrEqual(timeline.gesture.reachDuration - 50);
        expect(timeline.flipDuration).toBe(850);
        expect(timeline.nextDealerCardAt).not.toBeNull();
        expect(
          timeline.nextDealerCardAt - timeline.gesture.startedAt
        ).toBeGreaterThanOrEqual(timeline.gesture.duration + 200);

        const previousDealPulse = Number(
          await page.locator('.dealer-scene').getAttribute('data-deal-pulse')
        );
        await page.evaluate(() => {
          window.sweptCardFrames = [];
          document.addEventListener('animationstart', (event) => {
            if (event.target.matches('.card-sweep img')) {
              const bounds = event.target.getBoundingClientRect();
              window.sweptCardFrames.push({
                src: event.target.getAttribute('src'),
                width: bounds.width,
                height: bounds.height,
              });
            }
          });
        });

        await page.getByRole('button', { name: 'DEAL', exact: true }).click();
        await expect(
          page.getByRole('button', { name: 'HIT', exact: true })
        ).toBeEnabled({ timeout: INITIAL_DEAL_TIMEOUT_MS });
        await expect(page.locator('.dealer-scene')).toHaveAttribute(
          'data-deal-pulse',
          `${previousDealPulse + 4}`
        );
        const sweptCards = await page.evaluate(() => window.sweptCardFrames);
        expect(sweptCards.length).toBeGreaterThan(0);
        for (const card of sweptCards) {
          expect(card.src).toContain('/card-images/');
          expect(card.width).toBeGreaterThan(0);
          expect(card.height).toBeGreaterThan(0);
        }
        await expect(page.locator('.card-sweep img')).toHaveCount(0);
        await expect(page.locator('.table-surface .outcome-badge')).toHaveCount(
          0
        );
        await expect(page.locator('.table-wager')).not.toHaveAttribute(
          'data-settlement',
          /win|push|loss|mixed/
        );
        await expect(page.locator('.table-wager')).toContainText(
          '$25 on the felt'
        );
        await expect(page.locator('.table-wager')).not.toContainText(
          '$50 returned'
        );
        await expect(page.locator('.dealer-hand [data-card-deal]')).toHaveCount(
          2
        );
        await expect(page.locator('.player-hand [data-card-deal]')).toHaveCount(
          2
        );
      }
    });
  }

  test('resumes a wager for the next round without restoring the previous payout', async ({
    page,
  }) => {
    await mockBlackjackApi(page, {
      state: {
        ...settlementState('WIN'),
        currentBet: 100,
        balance: 1050,
        revealDealerCard: true,
      },
    });
    await page.goto('/');
    await expect(
      page.getByRole('dialog', { name: 'Resume your game?' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();

    await expect(page.locator('.table-wager')).toContainText(
      '$100 on the felt'
    );
    await expect(page.locator('.table-wager')).not.toHaveAttribute(
      'data-settlement',
      /win|push|loss|mixed/
    );
    await expect(page.locator('.table-wager')).not.toContainText(
      '$50 returned'
    );
    await expect(
      page.getByRole('button', { name: 'DEAL', exact: true })
    ).toBeEnabled();
  });

  test('reduced motion completes dealing and actions without animation timers', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: new Date('2026-09-13T12:00:00Z') });
    await mockBlackjackApi(page, {
      start: settlementStartState,
      hit: { ...hitState, dealerHand: settlementStartState.dealerHand },
      stand: settlementState('WIN'),
    });
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'DEAL', exact: true })
    ).toBeVisible();
    await page.clock.pauseAt(new Date('2026-09-13T12:00:10Z'));

    await clickChip(page, 25);
    await expect(
      page.getByRole('button', { name: 'DEAL', exact: true })
    ).toBeEnabled();
    await page
      .getByRole('button', { name: 'DEAL', exact: true })
      .click({ force: true });
    await expect(page.getByAltText('7 of clubs')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'HIT', exact: true })
    ).toBeEnabled();
    await page
      .getByRole('button', { name: 'HIT', exact: true })
      .click({ force: true });
    await expect(page.getByAltText('2 of diamonds')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'STAND', exact: true })
    ).toBeEnabled();
    await page
      .getByRole('button', { name: 'STAND', exact: true })
      .click({ force: true });
    await expect(page.locator('.table-wager')).toContainText('$50 returned');
    await expect(
      page.getByRole('button', { name: 'Add $25 to wager', exact: true })
    ).toBeEnabled();

    expect(
      await page
        .locator('.table-surface')
        .evaluate(
          (table) =>
            table
              .getAnimations({ subtree: true })
              .filter((animation) => animation.playState === 'running').length
        )
    ).toBe(0);
  });
});
