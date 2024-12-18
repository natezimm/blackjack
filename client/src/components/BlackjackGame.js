import React, { useState } from 'react';
import { startGame, hit, stand } from '../api/blackjackApi';
import PlayerHand from './PlayerHand';
import DealerHand from './DealerHand';
import '../styles/BlackjackGame.css';

const BlackjackGame = () => {
    const [playerHand, setPlayerHand] = useState([]);
    const [dealerHand, setDealerHand] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [revealDealerCard, setRevealDealerCard] = useState(false);

    const handleStart = async () => {
        try {
            console.log('Starting game...');
            const response = await startGame();
            setPlayerHand([...response.data.playerHand]);
            setDealerHand([...response.data.dealerHand]);
            setGameOver(false); // Reset the game over state
            setRevealDealerCard(false); // Reset dealer card visibility
        } catch (error) {
            console.error('Error starting game:', error);
        }
    };

    const handleHit = async () => {
        try {
            console.log('Hitting...');
            const response = await hit();
            console.log('Hit response:', response.data);
            setPlayerHand([...response.data.playerHand]);
            setDealerHand([...response.data.dealerHand]);
            setGameOver(response.data.gameOver);
        } catch (error) {
            console.error('Error hitting:', error);
        }
    };

    const handleStand = async () => {
        try {
            console.log('Standing...');
            setRevealDealerCard(true); // Reveal the dealer's first card
            const response = await stand();
            console.log('Stand response:', response.data);
            setPlayerHand([...response.data.playerHand]);
            setDealerHand([...response.data.dealerHand]);
            setGameOver(response.data.gameOver);
        } catch (error) {
            console.error('Error standing:', error);
        }
    };

    return (
        <div className="blackjack-game">
            <h1>Blackjack</h1>
            <div className="controls">
                <button onClick={handleStart}>Start Game</button>
                <button onClick={handleHit} disabled={gameOver || playerHand.length === 0}>
                    Hit
                </button>
                <button onClick={handleStand} disabled={gameOver || playerHand.length === 0}>
                    Stand
                </button>
            </div>
            <DealerHand hand={dealerHand} reveal={revealDealerCard} />
            <PlayerHand hand={playerHand} />
            {gameOver && <h3 className="game-over">Game Over!</h3>}
        </div>
    );
};

export default BlackjackGame;