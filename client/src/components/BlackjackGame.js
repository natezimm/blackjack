import React, { useEffect, useState } from 'react';
import { startGame, hit, stand, placeBet, doubleDown, split, resolveInsurance, getState, resetGame } from '../api/blackjackApi';
import PlayerHand from './PlayerHand';
import DealerHand from './DealerHand';
import Chip from './Chip';

import chip5Png from '../assets/chips/chip-5.png';
import chip5Webp from '../assets/chips/chip-5.webp';
import chip5Avif from '../assets/chips/chip-5.avif';
import chip5SmallPng from '../assets/chips/chip-5-small.png';
import chip5SmallWebp from '../assets/chips/chip-5-small.webp';
import chip5SmallAvif from '../assets/chips/chip-5-small.avif';

import chip10Png from '../assets/chips/chip-10.png';
import chip10Webp from '../assets/chips/chip-10.webp';
import chip10Avif from '../assets/chips/chip-10.avif';
import chip10SmallPng from '../assets/chips/chip-10-small.png';
import chip10SmallWebp from '../assets/chips/chip-10-small.webp';
import chip10SmallAvif from '../assets/chips/chip-10-small.avif';

import chip25Png from '../assets/chips/chip-25.png';
import chip25Webp from '../assets/chips/chip-25.webp';
import chip25Avif from '../assets/chips/chip-25.avif';
import chip25SmallPng from '../assets/chips/chip-25-small.png';
import chip25SmallWebp from '../assets/chips/chip-25-small.webp';
import chip25SmallAvif from '../assets/chips/chip-25-small.avif';

import chip100Png from '../assets/chips/chip-100.png';
import chip100Webp from '../assets/chips/chip-100.webp';
import chip100Avif from '../assets/chips/chip-100.avif';
import chip100SmallPng from '../assets/chips/chip-100-small.png';
import chip100SmallWebp from '../assets/chips/chip-100-small.webp';
import chip100SmallAvif from '../assets/chips/chip-100-small.avif';

import cardSoundAsset from '../assets/sounds/card.mp3';
import chipSoundAsset from '../assets/sounds/chip.mp3';
import clickSoundAsset from '../assets/sounds/click.mp3';

import '../styles/BlackjackGame.css';
import { MESSAGES } from '../constants/messages';

const chip5Images = {
    png: chip5Png,
    webp: chip5Webp,
    avif: chip5Avif,
    smallPng: chip5SmallPng,
    smallWebp: chip5SmallWebp,
    smallAvif: chip5SmallAvif
};

const chip10Images = {
    png: chip10Png,
    webp: chip10Webp,
    avif: chip10Avif,
    smallPng: chip10SmallPng,
    smallWebp: chip10SmallWebp,
    smallAvif: chip10SmallAvif
};

const chip25Images = {
    png: chip25Png,
    webp: chip25Webp,
    avif: chip25Avif,
    smallPng: chip25SmallPng,
    smallWebp: chip25SmallWebp,
    smallAvif: chip25SmallAvif
};

const chip100Images = {
    png: chip100Png,
    webp: chip100Webp,
    avif: chip100Avif,
    smallPng: chip100SmallPng,
    smallWebp: chip100SmallWebp,
    smallAvif: chip100SmallAvif
};

export const calculateTotal = (hand) => {
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

const STORAGE_KEYS = {
    stats: 'blackjackStats',
    gameState: 'blackjackGameState',
};

export const safePersistStats = (statsToSave, storage = localStorage) => {
    try {
        storage.setItem(STORAGE_KEYS.stats, JSON.stringify(statsToSave));
    } catch (error) {
        console.error('Unable to persist stats', error);
    }
};

export const safePersistGameState = (snapshot, storage = localStorage) => {
    try {
        storage.setItem(STORAGE_KEYS.gameState, JSON.stringify(snapshot));
    } catch (error) {
        console.error('Unable to persist game state', error);
    }
};

export const createUpdateBalanceAndStats = ({ setBalance, setStats, persistStats }) => (newBalance) => {
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

export const createUpdateStatsWithOutcome = ({ setStats, persistStats }) => (outcome, payout, updatedBalance) => {
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
        }
        if (outcome === 'loss' || outcome === 'tie') {
            next.currentWinStreak = 0;
        }

        persistStats(next);
        return next;
    });
};

export const createHydrateStateFromResponse = ({
    balance,
    updateBalanceAndStats,
    setPlayerHands,
    setDealerHand,
    setGameOver,
    setBettingOpen,
    setCurrentBet,
    setNumberOfDecks,
    setCardBackColor,
    setDealerHitsOnSoft17,
    setDeckSize,
    setRevealDealerCard,
    setMessage,
    setInsuranceBet,
    setInsuranceOffered,
    setInsuranceResolved,
    setInsuranceOutcome,
    setCanPersistState,
}) => (state, fallback) => {
    if (!state) return;
    const resolvedBalance = typeof state.balance === 'number' ? state.balance : balance;
    updateBalanceAndStats(resolvedBalance);

    let hands = [];
    if (state.playerHands) {
        hands = state.playerHands;
    }
    setPlayerHands(hands);

    setDealerHand(ensureHand(state.dealerHand));
    setGameOver(!!state.gameOver);
    setBettingOpen(state.bettingOpen !== undefined ? state.bettingOpen : true);
    setCurrentBet(state.currentBet || 0);
    setNumberOfDecks(state.numberOfDecks || 1);
    setCardBackColor(state.cardBackColor || 'red');
    setDealerHitsOnSoft17(!!state.dealerHitsOnSoft17);
    setDeckSize(fallbackTo(state.deckSize, null));
    setRevealDealerCard(state.revealDealerCard !== undefined ? state.revealDealerCard : !!(state.gameOver || state.bettingOpen));
    setMessage(state.message ?? fallback?.message ?? '');
    if (setInsuranceBet) setInsuranceBet(fallbackTo(state.insuranceBet, 0));
    if (setInsuranceOffered) setInsuranceOffered(!!state.insuranceOffered);
    if (setInsuranceResolved) setInsuranceResolved(state.insuranceResolved !== undefined ? !!state.insuranceResolved : true);
    if (setInsuranceOutcome) setInsuranceOutcome(state.insuranceOutcome ?? null);
    setCanPersistState(true);
};

export const ensureHand = (hand) => hand || [];

export const fallbackTo = (value, fallback) => value ?? fallback;

export const createDeckCountChangeHandler = ({ setNumberOfDecks, setDeckSize }) => (event) => {
    const nextDecks = parseInt(event.target.value, 10);
    setNumberOfDecks(nextDecks);
    setDeckSize(nextDecks * 52);
};

export const handleBetLogic = async ({
    bettingOpen,
    currentBet,
    balance,
    setMessage,
    setCurrentBet,
    placeBet,
    onSuccess,
}, amount) => {
    if (!bettingOpen) return;
    if (currentBet + amount > balance) {
        setMessage(MESSAGES.betTooHigh);
        return;
    }

    try {
        const newBet = currentBet + amount;
        await placeBet(newBet);
        setCurrentBet(newBet);
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error('Error placing bet:', error);
    }
};

const defaultStats = {
    highestBankroll: 1000,
    longestWinStreak: 0,
    mostHandsWon: 0,
    bestPayout: 0,
    currentWinStreak: 0,
    sessionHandsWon: 0,
};

const BlackjackGame = ({ initialSkipAnimations = false }) => {
    const [playerHands, setPlayerHands] = useState([]);
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
    const [displayedDealerHand, setDisplayedDealerHand] = useState([]);
    const [stats, setStats] = useState(defaultStats);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [pendingState, setPendingState] = useState(null);
    const [canPersistState, setCanPersistState] = useState(false);
    const [deckSize, setDeckSize] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [insuranceBet, setInsuranceBet] = useState(0);
    const [insuranceOffered, setInsuranceOffered] = useState(false);
    const [insuranceResolved, setInsuranceResolved] = useState(true);
    const [insuranceOutcome, setInsuranceOutcome] = useState(null);
    const [insuranceAmount, setInsuranceAmount] = useState(0);

    const [isDealing, setIsDealing] = useState(false);
    const [muted, setMuted] = useState(() => {
        return localStorage.getItem('blackjack_muted') === 'true';
    });

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
        safePersistStats(statsToSave);
    };

    const persistGameState = React.useCallback(() => {
        const snapshot = {
            playerHands,
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
            insuranceBet,
            insuranceOffered,
            insuranceResolved,
            insuranceOutcome,
        };
        safePersistGameState(snapshot);
    }, [playerHands, dealerHand, revealDealerCard, balance, currentBet, bettingOpen, gameOver, message, cardBackColor, numberOfDecks, dealerHitsOnSoft17, deckSize, insuranceBet, insuranceOffered, insuranceResolved, insuranceOutcome]);

    const updateBalanceAndStats = createUpdateBalanceAndStats({ setBalance, setStats, persistStats });
    const hydrateStateFromResponse = createHydrateStateFromResponse({
        balance,
        updateBalanceAndStats,
        setPlayerHands,
        setDealerHand,
        setGameOver,
        setBettingOpen,
        setCurrentBet,
        setNumberOfDecks,
        setCardBackColor,
        setDealerHitsOnSoft17,
        setDeckSize,
        setRevealDealerCard,
        setMessage,
        setInsuranceBet,
        setInsuranceOffered,
        setInsuranceResolved,
        setInsuranceOutcome,
        setCanPersistState,
    });

    const hasStoredHand = (state) => {
        if (!state) return false;
        return (state.playerHands && state.playerHands.length > 0) ||
            (state.dealerHand && state.dealerHand.length > 0) ||
            state.currentBet > 0 ||
            state.bettingOpen === false;
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

    const [outcomeVisible, setOutcomeVisible] = useState(false);

    useEffect(() => {
        if (initialSkipAnimations) {
            setDisplayedDealerHand(dealerHand);
            setOutcomeVisible(revealDealerCard);
            setIsAnimating(false);
            return;
        }

        if (!revealDealerCard) {
            setDisplayedDealerHand(dealerHand);
            setOutcomeVisible(false);
            return;
        }

        if (displayedDealerHand.length < dealerHand.length) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setDisplayedDealerHand(dealerHand.slice(0, displayedDealerHand.length + 1));
                playCardSound();
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setIsAnimating(false);
            const outcomeTimer = setTimeout(() => {
                setOutcomeVisible(true);
            }, 500);
            return () => clearTimeout(outcomeTimer);
        }
    }, [dealerHand, revealDealerCard, displayedDealerHand.length, initialSkipAnimations]);

    useEffect(() => {
        if (!canPersistState) return;
        persistGameState();
    }, [persistGameState, canPersistState]);

    const handleResume = () => {
        playClickSound();
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
        playClickSound();
        try {
            const response = await resetGame(numberOfDecks, dealerHitsOnSoft17);
            const data = response.data;
            updateBalanceAndStats(1000);
            setPlayerHands(data.playerHands || []);
            setDealerHand(ensureHand(data.dealerHand));
            setGameOver(false);
            setRevealDealerCard(false);
            setCurrentBet(0);
            setBettingOpen(true);
            setMessage('');
            setDeckSize(fallbackTo(data.deckSize, numberOfDecks * 52));
            setInsuranceBet(fallbackTo(data.insuranceBet, 0));
            setInsuranceOffered(!!data.insuranceOffered);
            setInsuranceResolved(data.insuranceResolved !== undefined ? !!data.insuranceResolved : true);
            setInsuranceOutcome(data.insuranceOutcome ?? null);
            setInsuranceAmount(0);
            setStats(prev => {
                const next = { ...prev, currentWinStreak: 0, sessionHandsWon: 0, mostHandsWon: 0 };
                persistStats(next);
                return next;
            });
            setShowResumePrompt(false);
            setCanPersistState(true);
        } catch (error) {
            console.error('Error resetting game:', error);
        }
    };

    const resetStats = () => {
        playClickSound();
        const reset = { ...defaultStats, highestBankroll: balance };
        persistStats(reset);
        setStats(reset);
    };

    const handleStart = async () => {
        playClickSound();
        try {
            const response = await startGame(numberOfDecks, dealerHitsOnSoft17);
            const data = response.data;
            setPlayerHands(data.playerHands || []);
            setDealerHand(ensureHand(data.dealerHand));
            setDeckSize(fallbackTo(data.deckSize, deckSize));
            setGameOver(false);
            setRevealDealerCard(false);
            setMessage('');
            setBettingOpen(false);
            setCurrentBet(fallbackTo(data.currentBet, currentBet));
            setInsuranceBet(fallbackTo(data.insuranceBet, 0));
            setInsuranceOffered(!!data.insuranceOffered);
            setInsuranceResolved(data.insuranceResolved !== undefined ? !!data.insuranceResolved : true);
            setInsuranceOutcome(data.insuranceOutcome ?? null);
            setInsuranceAmount(0);
            if (typeof data.balance === 'number') {
                updateBalanceAndStats(data.balance);
            } else {
                updateBalanceAndStats(balance - currentBet);
            }

            // New dealing sequence
            setIsDealing(true);
            setBettingOpen(false);

            // Initial empty hands to start animation
            setPlayerHands([]);
            setDealerHand([]);

            const finalPlayerHand = (data.playerHands || [])[0];
            const finalDealerHand = ensureHand(data.dealerHand);

            // Deal 1: Player Card 1 (Face Up)
            setTimeout(() => {
                if (finalPlayerHand && finalPlayerHand.cards && finalPlayerHand.cards[0]) {
                    setPlayerHands([{ ...finalPlayerHand, cards: [finalPlayerHand.cards[0]] }]);
                    playCardSound();
                }
            }, 750);

            // Deal 2: Dealer Card 1 (Face Up)
            setTimeout(() => {
                setDealerHand([finalDealerHand[0]]);
                playCardSound();
            }, 1500);

            // Deal 3: Player Card 2 (Face Up)
            setTimeout(() => {
                setPlayerHands([finalPlayerHand]);
                playCardSound();
            }, 2250);

            // Deal 4: Dealer Card 2 (Face Down)
            setTimeout(() => {
                setDealerHand(finalDealerHand);
                playCardSound();
                setIsDealing(false);
            }, 3000);

        } catch (error) {
            console.error('Error starting game:', error);
            setIsDealing(false);
        }
    };

    const updateGameState = (data) => {
        setPlayerHands(data.playerHands || []);
        setDealerHand(ensureHand(data.dealerHand));
        setDeckSize(fallbackTo(data.deckSize, deckSize));
        if (typeof data.balance === 'number') updateBalanceAndStats(data.balance);
        setGameOver(data.gameOver);
        setBettingOpen(data.bettingOpen);
        setInsuranceBet(fallbackTo(data.insuranceBet, 0));
        setInsuranceOffered(!!data.insuranceOffered);
        setInsuranceResolved(data.insuranceResolved !== undefined ? !!data.insuranceResolved : true);
        setInsuranceOutcome(data.insuranceOutcome ?? null);

        if (data.gameOver) {
            setRevealDealerCard(true);
            setCurrentBet(0);
        }
    };

    const handleHit = async () => {
        playClickSound();
        try {
            const response = await hit();
            setIsAnimating(true);
            setTimeout(() => {
                playCardSound();
                updateGameState(response.data);
                setIsAnimating(false);
            }, 750);
        } catch (error) {
            console.error('Error hitting:', error);
            setIsAnimating(false);
        }
    };

    const handleStand = async () => {
        playClickSound();
        try {
            const response = await stand();
            setIsAnimating(true);
            setTimeout(() => {
                updateGameState(response.data);
                setIsAnimating(false);
            }, 750);
        } catch (error) {
            console.error('Error standing:', error);
            setIsAnimating(false);
        }
    };

    const handleDoubleDown = async () => {
        playClickSound();
        try {
            const response = await doubleDown();
            setIsAnimating(true);
            playChipSound();
            setTimeout(() => {
                playCardSound();
                updateGameState(response.data);
                setIsAnimating(false);
            }, 750);
        } catch (error) {
            console.error('Error doubling down:', error);
            setIsAnimating(false);
            if (error.response && error.response.data && error.response.data.error) {
                setMessage(error.response.data.error);
            }
        }
    };

    const handleSplit = async () => {
        playClickSound();
        try {
            const response = await split();
            setIsAnimating(true);
            playChipSound();
            setTimeout(() => {
                playCardSound();
                updateGameState(response.data);
                setIsAnimating(false);
            }, 750);
        } catch (error) {
            console.error('Error splitting:', error);
            setIsAnimating(false);
            if (error.response && error.response.data && error.response.data.error) {
                setMessage(error.response.data.error);
            }
        }
    };

    const handleResolveInsurance = async (amount) => {
        playClickSound();
        try {
            const response = await resolveInsurance(amount);
            setIsAnimating(true);
            setTimeout(() => {
                updateGameState(response.data);
                setIsAnimating(false);
            }, 750);
        } catch (error) {
            console.error('Error resolving insurance:', error);
            setIsAnimating(false);
            if (error.response && error.response.data && error.response.data.error) {
                setMessage(error.response.data.error);
            }
        }
    };

    const handleDeckCountChange = createDeckCountChangeHandler({
        setNumberOfDecks,
        setDeckSize,
    });

    const toggleMute = () => {
        playClickSound();
        const newMuted = !muted;
        setMuted(newMuted);
        localStorage.setItem('blackjack_muted', newMuted);
    };

    const playSound = (file) => {
        if (muted) return;
        if (process.env.NODE_ENV === 'test') return; // Stub playSound in tests
        /* istanbul ignore next */
        const audio = new Audio(file);
        audio.volume = 0.5;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                // Ignore errors from JSDOM/autoplaying restrictions
                console.error("Error playing sound:", e);
            });
        }
    };

    const playCardSound = () => playSound(cardSoundAsset);
    const playChipSound = () => playSound(chipSoundAsset);
    const playClickSound = () => playSound(clickSoundAsset);

    const handleBet = async (amount) => {
        await handleBetLogic({
            bettingOpen,
            currentBet,
            balance,
            setMessage,
            setCurrentBet,
            placeBet,
            onSuccess: playChipSound,
        }, amount);
    };

    const formatDollar = (value) => `$${(value || 0).toLocaleString()}`;

    const deckLabel = numberOfDecks === 1 ? '1 Deck' : `${numberOfDecks} Decks`;
    const dealerRuleLabel = dealerHitsOnSoft17 ? 'Dealer hits soft 17' : 'Dealer stands on soft 17';
    const deckRemainingLabel = deckSize !== null ? ` • ${deckSize} cards remain` : '';
    const renderStatsContent = () => (
        <>
            <h2 className="panel-title stats-title">Stats</h2>
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

    const activeHandIndex = playerHands.findIndex(h => h && h.isTurn);
    const activeHand = activeHandIndex >= 0 ? playerHands[activeHandIndex] : null;

    const canSplit = !gameOver && activeHand && activeHand.cards.length === 2 && calculateTotal([activeHand.cards[0]]) === calculateTotal([activeHand.cards[1]]) && balance >= activeHand.bet;
    const insuranceDecisionPending = !bettingOpen && !gameOver && insuranceOffered && !insuranceResolved;
    const maxInsurance = Math.max(0, Math.min(Math.floor(currentBet / 2), balance));

    useEffect(() => {
        if (!insuranceDecisionPending) return;
        setInsuranceAmount(prev => {
            if (typeof prev !== 'number' || Number.isNaN(prev) || prev < 0) {
                return maxInsurance;
            }
            if (prev === 0) {
                return maxInsurance;
            }
            return Math.min(prev, maxInsurance);
        });
    }, [insuranceDecisionPending, maxInsurance]);

    return (
        <div className="blackjack-game">
            <div className="fab-cluster">
                <button
                    className="sound-fab"
                    onClick={toggleMute}
                    aria-label={muted ? "Unmute sounds" : "Mute sounds"}
                    title={muted ? "Unmute sounds" : "Mute sounds"}
                >
                    {muted ? '🔇' : '🔊'}
                </button>

                <button
                    className="stats-fab"
                    onClick={() => {
                        playClickSound();
                        setShowStatsModal(true);
                    }}
                    aria-label="Show stats"
                    title="Show stats"
                >
                    <i className="fas fa-chart-line" aria-hidden="true"></i>
                </button>

                <button
                    className="settings-fab"
                    onClick={() => {
                        playClickSound();
                        setShowSettings(true);
                    }}
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
                        <h2>Resume your game?</h2>
                        <p>We saved your last game. Continue where you left off or start a new game.</p>
                        <div className="resume-actions">
                            <button className="ghost" onClick={handleFreshStart}>Start New</button>
                            <button onClick={handleResume}>Resume</button>
                        </div>
                    </div>
                </div>
            )}

            {showSettings && (
                <div className="settings-modal-overlay">
                    <div className="settings-modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title">Game Settings</h2>
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
                        <button className="close-settings" onClick={() => {
                            playClickSound();
                            setShowSettings(false);
                        }}>Close</button>
                    </div>
                </div>
            )}

            {showStatsModal && (
                <div className="settings-modal-overlay" onClick={() => {
                    playClickSound();
                    setShowStatsModal(false);
                }}>
                    <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                        {renderStatsContent()}
                        <button className="close-settings" onClick={() => {
                            playClickSound();
                            setShowStatsModal(false);
                        }}>Close</button>
                    </div>
                </div>
            )}

            <header className="table-header">
                <h1>Blackjack</h1>
                <p className="table-info">{deckLabel} • {dealerRuleLabel}{deckRemainingLabel}</p>
            </header>

            <div className="table-layout">
                <aside className="betting-panel">
                    <h2 className="panel-title">Bank & Bets</h2>
                    <div className="betting-summary">
                        <span>Balance</span>
                        <strong>{`$${balance}`}</strong>
                    </div>
                    <div className="betting-summary">
                        <span>Current Bet</span>
                        <strong>{`$${currentBet}`}</strong>
                    </div>
                    <div className="chip-row">
                        <Chip amount={5} images={chip5Images} disabled={!bettingOpen} onClick={handleBet} />
                        <Chip amount={10} images={chip10Images} disabled={!bettingOpen} onClick={handleBet} />
                        <Chip amount={25} images={chip25Images} disabled={!bettingOpen} onClick={handleBet} />
                        <Chip amount={100} images={chip100Images} disabled={!bettingOpen} onClick={handleBet} />
                    </div>
                </aside>

                <div className="table-surface">
                    <DealerHand hand={displayedDealerHand} reveal={revealDealerCard} cardBackColor={cardBackColor} />

                    {(!isDealing && (insuranceDecisionPending || insuranceBet > 0)) && (
                        <div className={`insurance-bar ${insuranceOutcome ? `insurance-${insuranceOutcome.toLowerCase()}` : ''}`}>
                            <div className="insurance-bar-header">
                                <span className="insurance-label">Insurance</span>
                                {insuranceDecisionPending ? (
                                    <span className="insurance-hint">Dealer shows an Ace • Up to ${maxInsurance}</span>
                                ) : (
                                    <span className="insurance-summary">
                                        {insuranceBet > 0 ? `Bet $${insuranceBet}` : 'No bet'}
                                        {insuranceOutcome && insuranceOutcome !== 'DECLINED' ? ` • ${insuranceOutcome}` : ''}
                                    </span>
                                )}
                            </div>

                            {insuranceDecisionPending && (
                                <div className="insurance-bar-controls">
                                    <input
                                        className="insurance-input"
                                        type="number"
                                        min={0}
                                        max={maxInsurance}
                                        step={5}
                                        value={insuranceAmount}
                                        onChange={(e) => setInsuranceAmount(parseInt(e.target.value || '0', 10))}
                                        disabled={isAnimating}
                                        aria-label="Insurance amount"
                                    />
                                    <button
                                        className="action-btn secondary-btn"
                                        onClick={() => handleResolveInsurance(insuranceAmount)}
                                        disabled={insuranceAmount <= 0 || insuranceAmount > maxInsurance || isAnimating}
                                    >
                                        INSURE
                                    </button>
                                    <button
                                        className="action-btn secondary-btn"
                                        onClick={() => handleResolveInsurance(0)}
                                        disabled={isAnimating}
                                    >
                                        NO INSURANCE
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="player-hands-container">
                        {playerHands.map((hand, index) => {
                            if (!hand) return null;
                            return (
                                <PlayerHand
                                    key={index}
                                    hand={{ ...hand, outcome: outcomeVisible ? hand.outcome : null }}
                                    isActive={hand.isTurn}
                                    showBet={playerHands.length > 1} // Show bet if multiple hands
                                />
                            );
                        })}
                    </div>

                    <div className="action-bar-container">
                        {bettingOpen ? (
                            <div className="betting-controls">
                                <button
                                    className="action-btn deal-btn"
                                    onClick={handleStart}
                                    disabled={currentBet === 0 || isAnimating || isDealing}
                                >
                                    DEAL
                                </button>
                            </div>
                        ) : (
                            !gameOver && (
                                <div className="play-controls" aria-hidden={insuranceDecisionPending}>
                                    <div className="primary-actions">
                                        <button
                                            className="action-btn hit-btn"
                                            onClick={handleHit}
                                            disabled={insuranceDecisionPending || !activeHand || isAnimating}
                                        >
                                            HIT
                                        </button>
                                        <button
                                            className="action-btn stand-btn"
                                            onClick={handleStand}
                                            disabled={insuranceDecisionPending || !activeHand || isAnimating}
                                        >
                                            STAND
                                        </button>
                                    </div>

                                    <div className="secondary-actions">
                                        {canSplit && (
                                            <button
                                                className="action-btn secondary-btn"
                                                onClick={handleSplit}
                                                disabled={insuranceDecisionPending || isAnimating}
                                            >
                                                SPLIT
                                            </button>
                                        )}

                                        {activeHand && activeHand.cards.length === 2 && (
                                            <button
                                                className="action-btn secondary-btn"
                                                onClick={handleDoubleDown}
                                                disabled={
                                                    insuranceDecisionPending ||
                                                    balance < activeHand.bet ||
                                                    isAnimating
                                                }
                                            >
                                                DOUBLE
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                        {/* Game Over State handled by status messages or auto-reset to betting */}
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
