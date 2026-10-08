# Blackjack agent guide

## Scope and workspace

Blackjack pairs a React/Vite client with a Spring Boot API. The server owns game rules, bankroll, and round state in an HTTP session; browser persistence supports UI resume and statistics. Production is `blackjack.nathanzimmerman.com`.

This repo and siblings `../nathanzimmerman.com`, `../brick-breaker-resume`, `../nerdle`, and `../sudoku` are separate Git repositories, not npm workspaces. Read a sibling's guide before changing it. Check the working tree and preserve unrelated changes. See `docs/architecture.md` for context; executable configuration takes precedence over stale prose.

## Where to work

- `client/src/components/BlackjackGame.js` and hand/card/chip components: game presentation and interaction.
- `client/src/api/blackjackApi.js`: Axios API wrapper; requests must preserve session credentials.
- `client/src/utils/`: card helpers, basic strategy, and security utilities.
- `server/src/main/java/com/game/blackjack/`: `BlackjackController`, `BlackjackSessionService`, `BlackjackGame`, request models, security, and rate limiting; `dto/` holds response contracts.
- `server/src/main/resources/application*.properties`: Spring configuration, including session cookies and the `prod` profile.
- Colocated client `*.test.js`, backend `server/src/test/java/`, and `e2e/blackjack.spec.js`: test entry points.

## Commands and runtime caveats

Java **25** is specified by `server/build.gradle` and CI. The client uses **Vite/Vitest**, despite older README references to CRA/Jest and Java 21. Node declarations conflict: `.nvmrc` and CI select 22, while root/client manifests declare 26. Record the runtime used and any resulting failures when validating changes.

Commands below run from the repository root unless a directory is stated.

- Install both npm packages: `npm ci`, then `npm ci --prefix client`.
- API: in `server/`, run `./gradlew bootRun` (port 8080). Use the Gradle wrapper.
- Client: `npm start --prefix client` (port 3000).
- Client API configuration: Vite bridges `REACT_APP_API_URL`; keep this legacy name. Development falls back to `http://localhost:8080/api/blackjack`. For production builds, set an absolute API URL ending in `/api/blackjack` before building, as in `client/.env.production.example`; missing configuration prevents the app from starting in the browser.
- Server environment examples are in `.env.example`. Spring reads process environment and its properties files; the root `.env` is not automatically loaded.
- Client build: `npm run client:build` produces `client/build/`, not `dist/`.
- Client tests: `npm test --prefix client -- --run`; coverage: `npm run client:test:coverage`.
- Backend coverage: `npm run server:test:coverage` runs Gradle tests and JaCoCo verification.
- Browser tests: `npm run test:e2e`; install Chromium with `npx playwright install chromium` if needed.
- Full CI gate: `npm run quality` runs formatting, client coverage, server coverage, and Playwright. Playwright builds the client and serves it with `scripts/serve-static.mjs`.
- Documentation-only checks: `npx prettier --check <files>`.

## Behavior to preserve

- Keep betting validation, payouts, split-hand transitions, double-down, insurance, and dealer rules authoritative on the server. Client snapshots cannot replace server session state.
- Preserve `/api/blackjack/*` contracts and response DTOs; update client handling and backend tests together when a contract changes.
- Preserve CORS credentials, cookie settings, validation, and rate limits. Spring exposes both `/api/health` and `/api/blackjack/health`; deployment checks use the latter.
- Browser tests mock the API; they do not verify a real Spring session. Cover server rule/session changes with backend tests as well.
- Keep mobile controls, keyboard/accessibility behavior, themes, and stored-game compatibility intact.

## Verification and delivery

Run relevant checks and use `npm run quality` for broad application changes. Report failures and checks not run. Edit sources rather than generated builds or reports, and update this guide when commands or architecture change.

All five repos default to Playwright port 4173. Run browser suites sequentially and stop unrelated previews first: local Playwright runs reuse an existing server, which can accidentally test another repo. `.github/workflows/deploy.yml` runs CI for PRs targeting `main` and pushes to `main`; successful main pushes invoke an external GCP deployment script.
