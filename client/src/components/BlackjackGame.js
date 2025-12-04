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
    const [numberOfDecks, setNumberOfDecks] = useState(1);
    const [dealerHitsOnSoft17, setDealerHitsOnSoft17] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

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
            const response = await startGame(numberOfDecks, dealerHitsOnSoft17);
            setPlayerHand(response.data.playerHand);
            setDealerHand(response.data.dealerHand);
            setGameOver(false);
            setRevealDealerCard(false);
            setMessage('');
            setBalance(balance - currentBet);
            setBettingOpen(false);
        } catch (error) {
            console.error('Error starting game:', error);
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
                setIsAnimating(true);
                setRevealDealerCard(true);
                await new Promise(resolve => setTimeout(resolve, 1000));

                setGameOver(true);
                setMessage('Busted! Dealer Wins!');
                setCurrentBet(0);
                setBettingOpen(true);
                setIsAnimating(false);
                return;
            }

            if (response.data.gameOver) {
                setGameOver(true);
                setRevealDealerCard(true);

                if (response.data.playerWins) {
                    setMessage('You Win!');
                    setBalance(balance + currentBet * 2);
                } else if (response.data.tie) {
                    setMessage("It's a Tie!");
                    setBalance(balance + currentBet);
                } else {
                    setMessage('Dealer Wins!');
                }

                setCurrentBet(0);
                setBettingOpen(true);
            }
        } catch (error) {
            console.error('Error hitting:', error);
        }
    };

    const handleStand = async () => {
        try {
            setIsAnimating(true);
            const response = await stand();
            const finalDealerHand = response.data.dealerHand;
            const finalPlayerHand = response.data.playerHand;

            // Only replace the player's hand if the API sends cards back
            if (finalPlayerHand && finalPlayerHand.length > 0) {
                setPlayerHand(finalPlayerHand);
            }

            // 1. Reveal hidden card
            setRevealDealerCard(true);
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Deal remaining cards one by one
            let currentDisplayedHand = finalDealerHand.slice(0, 2);
            setDealerHand(currentDisplayedHand);

            for (let i = 2; i < finalDealerHand.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                currentDisplayedHand = [...currentDisplayedHand, finalDealerHand[i]];
                setDealerHand(currentDisplayedHand);
            }

            setGameOver(true);
            setBettingOpen(true);

            if (response.data.playerWins) {
                setMessage('You Win!');
                setBalance(balance + currentBet * 2);
            } else if (response.data.tie) {
                setMessage("It's a Tie!");
                setBalance(balance + currentBet);
            } else {
                setMessage('Dealer Wins!');
            }

            setCurrentBet(0);
        } catch (error) {
            console.error('Error standing:', error);
        } finally {
            setIsAnimating(false);
        }
    };

    const handleBet = async (amount) => {
        if (!bettingOpen) return;
        if (currentBet + amount > balance) {
            setMessage('Bet exceeds balance');
            return;
        }

        try {
            const newBet = currentBet + amount;
            await placeBet(newBet);
            setCurrentBet(newBet);
        } catch (error) {
            console.error('Error placing bet:', error);
        }
    };

    const deckLabel = numberOfDecks === 1 ? '1 Deck' : `${numberOfDecks} Decks`;
    const dealerRuleLabel = dealerHitsOnSoft17 ? 'Dealer hits soft 17' : 'Dealer stands on soft 17';

    return (
        <div className="blackjack-game">
            <button
                className="settings-fab"
                onClick={() => setShowSettings(true)}
                disabled={!bettingOpen}
                aria-label="Game settings"
                title="Game settings"
            >
                ⚙️
            </button>

            {showSettings && (
                <div className="settings-modal-overlay">
                    <div className="settings-modal-content">
                        <h3>Game Settings</h3>
                        <div className="settings-group">
                            <label>Decks: </label>
                            <select value={numberOfDecks} onChange={(e) => setNumberOfDecks(parseInt(e.target.value))} disabled={!bettingOpen}>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={4}>4</option>
                                <option value={6}>6</option>
                                <option value={8}>8</option>
                            </select>
                        </div>
                        <div className="settings-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={dealerHitsOnSoft17}
                                    onChange={(e) => setDealerHitsOnSoft17(e.target.checked)}
                                    disabled={!bettingOpen}
                                />
                                Dealer Hits Soft 17
                            </label>
                        </div>
                        <button className="close-settings" onClick={() => setShowSettings(false)}>Close</button>
                    </div>
                </div>
            )}

            <header className="table-header">
                <h1>Blackjack</h1>
                <p className="table-info">{deckLabel} • {dealerRuleLabel}</p>
            </header>

            <div className="table-layout">
                <aside className="betting-panel">
                    <h3 className="panel-title">Bank & Bets</h3>
                    <div className="betting-summary">
                        <span>Balance</span>
                        <strong>{`$${balance}`}</strong>
                    </div>
                    <div className="betting-summary">
                        <span>Current Bet</span>
                        <strong>{`$${currentBet}`}</strong>
                    </div>
                    <div className="chip-row">
                        <Chip amount={5} image={chip5} disabled={!bettingOpen} onClick={handleBet} />
                        <Chip amount={10} image={chip10} disabled={!bettingOpen} onClick={handleBet} />
                        <Chip amount={25} image={chip25} disabled={!bettingOpen} onClick={handleBet} />
                        <Chip amount={100} image={chip100} disabled={!bettingOpen} onClick={handleBet} />
                    </div>
                </aside>

                <div className="table-surface">
                    <DealerHand hand={dealerHand} reveal={revealDealerCard} />
                    <PlayerHand hand={playerHand} />

                    <div className="controls">
                        <button onClick={handleStart} disabled={currentBet === 0 || isAnimating}>Deal</button>
                        <button onClick={handleHit} disabled={gameOver || playerHand.length === 0 || isAnimating}>Hit</button>
                        <button onClick={handleStand} disabled={gameOver || playerHand.length === 0 || isAnimating}>Stand</button>
                    </div>

                    <div className="status-messages">
                        {balance === 0 && <h3 className="game-over">Game Over!</h3>}
                        {message && <h3 className="game-message">{message}</h3>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlackjackGame;
