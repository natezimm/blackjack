# Architecture

## Runtime Topology

Blackjack is a full-stack game with a React client in `client/` and a Spring Boot API in `server/`. The browser calls the `/api/blackjack/*` endpoints with credentials enabled so the backend can keep round state in the HTTP session.

## Architecture Diagram

```mermaid
flowchart LR
  Player["Player browser"] --> Client["React 18 client<br/>client/"]
  Client --> GameUI["BlackjackGame + hand components<br/>cards, chips, toast"]
  Client --> ApiClient["Axios API client<br/>withCredentials"]
  Client --> BrowserState["Browser persistence<br/>resume snapshot + stats"]
  Client --> Assets["Client assets<br/>felt, chips, sounds"]
  ApiClient --> Controller["Spring Boot API<br/>/api/blackjack/*"]
  Controller --> Session["HTTP session<br/>per-browser game state"]
  Session --> Engine["BlackjackGame engine<br/>rules, deck, balance, hands"]
  Engine --> DTOs["DTO responses<br/>GameResponse + HandResponse"]
  Controller --> Security["Spring Security<br/>CORS + headers"]
  Controller --> Health["Health endpoints<br/>/api/health + /api/blackjack/health"]
  Repo["Repo quality gate<br/>npm run quality"] --> Builds["React build<br/>Gradle tests + JaCoCo"]
  Builds --> Deploy["GitHub Actions<br/>Lightsail deploy script"]

  classDef user fill:#f8fafc,stroke:#475569,color:#0f172a
  classDef site fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef server fill:#ffedd5,stroke:#c2410c,color:#7c2d12
  classDef repo fill:#eef2ff,stroke:#4338ca,color:#312e81
  classDef client fill:#dcfce7,stroke:#15803d,color:#14532d
  classDef data fill:#fef3c7,stroke:#b45309,color:#78350f
  classDef delivery fill:#f3e8ff,stroke:#7e22ce,color:#581c87
  classDef external fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d
  class Player user
  class Client,GameUI,ApiClient client
  class Controller,Engine,Security,Health server
  class BrowserState,Assets,Session,DTOs data
  class Repo,Builds,Deploy delivery
```

## Source Boundaries

The client owns rendering, browser persistence, audio/asset presentation, and API request shaping. The server owns Blackjack rules, balance changes, hand transitions, validation, security headers, CORS, and the session-backed game snapshot returned to the UI.

## Quality Gates

Run `npm run quality` from the repo root after installing root and client npm dependencies. The gate checks Prettier formatting, client Jest coverage, the client production build, and Gradle/JUnit tests with JaCoCo coverage verification.

## Deployment Flow

GitHub Actions runs the root quality gate for pull requests and pushes to `main`. Pushes to `main` then SSH to Lightsail and run the external deploy script for this repository, followed by frontend and backend health checks.

## Workspace Connectivity

```mermaid
flowchart LR
  subgraph Workspace["Five repository workspace"]
    PortfolioRepo["nathanzimmerman.com<br/>portfolio"]
    BrickRepo["brick-breaker-resume<br/>Phaser resume game"]
    NerdleRepo["nerdle<br/>React + Express word game"]
    SudokuRepo["sudoku<br/>Angular + ASP.NET Core"]
    BlackjackRepo["blackjack<br/>React + Spring Boot"]
  end

  PortfolioRepo --> PortfolioSite["nathanzimmerman.com"]
  BrickRepo --> BrickSite["resume.nathanzimmerman.com"]
  NerdleRepo --> NerdleSite["nerdle.nathanzimmerman.com"]
  SudokuRepo --> SudokuSite["sudoku.nathanzimmerman.com"]
  BlackjackRepo --> BlackjackSite["blackjack.nathanzimmerman.com"]

  PortfolioSite --> BrickSite
  PortfolioSite --> NerdleSite
  PortfolioSite --> SudokuSite
  PortfolioSite --> BlackjackSite

  PortfolioRepo --> Actions["GitHub Actions<br/>quality + deploy workflows"]
  BrickRepo --> Actions
  NerdleRepo --> Actions
  SudokuRepo --> Actions
  BlackjackRepo --> Actions
  Actions --> Lightsail["AWS Lightsail<br/>static sites + app services"]
  Lightsail --> PortfolioSite
  Lightsail --> BrickSite
  Lightsail --> NerdleSite
  Lightsail --> SudokuSite
  Lightsail --> BlackjackSite

  classDef user fill:#f8fafc,stroke:#475569,color:#0f172a
  classDef site fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef server fill:#ffedd5,stroke:#c2410c,color:#7c2d12
  classDef repo fill:#eef2ff,stroke:#4338ca,color:#312e81
  classDef client fill:#dcfce7,stroke:#15803d,color:#14532d
  classDef data fill:#fef3c7,stroke:#b45309,color:#78350f
  classDef delivery fill:#f3e8ff,stroke:#7e22ce,color:#581c87
  classDef external fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d
  class PortfolioRepo,BrickRepo,NerdleRepo,SudokuRepo,BlackjackRepo repo
  class PortfolioSite,BrickSite,NerdleSite,SudokuSite,BlackjackSite site
  class Actions,Lightsail delivery
```

## Deferred Architecture Follow-Ups

Keep CRA-to-Vite migration separate from this consistency pass. If the app grows, consider introducing a typed API contract between React and Spring Boot and a Java formatter in a later dedicated change.
