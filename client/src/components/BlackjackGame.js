import React, { useState } from 'react';
import { startGame, hit, stand } from '../api/blackjackApi';
import PlayerHand from './PlayerHand';
import DealerHand from './DealerHand';
import '../styles/BlackjackGame.css';

const BlackjackGame = () => {
    const [playerHand, setPlayerHand] = useState([]);
    const [dealerHand, setDealerHand] = useState([]);
    const [gameOver, setGameOver] = useState(false);

    const handleStart = async () => {
        const response = await startGame();
        setPlayerHand(response.data.playerHand);
        setDealerHand(response.data.dealerHand);
        setGameOver(false);
    };

    const handleHit = async () => {
        const response = await hit();
        setPlayerHand(response.data.playerHand);
        setDealerHand(response.data.dealerHand);
        setGameOver(response.data.gameOver);
    };

    const handleStand = async () => {
        const response = await stand();
        setPlayerHand(response.data.playerHand);
        setDealerHand(response.data.dealerHand);
        setGameOver(response.data.gameOver);
    };

    return (
        <div className="blackjack-game">
            <h1>Blackjack</h1>
            <div className="controls">
                <button onClick={handleStart}>Start Game</button>
                <button onClick={handleHit} disabled={gameOver}>Hit</button>
                <button onClick={handleStand} disabled={gameOver}>Stand</button>
            </div>
            <DealerHand hand={dealerHand} />
            <PlayerHand hand={playerHand} />
            {gameOver && <h3 className="game-over">Game Over!</h3>}
        </div>
    );
};

export default BlackjackGame;