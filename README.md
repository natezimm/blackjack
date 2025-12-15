[![CI](https://github.com/natezimm/blackjack/actions/workflows/deploy.yml/badge.svg)](https://github.com/natezimm/blackjack/actions/workflows/deploy.yml)
[![Coverage](https://img.shields.io/badge/coverage-checked-brightgreen)](#testing--quality)

# Blackjack Game

Full-stack Blackjack experience pairing a React 18 front-end with a modernized Spring Boot 3 backend running on Java 21 (LTS). The game threads RESTful APIs through Axios so the UI stays in sync with an always-session stateful dealer and wallet.

## Highlights
- **Live balance and betting**: Players start with \$1,000, place bets each round, can forfeit a round, and the backend keeps the current bet, balance, deck size, and double-down flag in the session.
- **Configurable dealer behavior**: You can choose whether the dealer hits on soft 17 and select 1 / 2 / 4 / 6 / 8 decks before a new deal.
- **Standard Blackjack moves**: Hit, stand, and double down are all supported, with automatic dealer play and round resolution logic managed server-side.

## Technology Stack
- **Frontend**: React 18 with `react-scripts`, `axios`, and the usual testing helpers (`@testing-library/*`).
- **Backend**: Spring Boot 3.x (`org.springframework.boot:spring-boot-starter-web`) orchestrated with Gradle via the wrapper and built-in JaCoCo reports with enforced coverage.

## Project Layout
- `server/`: Spring Boot service exposing `/api/blackjack/*` endpoints, game state objects, and card/deck logic plus Gradle configuration, tests, and Dockerfile.
- `client/`: React SPA that renders the blackjack table, exposes betting controls, and hits the backend API through Axios helpers.

## Prerequisites
- Java 21+ (for the backend and Docker image).
- Node.js + npm (for the frontend).
- Gradle is provided via the wrapper (`./gradlew`).

## Running Locally

### Backend
1. `cd server`
2. `./gradlew bootRun`
3. The service listens on `http://localhost:8080`; set `ALLOWED_ORIGINS` in the environment if you need to whitelist a different frontend origin.

### Frontend
1. `cd client`
2. `npm install`
3. `npm start`
4. The React app starts on `http://localhost:3000` and proxies API calls to the backend (configured via `.env` or the default development proxy).

## API Reference
- `GET /api/blackjack/start?decks=<1|2|4|6|8>&dealerHitsOnSoft17=<true|false>` – initialize a round (`decks` defaults to 1, `dealerHitsOnSoft17` defaults to false).
- `POST /api/blackjack/bet` – body `{ "amount": <int> }`, places the bet before dealing; betting is rejected once cards are dealt.
- `POST /api/blackjack/hit` – draws a card for the player and updates the session state.
- `POST /api/blackjack/stand` – resolves the round by letting the dealer play, then determines win/tie/loss and adjusts the balance.
- `POST /api/blackjack/doubledown` – doubles the bet, deals exactly one card, then forces a stand/dealer resolution.
- `GET /api/blackjack/state` – returns the current hands, balance, bet, deck size, whether betting is open, and soft 17 setting.
- `POST /api/blackjack/reset` – optional body `{ "decks": <int>, "dealerHitsOnSoft17": <bool> }`, clears the session, and starts fresh with the requested configuration.
- `GET /api/blackjack/gameover` – indicates if the current round has been marked as finished.

The controller stores `BlackjackGame` in the HTTP session so each client keeps its own ongoing hand, balance, and configuration.

## Gameplay Features
- Players can place custom bets, forfeit a round, or double down (with balance enforced per round).
- Dealer hits logic respects the soft 17 toggle and keeps drawing until the rules are satisfied.
- Both player and dealer hands, along with the deck, persist until a new round/reset so the UI can reflect remaining cards and betting status.

## Testing
- Run backend tests with `./gradlew test` and inspect the HTML report at `server/build/reports/tests/test/index.html` (54 tests passing as of the latest run).
- Run frontend tests with `npm test` and capture coverage via `npm run test:coverage`.

## Testing & Quality

- CI runs frontend (React) and backend (Spring Boot) test suites before deployment
- Code coverage is checked and enforced automatically
- Coverage thresholds:
  - Lines ≥ 90%
  - Statements ≥ 85%
  - Functions ≥ 85%
  - Branches ≥ 80%

## Additional Resources
- `server/HELP.md` contains helpful Gradle/Spring guides if you need extra reference material or want to extend the backend.
