import React, { useState } from 'react';
import { startGame, hit, stand, placeBet } from '../api/blackjackApi';
import PlayerHand from './PlayerHand';
import DealerHand from './DealerHand';
import Chip from './Chip';

import chip5 from '../assets/chips/chip-5.png';
import chip10 from '../assets/chips/chip-10.png';
import chip25 from '../assets/chips/chip-25.png';
import chip100 from '../assets/chips/chip-100.png';

import '../styles/BlackjackGame.css';

const BlackjackGame = () => {
    const [playerHand, setPlayerHand] = useState([]);
    const [dealerHand, setDealerHand] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [revealDealerCard, setRevealDealerCard] = useState(false);
    const [balance, setBalance] = useState(1000);
    const [currentBet, setCurrentBet] = useState(0);
    const [bettingOpen, setBettingOpen] = useState(true);
    const [message, setMessage] = useState('');

    const calculateTotal = (hand) => {
        let total = 0;
        let aces = 0;

        hand.forEach(card => {
            if (card.value === 'A') {
                aces++;
                total += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                total += 10;
            } else {
                total += parseInt(card.value);
            }
        });

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    };

    const handleStart = async () => {
        try {
            const response = await startGame();
            setPlayerHand(response.data.playerHand);
            setDealerHand(response.data.dealerHand);
            setGameOver(false);
            setRevealDealerCard(false);
            setMessage('');
            setBalance(balance - currentBet);
            setBettingOpen(false);
        } catch (error) {
            console.error("Error starting game:", error);
        }
    };

    const handleHit = async () => {
        try {
            const response = await hit();
            const newPlayerHand = response.data.playerHand;
            setPlayerHand(newPlayerHand);
            setDealerHand(response.data.dealerHand);

            const playerTotal = calculateTotal(newPlayerHand);

            if (playerTotal > 21) {
                setGameOver(true);
                setRevealDealerCard(true);
                setMessage("Busted! Dealer Wins!");
                setCurrentBet(0);
                setBettingOpen(true);
                return;
            }

            if (response.data.gameOver) {
                setGameOver(true);
                setRevealDealerCard(true);

                if (response.data.playerWins) {
                    setMessage("You Win!");
                    setBalance(balance + currentBet * 2);
                } else if (response.data.tie) {
                    setMessage("It's a Tie!");
                    setBalance(balance + currentBet);
                } else {
                    setMessage("Dealer Wins!");
                }

                setCurrentBet(0);
                setBettingOpen(true);
            }
        } catch (error) {
            console.error("Error hitting:", error);
        }
    };

    const handleStand = async () => {
        try {
            setRevealDealerCard(true);
            const response = await stand();

            setPlayerHand(response.data.playerHand);
            setDealerHand(response.data.dealerHand);
            setGameOver(true);
            setBettingOpen(true);

            if (response.data.playerWins) {
                setMessage("You Win!");
                setBalance(balance + currentBet * 2);
            } else if (response.data.tie) {
                setMessage("It's a Tie!");
                setBalance(balance + currentBet);
            } else {
                setMessage("Dealer Wins!");
            }

            setCurrentBet(0);
        } catch (error) {
            console.error("Error standing:", error);
        }
    };

    const handleBet = async (amount) => {
        if (!bettingOpen) return;
        if (currentBet + amount > balance) {
            setMessage("Bet exceeds balance");
            return;
        }

        try {
            const newBet = currentBet + amount;
            await placeBet(newBet);
            setCurrentBet(newBet);
        } catch (error) {
            console.error("Error placing bet:", error);
        }
    };

    return (
        <div className="blackjack-game">
            <h1>Blackjack</h1>

            <div className="betting-controls">
                <h2>Balance: ${balance}</h2>
                <h2>Current Bet: ${currentBet}</h2>

                <div className="chip-row">
                    <Chip amount={5} image={chip5} disabled={!bettingOpen} onClick={handleBet} />
                    <Chip amount={10} image={chip10} disabled={!bettingOpen} onClick={handleBet} />
                    <Chip amount={25} image={chip25} disabled={!bettingOpen} onClick={handleBet} />
                    <Chip amount={100} image={chip100} disabled={!bettingOpen} onClick={handleBet} />
                </div>
            </div>

            <div className="controls">
                <button onClick={handleStart} disabled={currentBet === 0}>Deal</button>
                <button onClick={handleHit} disabled={gameOver || playerHand.length === 0}>Hit</button>
                <button onClick={handleStand} disabled={gameOver || playerHand.length === 0}>Stand</button>
            </div>

            <DealerHand hand={dealerHand} reveal={revealDealerCard} />
            <PlayerHand hand={playerHand} />

            {balance === 0 && <h3 className="game-over">Game Over!</h3>}
            {message && <h3 className="game-message">{message}</h3>}
        </div>
    );
};

export default BlackjackGame;