import React, { useEffect, useState } from 'react';
import { startGame, hit, stand, placeBet, doubleDown, getState, resetGame } from '../api/blackjackApi';
import PlayerHand from './PlayerHand';
import DealerHand from './DealerHand';
import Chip from './Chip';

import chip5 from '../assets/chips/chip-5.png';
import chip10 from '../assets/chips/chip-10.png';
import chip25 from '../assets/chips/chip-25.png';
import chip100 from '../assets/chips/chip-100.png';

import '../styles/BlackjackGame.css';

const STORAGE_KEYS = {
    stats: 'blackjackStats',
    gameState: 'blackjackGameState',
};

const MESSAGES = {
    win: 'Win! 🥳 You outplayed the house.',
    tie: 'Push 🤝 Chips stay put.',
    dealerWin: 'Dealer takes it. 💼 Try again!',
    bust: 'Bust! 🚨 Dealer scoops the pot.',
    betTooHigh: "Easy, high roller. That bet's bigger than your stack.",
};

const defaultStats = {
    highestBankroll: 1000,
    longestWinStreak: 0,
    mostHandsWon: 0,
    bestPayout: 0,
    currentWinStreak: 0,
    sessionHandsWon: 0,
};

const BlackjackGame = () => {
    const [playerHand, setPlayerHand] = useState([]);
    const [dealerHand, setDealerHand] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [revealDealerCard, setRevealDealerCard] = useState(false);
    const [cardBackColor, setCardBackColor] = useState('red');
    const [balance, setBalance] = useState(1000);
    const [currentBet, setCurrentBet] = useState(0);
    const [bettingOpen, setBettingOpen] = useState(true);
    const [message, setMessage] = useState('');
    const [numberOfDecks, setNumberOfDecks] = useState(1);
    const [dealerHitsOnSoft17, setDealerHitsOnSoft17] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [stats, setStats] = useState(defaultStats);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [pendingState, setPendingState] = useState(null);
    const [canPersistState, setCanPersistState] = useState(false);
    const [deckSize, setDeckSize] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);

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

    const loadFromStorage = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.error(`Unable to read ${key} from storage`, error);
            return fallback;
        }
    };

    const persistStats = (statsToSave) => {
        try {
            localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(statsToSave));
        } catch (error) {
            console.error('Unable to persist stats', error);
        }
    };

    const persistGameState = (customState) => {
        const snapshot = customState || {
            playerHand,
            dealerHand,
            revealDealerCard,
            balance,
            currentBet,
            bettingOpen,
            gameOver,
            message,
            cardBackColor,
            numberOfDecks,
            dealerHitsOnSoft17,
            deckSize,
        };

        try {
            localStorage.setItem(STORAGE_KEYS.gameState, JSON.stringify(snapshot));
        } catch (error) {
            console.error('Unable to persist game state', error);
        }
    };

    const hasStoredHand = (state) => {
        if (!state) return false;
        return (state.playerHand && state.playerHand.length > 0) ||
            (state.dealerHand && state.dealerHand.length > 0) ||
            state.currentBet > 0 ||
            state.bettingOpen === false;
    };

    const updateBalanceAndStats = (newBalance) => {
        if (typeof newBalance !== 'number' || Number.isNaN(newBalance)) {
            return;
        }

        setBalance(newBalance);
        setStats(prev => {
            const next = {
                ...prev,
                highestBankroll: Math.max(prev.highestBankroll || 0, newBalance),
            };
            persistStats(next);
            return next;
        });
    };

    const updateStatsWithOutcome = (outcome, payout, updatedBalance) => {
        const payoutValue = typeof payout === 'number' ? payout : 0;
        setStats(prev => {
            const next = { ...prev };
            if (typeof updatedBalance === 'number') {
                next.highestBankroll = Math.max(next.highestBankroll || 0, updatedBalance);
            }

            if (outcome === 'win') {
                next.currentWinStreak += 1;
                next.sessionHandsWon += 1;
                next.longestWinStreak = Math.max(next.longestWinStreak, next.currentWinStreak);
                next.mostHandsWon = Math.max(next.mostHandsWon, next.sessionHandsWon);
                next.bestPayout = Math.max(next.bestPayout, payoutValue);
            } else if (outcome === 'loss' || outcome === 'tie') {
                next.currentWinStreak = 0;
            }

            persistStats(next);
            return next;
        });
    };

    const hydrateStateFromResponse = (state, fallback) => {
        if (!state) return;
        const resolvedBalance = typeof state.balance === 'number' ? state.balance : balance;
        updateBalanceAndStats(resolvedBalance);
        setPlayerHand(state.playerHand || []);
        setDealerHand(state.dealerHand || []);
        setGameOver(!!state.gameOver);
        setBettingOpen(state.bettingOpen !== undefined ? state.bettingOpen : true);
        setCurrentBet(state.currentBet || 0);
        setNumberOfDecks(state.numberOfDecks || 1);
        setCardBackColor(state.cardBackColor || 'red');
        setDealerHitsOnSoft17(!!state.dealerHitsOnSoft17);
        setDeckSize(state.deckSize ?? null);
        setRevealDealerCard(state.revealDealerCard !== undefined ? state.revealDealerCard : !!(state.gameOver || state.bettingOpen));
        setMessage(state.message ?? fallback?.message ?? '');
        setCanPersistState(true);
    };

    const fetchExistingState = async (storedGameState) => {
        try {
            const response = await getState();
            const serverState = response.data;
            setPendingState({ server: serverState, local: storedGameState });

            if (hasStoredHand(serverState) || hasStoredHand(storedGameState)) {
                setShowResumePrompt(true);
            } else {
                setStats(prev => {
                    const next = { ...prev, currentWinStreak: 0, sessionHandsWon: 0 };
                    persistStats(next);
                    return next;
                });
                hydrateStateFromResponse(serverState, storedGameState);
            }
        } catch (error) {
            console.error('Error fetching saved state:', error);
            if (storedGameState) {
                hydrateStateFromResponse(storedGameState);
            } else {
                setStats(prev => {
                    const next = { ...prev, currentWinStreak: 0, sessionHandsWon: 0 };
                    persistStats(next);
                    return next;
                });
                setCanPersistState(true);
            }
        }
    };

    useEffect(() => {
        const storedStats = loadFromStorage(STORAGE_KEYS.stats, { ...defaultStats, highestBankroll: balance });
        setStats(storedStats);

        const storedGameState = loadFromStorage(STORAGE_KEYS.gameState, null);
        fetchExistingState(storedGameState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!canPersistState) return;
        persistGameState();
    }, [playerHand, dealerHand, revealDealerCard, balance, currentBet, bettingOpen, gameOver, message, numberOfDecks, dealerHitsOnSoft17, cardBackColor, canPersistState]);

    const handleResume = () => {
        if (!pendingState) {
            setShowResumePrompt(false);
            setCanPersistState(true);
            return;
        }

        const stateToUse = hasStoredHand(pendingState.server) ? pendingState.server : pendingState.local;
        hydrateStateFromResponse(stateToUse, pendingState.local);
        setShowResumePrompt(false);
    };

    const handleFreshStart = async () => {
        try {
            const response = await resetGame(numberOfDecks, dealerHitsOnSoft17);
            const data = response.data;
            updateBalanceAndStats(1000);
            setPlayerHand(data.playerHand || []);
            setDealerHand(data.dealerHand || []);
            setGameOver(false);
            setRevealDealerCard(false);
            setCurrentBet(0);
            setBettingOpen(true);
            setMessage('');
            setDeckSize(data.deckSize ?? numberOfDecks * 52);
            setStats(prev => {
                const next = { ...prev, currentWinStreak: 0, sessionHandsWon: 0, mostHandsWon: 0 };
                persistStats(next);
                return next;
            });
            setShowResumePrompt(false);
            setCanPersistState(true);
            persistGameState({
                playerHand: [],
                dealerHand: [],
                revealDealerCard: false,
                balance: 1000,
                currentBet: 0,
                bettingOpen: true,
                gameOver: false,
                message: '',
                cardBackColor: cardBackColor || 'red',
                numberOfDecks,
                dealerHitsOnSoft17,
                deckSize: data.deckSize ?? numberOfDecks * 52,
            });
        } catch (error) {
            console.error('Error resetting game:', error);
        }
    };

    const resetStats = () => {
        const reset = { ...defaultStats, highestBankroll: balance };
        persistStats(reset);
        setStats(reset);
    };

    const handleStart = async () => {
        try {
            const response = await startGame(numberOfDecks, dealerHitsOnSoft17);
            const data = response.data;
            setPlayerHand(data.playerHand || []);
            setDealerHand(data.dealerHand || []);
            setDeckSize(data.deckSize ?? deckSize);
            setGameOver(false);
            setRevealDealerCard(false);
            setMessage('');
            setBettingOpen(false);
            setCurrentBet(data.currentBet ?? currentBet);
            if (typeof data.balance === 'number') {
                updateBalanceAndStats(data.balance);
            } else {
                updateBalanceAndStats(balance - currentBet);
            }
        } catch (error) {
            console.error('Error starting game:', error);
        }
    };

    const handleHit = async () => {
        try {
            const response = await hit();
            const data = response.data;
            const newPlayerHand = data.playerHand || [];
            setPlayerHand(newPlayerHand);
            setDealerHand(data.dealerHand || []);
            setDeckSize(data.deckSize ?? deckSize);

            const playerTotal = calculateTotal(newPlayerHand);
            const busted = playerTotal > 21 || data.gameOver;

            if (busted) {
                setIsAnimating(true);
                setRevealDealerCard(true);
                await new Promise(resolve => setTimeout(resolve, 1000));

                setGameOver(true);
                setMessage(MESSAGES.bust);
                setCurrentBet(0);
                setBettingOpen(true);
                updateBalanceAndStats(data.balance ?? balance);
                updateStatsWithOutcome('loss', 0, data.balance ?? balance);
                setIsAnimating(false);
                return;
            }

            if (data.gameOver) {
                setGameOver(true);
                setRevealDealerCard(true);

                if (data.playerWins) {
                    setMessage(MESSAGES.win);
                    const nextBalance = data.balance ?? balance + currentBet * 2;
                    updateBalanceAndStats(nextBalance);
                    updateStatsWithOutcome('win', currentBet, nextBalance);
                } else if (data.tie) {
                    setMessage(MESSAGES.tie);
                    const nextBalance = data.balance ?? balance + currentBet;
                    updateBalanceAndStats(nextBalance);
                    updateStatsWithOutcome('tie', 0, nextBalance);
                } else {
                    setMessage(MESSAGES.dealerWin);
                    updateBalanceAndStats(data.balance ?? balance);
                    updateStatsWithOutcome('loss', 0, data.balance ?? balance);
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
            const data = response.data;
            const finalDealerHand = data.dealerHand || [];
            const finalPlayerHand = data.playerHand || [];
            const roundBet = currentBet;
            setDeckSize(data.deckSize ?? deckSize);

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

            if (data.playerWins) {
                setMessage(MESSAGES.win);
                const nextBalance = data.balance ?? balance + roundBet * 2;
                updateBalanceAndStats(nextBalance);
                updateStatsWithOutcome('win', roundBet, nextBalance);
            } else if (data.tie) {
                setMessage(MESSAGES.tie);
                const nextBalance = data.balance ?? balance + roundBet;
                updateBalanceAndStats(nextBalance);
                updateStatsWithOutcome('tie', 0, nextBalance);
            } else {
                setMessage(MESSAGES.dealerWin);
                updateBalanceAndStats(data.balance ?? balance);
                updateStatsWithOutcome('loss', 0, data.balance ?? balance);
            }

            setCurrentBet(0);
        } catch (error) {
            console.error('Error standing:', error);
        } finally {
            setIsAnimating(false);
        }
    };

    const handleDoubleDown = async () => {
        try {
            setIsAnimating(true);
            const doubledBet = currentBet * 2;

            const response = await doubleDown();
            const data = response.data;
            const finalDealerHand = data.dealerHand || [];
            const finalPlayerHand = data.playerHand || [];
            setDeckSize(data.deckSize ?? deckSize);

            // Update player hand with the one additional card
            if (finalPlayerHand && finalPlayerHand.length > 0) {
                setPlayerHand(finalPlayerHand);
            }

            await new Promise(resolve => setTimeout(resolve, 500));

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

            // Update balance based on result
            if (data.playerWins) {
                setMessage(MESSAGES.win);
                updateBalanceAndStats(data.balance ?? balance + doubledBet * 2);
                updateStatsWithOutcome('win', doubledBet, data.balance ?? balance + doubledBet * 2);
            } else if (data.tie) {
                setMessage(MESSAGES.tie);
                updateBalanceAndStats(data.balance ?? balance);
                updateStatsWithOutcome('tie', 0, data.balance ?? balance);
            } else {
                setMessage(MESSAGES.dealerWin);
                updateBalanceAndStats(data.balance ?? balance);
                updateStatsWithOutcome('loss', 0, data.balance ?? balance);
            }

            setCurrentBet(0);
        } catch (error) {
            console.error('Error doubling down:', error);
            // Revert the bet changes if there was an error
            setCurrentBet(currentBet / 2);
            setBalance(balance + currentBet / 2);
            if (error.response && error.response.data && error.response.data.error) {
                setMessage(error.response.data.error);
            }
        } finally {
            setIsAnimating(false);
        }
    };

    const handleDeckCountChange = (event) => {
        const nextDecks = parseInt(event.target.value, 10);
        setNumberOfDecks(nextDecks);
        setDeckSize(nextDecks * 52);
    };

    const handleBet = async (amount) => {
        if (!bettingOpen) return;
        if (currentBet + amount > balance) {
            setMessage(MESSAGES.betTooHigh);
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

    const formatDollar = (value) => `$${(value || 0).toLocaleString()}`;

    const deckLabel = numberOfDecks === 1 ? '1 Deck' : `${numberOfDecks} Decks`;
    const dealerRuleLabel = dealerHitsOnSoft17 ? 'Dealer hits soft 17' : 'Dealer stands on soft 17';
    const deckRemainingLabel = deckSize !== null ? ` • ${deckSize} cards remain` : '';
    const renderStatsContent = () => (
        <>
            <h3 className="panel-title stats-title">Stats</h3>
            <div className="stat-row">
                <span>Highest Bankroll</span>
                <strong>{formatDollar(stats.highestBankroll)}</strong>
            </div>
            <div className="stat-row">
                <span>Longest Win Streak</span>
                <strong>{stats.longestWinStreak}</strong>
            </div>
            <div className="stat-row">
                <span>Hands Won This Game</span>
                <strong>{stats.mostHandsWon}</strong>
            </div>
            <div className="stat-row">
                <span>Best Single-Hand Payout</span>
                <strong>{formatDollar(stats.bestPayout)}</strong>
            </div>
            <button className="reset-stats" onClick={resetStats}>Reset Stats</button>
        </>
    );

    return (
        <div className="blackjack-game">
            <div className="fab-cluster">
                <button
                    className="stats-fab"
                    onClick={() => setShowStatsModal(true)}
                    aria-label="Show stats"
                    title="Show stats"
                >
                    <i className="fas fa-chart-line" aria-hidden="true"></i>
                </button>

                <button
                    className="settings-fab"
                    onClick={() => setShowSettings(true)}
                    disabled={!bettingOpen}
                    aria-label="Game settings"
                    title="Game settings"
                >
                    ⚙️
                </button>
            </div>

            {showResumePrompt && (
                <div className="resume-modal-overlay">
                    <div className="resume-modal">
                        <h3>Resume your game?</h3>
                        <p>We saved your last game. Continue where you left off or start a new game.</p>
                        <div className="resume-actions">
                            <button onClick={handleResume}>Resume</button>
                            <button className="ghost" onClick={handleFreshStart}>Start New</button>
                        </div>
                    </div>
                </div>
            )}

            {showSettings && (
                <div className="settings-modal-overlay">
                    <div className="settings-modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">Game Settings</h3>
                        </div>
                        <div className="settings-group">
                            <div className="group-label">
                                <span>Decks in Play</span>
                            </div>
                            <select
                                value={numberOfDecks}
                                onChange={handleDeckCountChange}
                                disabled={!bettingOpen}
                                className="modern-select"
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={4}>4</option>
                                <option value={6}>6</option>
                                <option value={8}>8</option>
                            </select>
                        </div>
                        <div className="settings-group">
                            <div className="group-label">
                                <span>Dealer Hits on Soft 17</span>
                            </div>
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={dealerHitsOnSoft17}
                                    onChange={(e) => setDealerHitsOnSoft17(e.target.checked)}
                                    disabled={!bettingOpen}
                                />
                                <span className="toggle-text">{dealerHitsOnSoft17 ? 'On' : 'Off'}</span>
                            </label>
                        </div>
                        <div className="settings-group">
                            <div className="group-label">
                                <span>Card Back Color</span>
                            </div>
                            <div className="color-options">
                                <label className={`color-pill ${cardBackColor === 'red' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="card-back-color"
                                        value="red"
                                        checked={cardBackColor === 'red'}
                                        onChange={(e) => setCardBackColor(e.target.value)}
                                    />
                                    <span className="swatch swatch-red"></span>
                                    <span>Red</span>
                                </label>
                                <label className={`color-pill ${cardBackColor === 'blue' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="card-back-color"
                                        value="blue"
                                        checked={cardBackColor === 'blue'}
                                        onChange={(e) => setCardBackColor(e.target.value)}
                                    />
                                    <span className="swatch swatch-blue"></span>
                                    <span>Blue</span>
                                </label>
                            </div>
                        </div>
                        <button className="close-settings" onClick={() => setShowSettings(false)}>Close</button>
                    </div>
                </div>
            )}

            {showStatsModal && (
                <div className="settings-modal-overlay" onClick={() => setShowStatsModal(false)}>
                    <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                        {renderStatsContent()}
                        <button className="close-settings" onClick={() => setShowStatsModal(false)}>Close</button>
                    </div>
                </div>
            )}

            <header className="table-header">
                <h1>Blackjack</h1>
                <p className="table-info">{deckLabel} • {dealerRuleLabel}{deckRemainingLabel}</p>
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
                    <DealerHand hand={dealerHand} reveal={revealDealerCard} cardBackColor={cardBackColor} />
                    <PlayerHand hand={playerHand} />

                    <div className="controls">
                        <button onClick={handleStart} disabled={currentBet === 0 || isAnimating || !bettingOpen}>Deal</button>
                        <button onClick={handleHit} disabled={gameOver || playerHand.length === 0 || isAnimating}>Hit</button>
                        <button
                            onClick={handleDoubleDown}
                            disabled={
                                gameOver ||
                                playerHand.length !== 2 ||
                                currentBet > balance ||
                                isAnimating
                            }
                        >
                            Double Down
                        </button>
                        <button onClick={handleStand} disabled={gameOver || playerHand.length === 0 || isAnimating}>Stand</button>
                    </div>

                    <div className="status-messages">
                        {balance === 0 && bettingOpen && gameOver && (
                            <div className="message-card game-over">Bankroll empty. Reset to reload the fun.</div>
                        )}
                        {message && <div className="message-card game-message">{message}</div>}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BlackjackGame;
