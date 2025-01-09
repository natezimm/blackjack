import React, { useState } from 'react';
import { startGame, hit, stand, placeBet } from '../api/blackjackApi';
import PlayerHand from './PlayerHand';
import DealerHand from './DealerHand';
import '../styles/BlackjackGame.css';

const BlackjackGame = () => {
    const [playerHand, setPlayerHand] = useState([]);
    const [dealerHand, setDealerHand] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [revealDealerCard, setRevealDealerCard] = useState(false);
    const [balance, setBalance] = useState(1000);
    const [currentBet, setCurrentBet] = useState(0);
    const [message, setMessage] = useState('');

    const handleStart = async () => {
        try {
            console.log('Starting game...');
            const response = await startGame();
            setPlayerHand([...response.data.playerHand]);
            setDealerHand([...response.data.dealerHand]);
            setGameOver(false);
            setRevealDealerCard(false);
            setMessage('');
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
            setDealerHand(response.data.dealerHand);
            setGameOver(response.data.gameOver);
            if (response.data.gameOver) {
                setRevealDealerCard(true);
                if (response.data.playerWins) {
                    setMessage('You Win!');
                    setBalance(balance + currentBet * 2);
                } else if (response.data.tie) {
                    setMessage('It\'s a Tie!');
                    setBalance(balance + currentBet);
                } else {
                    setMessage('Dealer Wins!');
                }
                setCurrentBet(0);
            }
        } catch (error) {
            console.error('Error hitting:', error);
        }
    };

    const handleStand = async () => {
        try {
            console.log('Standing...');
            setRevealDealerCard(true);
            const response = await stand();
            console.log('Stand response:', response.data);
            setPlayerHand([...response.data.playerHand]);
            setDealerHand([...response.data.dealerHand]);
            setGameOver(response.data.gameOver);
            if (response.data.playerWins) {
                setMessage('You Win!');
                setBalance(balance + currentBet * 2);
            } else if (response.data.tie) {
                setMessage('It\'s a Tie!');
                setBalance(balance + currentBet);
            } else {
                setMessage('Dealer Wins!');
            }
            setCurrentBet(0);
        } catch (error) {
            console.error('Error standing:', error);
        }
    };

    const handleBet = async (amount) => {
        try {
            console.log(`Placing bet of ${amount}...`);
            const newBet = currentBet + amount;
            const response = await placeBet(newBet);
            setBalance(response.data.balance);
            setCurrentBet(newBet);
        } catch (error) {
            console.error('Error placing bet:', error);
        }
    };

    return (
        <div className="blackjack-game">
            <h1>Blackjack</h1>
            <div className="betting-controls">
                <h2>Balance: ${balance}</h2>
                <h2>Current Bet: ${currentBet}</h2>
                <button onClick={() => handleBet(1)}>Bet $1</button>
                <button onClick={() => handleBet(5)}>Bet $5</button>
                <button onClick={() => handleBet(10)}>Bet $10</button>
                <button onClick={() => handleBet(50)}>Bet $50</button>
                <button onClick={() => handleBet(100)}>Bet $100</button>
                
            </div>
            <div className="controls">
                <button onClick={handleStart} disabled={currentBet === 0}>Deal</button>
                <button onClick={handleHit} disabled={gameOver || playerHand.length === 0}>
                    Hit
                </button>
                <button onClick={handleStand} disabled={gameOver || playerHand.length === 0}>
                    Stand
                </button>
            </div>
            <DealerHand hand={dealerHand} reveal={revealDealerCard} />
            <PlayerHand hand={playerHand} />
            {balance === 0 && <h3 className="game-over">Game Over!</h3>}
            {message && <h3 className="game-message">{message}</h3>}
        </div>
    );
};

export default BlackjackGame;