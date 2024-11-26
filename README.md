# Blackjack Game

This is a full-stack Blackjack game built with **Spring Boot** (Java) for the backend and **React** for the frontend. Players can play against a dealer with various customizable settings such as the number of decks, whether the dealer hits on soft 17, and whether insurance is available.

## Features
- **Gameplay**: Play Blackjack against the dealer.
- **Customizable Settings**:
  - Number of decks used (1, 2, 4, 6, or 8 decks).
  - Dealer hits on soft 17 (Yes/No).
  - Insurance (Yes/No).
- **Game flow**: Start the game, hit, stand, and check the winner.
  
## Project Structure
- `client/`: Contains the **React** frontend for the Blackjack game.
- `server/`: Contains the **Spring Boot** backend for handling game logic.

## Prerequisites
- **Java 17** or later (for Spring Boot backend).
- **Node.js** and **npm** (for React frontend).
- **Gradle** (for building and running the backend).

## Setup Instructions

### Backend (Spring Boot)
1. Navigate to the `server/` directory:
   ```bash
   cd server
2.	Build and run the backend using Gradle:   
   `./gradlew bootRun`
3.	The backend will run on http://localhost:8080.
  
### Frontend (React)
1.	Navigate to the client/ directory:
    `cd client`
2.	Install the required dependencies:
    `npm install`
3.	Start the frontend development server:
    `npm start`
4.	The React app will be available at http://localhost:3000.

How It Works

	1.	React frontend communicates with the Spring Boot backend via RESTful API calls.
	2.	Backend handles the game logic, including card distribution, player actions (hit, stand), and determining the winner.
	3.	Frontend displays the current state of the game (hands, score, buttons) and sends player actions to the backend.

API Endpoints

	•	POST /api/start: Starts a new game and returns the initial game state (player’s and dealer’s hands).
	•	POST /api/hit: Sends a “hit” action for the player (draws a card).
	•	POST /api/stand: Sends a “stand” action for the player (ends their turn, dealer plays).

Directory Structure

	•	server/: Contains the Spring Boot backend code, including game logic and API endpoints.
	•	src/main/java/com/game/blackjack/: Java code for the game and backend logic.
	•	src/main/resources/static/: Static resources like HTML, CSS, and JavaScript (if needed).
	•	client/: Contains the React frontend.
	•	src/components/: React components for the user interface.
	•	src/api/: API call functions to interact with the backend.
	•	src/App.js: Main component for rendering the game UI.
