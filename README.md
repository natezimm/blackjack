[![CI](https://github.com/natezimm/blackjack/actions/workflows/deploy.yml/badge.svg)](https://github.com/natezimm/blackjack/actions/workflows/deploy.yml)
[![Coverage](https://img.shields.io/badge/coverage-checked-brightgreen)](#testing--quality)

# Blackjack Game

Full-stack Blackjack: a React 18 SPA backed by a Spring Boot 3 (Java 21) API. Game state lives in the server-side HTTP session (cookies) and the UI can also resume from a local snapshot.

## Features
- **Bankroll + betting**: start at $1,000; chips add to the current bet before dealing.
- **Multi-hand play**: **split** pairs into multiple hands and play them sequentially.
- **Standard actions**: hit, stand, double down.
- **Insurance**: offered when the dealer shows an Ace; must be resolved before playing.
- **Rules + table settings**: number of decks (1/2/4/6/8) and “dealer hits soft 17”.
- **Resume + stats** (client): optional resume prompt and per-browser stats (win streaks, best payout, etc.).

## Technology Stack
- **Frontend**: React 18 (`react-scripts`) + Axios.
- **Backend**: Spring Boot 3.2 (Gradle) with Spring Security and JaCoCo coverage verification.

## Security
The application includes security best practices aligned with OWASP Top 10 guidelines:

- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- **Input Validation**: Server-side validation with Jakarta Bean Validation (`@Valid`, `@Min`, `@Max`)
- **CORS Hardening**: Environment-based configuration; production restricts to specific origins
- **Session Security**: HTTP-only, SameSite cookies with configurable secure flag
- **HTTPS Enforcement**: Client-side URL validation enforces HTTPS in production
- **Prototype Pollution Protection**: Safe JSON parsing utilities

See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for a full security audit report.

## Project Layout
- `server/`: Spring Boot API (`/api/blackjack/*`), session-backed game engine, tests, and coverage gates.
- `client/`: React UI, API wrapper (`client/src/api/blackjackApi.js`), and component tests.

## Prerequisites
- Java 21 (backend toolchain).
- Node.js 22 (see `.nvmrc`) + npm.
- Gradle via wrapper (`server/gradlew`).

## Running Locally

### Backend
1. `cd server`
2. `./gradlew bootRun`
3. API listens on `http://localhost:8080`

The backend enables CORS for `/api/**` with credentials. Allowed origins are configured via `app.cors.allowed-origins` in `application.properties` (defaults to localhost for development). For production, use `application-prod.properties` or set the environment variable.

### Frontend
1. `cd client`
2. `npm install`
3. `npm start`
4. App runs on `http://localhost:3000`

The client reads `REACT_APP_API_URL` (see `client/.env`) and sends requests with `withCredentials: true` so the backend session cookie is preserved.

## API Reference
Base path: `/api/blackjack` (responses are JSON; most endpoints return the full `GameResponse` snapshot).

- `POST /bet` – body `{ "amount": <int> }` sets the **total** bet for the next deal (only while betting is open).
- `GET /start?decks=<1|2|4|6|8>&dealerHitsOnSoft17=<true|false>` – shuffles/configures and deals the round.
- `POST /hit` – hit the active player hand.
- `POST /stand` – stand the active player hand; moves to next hand or dealer play.
- `POST /doubledown` – double the active hand bet, draw exactly one card, then auto-stand.
- `POST /split` – split a pair into two hands (requires enough balance for the second bet).
- `POST /insurance` – body `{ "amount": <int> }` resolves insurance (0 = decline); only when dealer shows an Ace and before the player acts.
- `GET /state` – fetch current session state (hands, balance, deck size, flags, insurance state).
- `POST /reset` – body `{ "decks": <int>, "dealerHitsOnSoft17": <bool> }` resets the session game (does not deal).
- `GET /gameover` – returns `true|false`.

The controller stores `BlackjackGame` in the HTTP session, so each browser session gets its own isolated game.

## Testing
- Backend: `cd server && ./gradlew test jacocoTestCoverageVerification`
- Frontend: `cd client && npm test` or `npm run test:coverage`

## Testing & Quality
- Frontend coverage thresholds are enforced via Jest (`client/package.json`): lines ≥ 90%, statements ≥ 85%, functions ≥ 85%, branches ≥ 80%.
- Backend coverage thresholds are enforced via JaCoCo (`server/build.gradle`): line ≥ 0.90, instruction ≥ 0.85, method ≥ 0.85, branch ≥ 0.80.

## Additional Resources
- `server/HELP.md` contains helpful Gradle/Spring guides if you need extra reference material or want to extend the backend.

## CI / Deploy
GitHub Actions (`.github/workflows/deploy.yml`) runs frontend + backend tests/coverage on pushes to `main`, then SSHes into Lightsail to run an external deploy script.

## Docker (server)
`server/Dockerfile` is currently out of sync with the Java 21 / Spring Boot 3 build (it uses Java 11). If you want Docker support, update the base images/tooling to Java 21+ first.
