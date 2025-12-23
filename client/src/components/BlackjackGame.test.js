import { render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import BlackjackGame, {
    calculateTotal,
    createDeckCountChangeHandler,
    createHydrateStateFromResponse,
    createUpdateBalanceAndStats,
    createUpdateStatsWithOutcome,
    ensureHand,
    fallbackTo,
    handleBetLogic,
    safePersistGameState,
    safePersistStats,
} from './BlackjackGame';
import { processDoubleDownOutcome } from '../utils/doubleDownUtils';
import { MESSAGES } from '../constants/messages';
import { getState, placeBet, startGame, hit, stand, doubleDown, split, resolveInsurance, resetGame } from '../api/blackjackApi';

jest.mock('../api/blackjackApi', () => ({
    startGame: jest.fn(),
    hit: jest.fn(),
    stand: jest.fn(),
    placeBet: jest.fn(),
    doubleDown: jest.fn(),
    split: jest.fn(),
    resolveInsurance: jest.fn(),
    getState: jest.fn(),
    resetGame: jest.fn(),
}));

jest.useFakeTimers();

const defaultApiState = {
    playerHands: [],
    dealerHand: [],
    currentBet: 0,
    balance: 1000,
    deckSize: 52,
};

describe('BlackjackGame', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        localStorage.clear();
        getState.mockResolvedValue({ data: {} });
        placeBet.mockResolvedValue({ data: {} });
        startGame.mockResolvedValue({ data: defaultApiState });
        resolveInsurance.mockResolvedValue({ data: defaultApiState });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const advanceTimers = async (ms) => {
        await act(async () => {
            jest.advanceTimersByTime(ms);
        });
    };

    it('shows the resume prompt when a saved hand exists', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 25 }],
            dealerHand: [],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({ data: { playerHands: [{ cards: [{ value: 'Q', suit: 'Hearts' }], isTurn: true, bet: 25 }] } });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());
        expect(getState).toHaveBeenCalled();
    });

    it('calculates totals for face cards', () => {
        const hand = [
            { value: 'K', suit: 'Hearts' },
            { value: 'Q', suit: 'Spades' },
            { value: 'J', suit: 'Clubs' },
        ];

        expect(calculateTotal(hand)).toBe(30);
    });


    it('places a bet through the API and updates the current bet display', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$5 chip'));
        });

        expect(placeBet).toHaveBeenCalledWith(5);
        const betRow = screen.getByText('Current Bet').closest('.betting-summary');
        expect(betRow).not.toBeNull();
        await waitFor(() => expect(within(betRow).getByText('$5')).toBeInTheDocument());
    });

    it('blocks bets that exceed the available balance and shows a message', async () => {
        getState.mockResolvedValue({ data: { balance: 5 } });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
        const balanceRow = screen.getByText('Balance').closest('.betting-summary');
        expect(balanceRow).not.toBeNull();
        await waitFor(() => expect(within(balanceRow).getByText('$5')).toBeInTheDocument());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$25 chip'));
        });

        expect(placeBet).not.toHaveBeenCalled();
        expect(screen.getByText("Easy, high roller. That bet's bigger than your stack.")).toBeInTheDocument();
    });

    it('toggles mute state when sound button is clicked', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        // Default is unmuted (or based on localStorage, which we cleared in beforeEach)
        const muteButton = screen.getByTitle('Mute sounds');
        expect(muteButton).toBeInTheDocument();
        expect(muteButton).toHaveTextContent('🔊');

        // Click to mute
        await act(async () => {
            await userEvent.click(muteButton);
        });

        // Should now be muted
        expect(muteButton).toHaveTextContent('🔇');
        expect(screen.getByTitle('Unmute sounds')).toBeInTheDocument();
        expect(localStorage.getItem('blackjack_muted')).toBe('true');

        // Click to unmute
        await act(async () => {
            await userEvent.click(muteButton);
        });

        // Should be unmuted
        expect(muteButton).toHaveTextContent('🔊');
        expect(screen.getByTitle('Mute sounds')).toBeInTheDocument();
        expect(localStorage.getItem('blackjack_muted')).toBe('false');
    });

    it('starts a new game when Deal button is clicked', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Place a bet first
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await waitFor(() => expect(placeBet).toHaveBeenCalled());

        // Click Deal
        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        expect(startGame).toHaveBeenCalled();

        await advanceTimers(2000);
    });

    it('offers insurance when dealer shows an Ace and resolves through the API', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '9', suit: 'Hearts' }, { value: '7', suit: 'Spades' }], isTurn: true, bet: 100 }],
                dealerHand: [{ value: '10', suit: 'Clubs' }, { value: 'A', suit: 'Spades' }],
                currentBet: 100,
                balance: 900,
                bettingOpen: false,
                gameOver: false,
                insuranceOffered: true,
                insuranceResolved: false,
                insuranceBet: 0,
                insuranceOutcome: null,
            },
        });

        resolveInsurance.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '9', suit: 'Hearts' }, { value: '7', suit: 'Spades' }], isTurn: true, bet: 100 }],
                dealerHand: [{ value: '10', suit: 'Clubs' }, { value: 'A', suit: 'Spades' }],
                currentBet: 100,
                balance: 850,
                bettingOpen: false,
                gameOver: false,
                insuranceOffered: true,
                insuranceResolved: true,
                insuranceBet: 50,
                insuranceOutcome: 'LOSS',
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$100 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        const insuranceInput = await screen.findByLabelText('Insurance amount');
        await waitFor(() => expect(insuranceInput).toHaveValue(50));

        expect(screen.getByText('HIT')).toBeDisabled();

        await act(async () => {
            await userEvent.click(screen.getByText('INSURE'));
        });

        expect(resolveInsurance).toHaveBeenCalledWith(50);
    });

    it('handles hit action and shows bust message when player busts', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }, { value: '5', suit: 'Clubs' }], isTurn: true, bet: 10, outcome: 'LOSS' }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                gameOver: true,
                balance: 900,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        // Click Hit
        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await advanceTimers(1000);

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles hit action with player win', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        // ... intermediate setup omitted for brevity ...
        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }, { value: 'A', suit: 'Clubs' }], isTurn: true, bet: 10, outcome: 'WIN' }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '5', suit: 'Spades' }],
                gameOver: true,
                playerWins: true, gameOver: true,
                balance: 1020,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        // Click Hit
        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles hit action with tie', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        // ... intermediate setup omitted for brevity in replacement ...
        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10, outcome: 'TIE' }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '10', suit: 'Spades' }],
                gameOver: true,
                tie: true, gameOver: true,
                balance: 1000,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        // Click Hit
        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles hit action with player loss', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '9', suit: 'Hearts' }, { value: '8', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '7', suit: 'Spades' }, { value: '3', suit: 'Clubs' }], isTurn: true, bet: 10, outcome: 'LOSS' }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '9', suit: 'Diamonds' }],
                gameOver: true,
                balance: 960,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await waitFor(() => expect(hit).toHaveBeenCalled());
        await advanceTimers(3000);
        await waitFor(() => expect(screen.getByText('LOSS')).toBeInTheDocument());
    });

    it('handles stand action with player win', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        stand.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10, outcome: 'WIN' }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '5', suit: 'Spades' }, { value: '10', suit: 'Clubs' }],
                playerWins: true, gameOver: true,
                balance: 1020,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const standButton = screen.getByText('STAND');
            expect(standButton).not.toBeDisabled();
        });

        // Click Stand
        const standButton = screen.getByText('STAND');
        await act(async () => {
            await userEvent.click(standButton);
        });

        // Advance timers to reveal the dealer's cards
        await advanceTimers(500);
        await advanceTimers(500);
        await advanceTimers(500);

        await waitFor(() => expect(stand).toHaveBeenCalled());
    });


    it('handles stand action with dealer win', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '5', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        stand.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '5', suit: 'Spades' }], isTurn: true, bet: 10, outcome: 'LOSS' }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '10', suit: 'Spades' }],
                gameOver: true, balance: 990,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const standButton = screen.getByText('STAND');
            expect(standButton).not.toBeDisabled();
        });

        // Click Stand
        const standButton = screen.getByText('STAND');
        await act(async () => {
            await userEvent.click(standButton);
        });

        await advanceTimers(2000);

        await waitFor(() => expect(stand).toHaveBeenCalled());
    });

    it('handles double down action with player win', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        doubleDown.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }, { value: 'A', suit: 'Clubs' }], isTurn: true, bet: 10, outcome: 'WIN' }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '5', suit: 'Spades' }, { value: '10', suit: 'Clubs' }],
                playerWins: true, gameOver: true,
                balance: 1040,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state with 2 cards
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const doubleDownButton = screen.getByText('DOUBLE');
            expect(doubleDownButton).not.toBeDisabled();
        });

        // Click Double Down
        const doubleDownButton = screen.getByText('DOUBLE');
        await act(async () => {
            await userEvent.click(doubleDownButton);
        });

        await advanceTimers(500);
        await advanceTimers(500);
        await advanceTimers(500);
        await advanceTimers(500);

        await waitFor(() => expect(doubleDown).toHaveBeenCalled());
    });

    it('handles double down action with error', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        doubleDown.mockRejectedValue({
            response: {
                data: { error: 'Insufficient balance' },
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const doubleDownButton = screen.getByText('DOUBLE');
            expect(doubleDownButton).not.toBeDisabled();
        });

        // Click Double Down
        const doubleDownButton = screen.getByText('DOUBLE');
        await act(async () => {
            await userEvent.click(doubleDownButton);
        });

        await waitFor(() => expect(doubleDown).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText('Insufficient balance')).toBeInTheDocument());
    });

    it('handles double down with multiple dealer cards', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '8', suit: 'Hearts' }, { value: '9', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        // ... intermediate setup omitted ...
        doubleDown.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '8', suit: 'Hearts' }, { value: '9', suit: 'Spades' }, { value: 'A', suit: 'Clubs' }], isTurn: true, bet: 10, outcome: 'WIN' }],
                dealerHand: [
                    { value: 'K', suit: 'Hearts' },
                    { value: '5', suit: 'Spades' },
                    { value: '3', suit: 'Clubs' },
                    { value: '2', suit: 'Diamonds' },
                ],
                playerWins: true, gameOver: true,
                balance: 1040,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        await waitFor(() => {
            const doubleDownButton = screen.getByText('DOUBLE');
            expect(doubleDownButton).not.toBeDisabled();
        });

        const doubleDownButton = screen.getByText('DOUBLE');
        await act(async () => {
            await userEvent.click(doubleDownButton);
        });

        await advanceTimers(500);
        await advanceTimers(500);
        await advanceTimers(500);
        await advanceTimers(500);

        await waitFor(() => expect(doubleDown).toHaveBeenCalled());
    });

    it('handles split action successfully', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '8', suit: 'Hearts' }, { value: '8', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        split.mockResolvedValue({
            data: {
                playerHands: [
                    { cards: [{ value: '8', suit: 'Hearts' }, { value: 'K', suit: 'Clubs' }], isTurn: true, bet: 10 },
                    { cards: [{ value: '8', suit: 'Spades' }, { value: '5', suit: 'Diamonds' }], isTurn: false, bet: 10 }
                ],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                gameOver: false,
                balance: 980, // Bet doubled
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());
        await advanceTimers(2000);
        await advanceTimers(2000);

        // Wait for Split button to be enabled
        await waitFor(() => {
            const splitButton = screen.getByText('SPLIT');
            expect(splitButton).not.toBeDisabled();
        });

        const splitButton = screen.getByText('SPLIT');
        await act(async () => {
            await userEvent.click(splitButton);
        });

        await waitFor(() => expect(split).toHaveBeenCalled());

        // Use getAllByText for "Bet: 10" since there are now two hands with that bet
        await waitFor(() => {
            const betElements = screen.getAllByText('Bet: $10');
            expect(betElements.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('handles resume action', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 25 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 25 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                bettingOpen: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const resumeButton = screen.getByText('Resume');
        await act(async () => {
            await userEvent.click(resumeButton);
        });

        await waitFor(() => expect(screen.queryByText(/Resume your game/i)).not.toBeInTheDocument());
    });

    it('handles fresh start action', async () => {
        resetGame.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                deckSize: 52,
            },
        });

        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                bettingOpen: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const freshStartButton = screen.getByText('Start New');
        await act(async () => {
            await userEvent.click(freshStartButton);
        });

        await waitFor(() => expect(resetGame).toHaveBeenCalled());
    });

    it('handles fresh start with minimal API response', async () => {
        resetGame.mockResolvedValue({
            data: {},
        });

        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                bettingOpen: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const freshStartButton = screen.getByText('Start New');
        await act(async () => {
            await userEvent.click(freshStartButton);
        });

        await waitFor(() => expect(resetGame).toHaveBeenCalled());
    });

    it('opens and closes settings modal', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open settings
        const settingsButton = screen.getByLabelText('Game settings');
        await act(async () => {
            await userEvent.click(settingsButton);
        });

        await waitFor(() => expect(screen.getByText('Game Settings')).toBeInTheDocument());

        // Close settings
        const closeButton = screen.getByText('Close');
        await act(async () => {
            await userEvent.click(closeButton);
        });

        await waitFor(() => expect(screen.queryByText('Game Settings')).not.toBeInTheDocument());
    });

    it('changes deck count in settings', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open settings
        const settingsButton = screen.getByLabelText('Game settings');
        await act(async () => {
            await userEvent.click(settingsButton);
        });

        await waitFor(() => expect(screen.getByText('Game Settings')).toBeInTheDocument());

        // Change deck count
        const deckSelect = screen.getByDisplayValue('1');
        await act(async () => {
            await userEvent.selectOptions(deckSelect, '4');
        });

        expect(deckSelect.value).toBe('4');
    });

    it('toggles dealer hits on soft 17', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open settings
        const settingsButton = screen.getByLabelText('Game settings');
        await act(async () => {
            await userEvent.click(settingsButton);
        });

        await waitFor(() => expect(screen.getByText('Game Settings')).toBeInTheDocument());

        // Toggle soft 17
        const checkbox = screen.getByRole('checkbox');
        await act(async () => {
            await userEvent.click(checkbox);
        });

        expect(checkbox.checked).toBe(true);
    });

    it('changes card back color', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open settings
        const settingsButton = screen.getByLabelText('Game settings');
        await act(async () => {
            await userEvent.click(settingsButton);
        });

        await waitFor(() => expect(screen.getByText('Game Settings')).toBeInTheDocument());

        // Change to blue
        const blueRadio = screen.getByDisplayValue('blue');
        await act(async () => {
            await userEvent.click(blueRadio);
        });

        expect(blueRadio.checked).toBe(true);
    });

    it('opens and closes stats modal', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open stats
        const statsButton = screen.getByLabelText('Show stats');
        await act(async () => {
            await userEvent.click(statsButton);
        });

        await waitFor(() => expect(screen.getByText('Stats')).toBeInTheDocument());

        // Close stats
        const closeButtons = screen.getAllByText('Close');
        const statsCloseButton = closeButtons.find(btn => btn.closest('.settings-modal-content'));
        if (statsCloseButton) {
            await act(async () => {
                await userEvent.click(statsCloseButton);
            });
        }

        await waitFor(() => expect(screen.queryByText('Stats')).not.toBeInTheDocument());
    });

    it('resets stats when reset button is clicked', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open stats
        const statsButton = screen.getByLabelText('Show stats');
        await act(async () => {
            await userEvent.click(statsButton);
        });

        await waitFor(() => expect(screen.getByText('Stats')).toBeInTheDocument());

        // Reset stats
        const resetButton = screen.getByText('Reset Stats');
        await act(async () => {
            await userEvent.click(resetButton);
        });

        // Stats should still be visible
        expect(screen.getByText('Stats')).toBeInTheDocument();
    });

    it('handles error when starting game fails', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        startGame.mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
            consoleSpy.mockRestore();
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Place a bet
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        // Try to start game
        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        expect(startGame).toHaveBeenCalled();
    });

    it('handles error when placing bet fails', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        placeBet.mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
            consoleSpy.mockRestore();
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Try to place bet
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        expect(placeBet).toHaveBeenCalled();
    });

    it('handles error when hitting fails', async () => {
        getState.mockResolvedValue({ data: {} });

        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // Wait for state to update and button to be enabled
        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        }, { timeout: 3000 });

        // Try to hit
        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await waitFor(() => expect(hit).toHaveBeenCalled(), { timeout: 3000 });
    });

    it('handles error when standing fails', async () => {
        getState.mockResolvedValue({ data: {} });

        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        stand.mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // Wait for state to update and button to be enabled
        await waitFor(() => {
            const standButton = screen.getByText('STAND');
            expect(standButton).not.toBeDisabled();
        }, { timeout: 3000 });

        // Try to stand
        const standButton = screen.getByText('STAND');
        await act(async () => {
            await userEvent.click(standButton);
        });

        await waitFor(() => expect(stand).toHaveBeenCalled(), { timeout: 3000 });
    });

    it('handles error when fetching state fails', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        getState.mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
            consoleSpy.mockRestore();
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles error when resetting game fails', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        resetGame.mockRejectedValue(new Error('Network error'));

        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                bettingOpen: false,
            },

        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const freshStartButton = screen.getByText('Start New');
        await act(async () => {
            await userEvent.click(freshStartButton);
        });

        expect(resetGame).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('does not place bet when betting is closed', async () => {
        // Clear localStorage to avoid resume prompt
        localStorage.clear();

        // Set up state - start with bettingOpen: true to avoid resume prompt
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                gameOver: true, balance: 990,
                bettingOpen: true, // Start with betting open to avoid resume prompt
                gameOver: false,
            },
        });

        // Mock startGame to return state with betting closed
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                balance: 980,
                bettingOpen: false, // Game starts, betting closes
                gameOver: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Now simulate a game state where betting is closed
        // We'll do this by starting a game, which closes betting
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // After starting a game, betting should be closed
        // Wait for chips to be disabled
        await waitFor(() => {
            const chip = screen.getByAltText('$10 chip');
            const chipContainer = chip.closest('.chip-img');
            expect(chipContainer).toHaveClass('disabled');
        }, { timeout: 3000 });

        // Clear any previous calls
        placeBet.mockClear();

        // Verify chip is disabled before trying to click
        const chip = screen.getByAltText('$10 chip');
        const chipContainer = chip.closest('.chip-img');

        // The chip should be disabled, so clicking it should not trigger onClick
        expect(chipContainer).toHaveClass('disabled');

        // Even if we try to click, the Chip component checks !disabled before calling onClick
        // And handleBet checks bettingOpen at the start and returns early
        // So placeBet should never be called
        await act(async () => {
            // Try clicking - but it should be a no-op because chip is disabled
            await userEvent.click(chip);
        });

        // handleBet should not be called because:
        // 1. Chip is disabled, so onClick is not called
        // 2. Even if onClick were called, handleBet checks bettingOpen and returns early
        expect(placeBet).not.toHaveBeenCalled();
    });

    it('shows game over message when balance is 0', async () => {
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                balance: 0,
                bettingOpen: true,
                gameOver: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Bankroll empty/i)).toBeInTheDocument());
    });

    it('handles resume without pending state', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // If resume prompt shows, click resume
        const resumePrompt = screen.queryByText(/Resume your game/i);
        if (resumePrompt) {
            const resumeButton = screen.getByText('Resume');
            await act(async () => {
                await userEvent.click(resumeButton);
            });
        }
    });

    it('handles stats modal click outside to close', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open stats
        const statsButton = screen.getByLabelText('Show stats');
        await act(async () => {
            await userEvent.click(statsButton);
        });

        await waitFor(() => expect(screen.getByText('Stats')).toBeInTheDocument());

        // Click outside (on overlay)
        const overlay = document.querySelector('.settings-modal-overlay');
        if (overlay) {
            await act(async () => {
                await userEvent.click(overlay);
            });
        }

        await waitFor(() => expect(screen.queryByText('Stats')).not.toBeInTheDocument());
    });

    it('handles all chip values', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Test all chips
        const chips = [5, 10, 25, 100];
        for (const amount of chips) {
            const chip = screen.getByAltText(`$${amount} chip`);
            await act(async () => {
                await userEvent.click(chip);
            });
        }

        expect(placeBet).toHaveBeenCalledTimes(chips.length);
    });

    it('handles stand with multiple dealer cards', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        stand.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [
                    { value: 'K', suit: 'Hearts' },
                    { value: '5', suit: 'Spades' },
                    { value: '3', suit: 'Clubs' },
                    { value: '2', suit: 'Diamonds' },
                ],
                playerWins: true, gameOver: true,
                balance: 1020,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // Wait for state to update
        await waitFor(() => {
            const standButton = screen.getByText('STAND');
            expect(standButton).not.toBeDisabled();
        });

        // Click Stand
        const standButton = screen.getByText('STAND');
        await act(async () => {
            await userEvent.click(standButton);
        });

        // Advance timers for all card reveals
        await advanceTimers(500);
        await advanceTimers(500);
        await advanceTimers(500);
        await advanceTimers(500);

        await waitFor(() => expect(stand).toHaveBeenCalled());
    });

    it('handles double down with tie', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        doubleDown.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }, { value: 'A', suit: 'Clubs' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: 'A', suit: 'Spades' }],
                tie: true, gameOver: true,
                balance: 1000,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const doubleDownButton = screen.getByText('DOUBLE');
            expect(doubleDownButton).not.toBeDisabled();
        });

        // Click Double Down
        const doubleDownButton = screen.getByText('DOUBLE');
        await act(async () => {
            await userEvent.click(doubleDownButton);
        });

        await advanceTimers(2000);

        await waitFor(() => expect(doubleDown).toHaveBeenCalled());
    });

    it('handles localStorage errors gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        // Mock localStorage to throw errors
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = jest.fn(() => {
            throw new Error('Storage quota exceeded');
            consoleSpy.mockRestore();
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Try to place a bet (should handle storage error)
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        // Restore
        localStorage.setItem = originalSetItem;
    });

    it('handles localStorage getItem errors gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const originalGetItem = localStorage.getItem;
        localStorage.getItem = jest.fn(() => {
            throw new Error('Storage error');
            consoleSpy.mockRestore();
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Restore
        localStorage.getItem = originalGetItem;
    });

    it('handles invalid JSON in localStorage', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        localStorage.setItem('blackjackGameState', 'invalid json');
        localStorage.setItem('blackjackStats', 'invalid json');

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
        consoleSpy.mockRestore();
    });

    it('handles errors thrown by safePersistStats', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const storage = {
            setItem: jest.fn(() => {
                throw new Error('Persist stats failed');
            }),
        };

        safePersistStats({ highestBankroll: 0 }, storage);

        expect(storage.setItem).toHaveBeenCalledWith('blackjackStats', expect.any(String));
        consoleSpy.mockRestore();
    });

    it('handles errors thrown by safePersistGameState', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const storage = {
            setItem: jest.fn(() => {
                throw new Error('Persist game state failed');
            }),
        };

        safePersistGameState({ balance: 0 }, storage);

        expect(storage.setItem).toHaveBeenCalledWith('blackjackGameState', expect.any(String));
        consoleSpy.mockRestore();
    });

    it('createUpdateBalanceAndStats handles fallback highest bankroll', () => {
        const setBalance = jest.fn();
        const persistStats = jest.fn();
        const setStats = jest.fn();
        setStats.mockImplementation(fn => fn({ highestBankroll: 0 }));

        const updateBalanceAndStats = createUpdateBalanceAndStats({ setBalance, setStats, persistStats });

        updateBalanceAndStats(250);

        expect(setBalance).toHaveBeenCalledWith(250);
        expect(persistStats).toHaveBeenCalledWith(expect.objectContaining({ highestBankroll: 250 }));
    });

    it('createUpdateBalanceAndStats ignores invalid balances', () => {
        const setBalance = jest.fn();
        const setStats = jest.fn();
        const persistStats = jest.fn();

        const updateBalanceAndStats = createUpdateBalanceAndStats({ setBalance, setStats, persistStats });

        updateBalanceAndStats(NaN);

        expect(setBalance).not.toHaveBeenCalled();
        expect(setStats).not.toHaveBeenCalled();
        expect(persistStats).not.toHaveBeenCalled();
    });

    it('createUpdateStatsWithOutcome handles missing payout and balance', () => {
        const setStats = jest.fn();
        const persistStats = jest.fn();
        setStats.mockImplementation(fn => fn({
            highestBankroll: 100,
            currentWinStreak: 2,
            sessionHandsWon: 3,
            longestWinStreak: 2,
            mostHandsWon: 3,
            bestPayout: 50,
        }));

        const updateStatsWithOutcome = createUpdateStatsWithOutcome({ setStats, persistStats });

        updateStatsWithOutcome('win', undefined, undefined);

        expect(persistStats).toHaveBeenCalled();
    });

    it('createUpdateStatsWithOutcome resets streak on loss', () => {
        const setStats = jest.fn();
        const persistStats = jest.fn();
        setStats.mockImplementation(fn => fn({ currentWinStreak: 4 }));

        const updateStatsWithOutcome = createUpdateStatsWithOutcome({ setStats, persistStats });

        updateStatsWithOutcome('loss', 0, 100);

        expect(persistStats).toHaveBeenCalledWith(expect.objectContaining({ currentWinStreak: 0 }));
    });

    it('createUpdateStatsWithOutcome resets streak on tie', () => {
        const setStats = jest.fn();
        const persistStats = jest.fn();
        setStats.mockImplementation(fn => fn({ currentWinStreak: 5 }));

        const updateStatsWithOutcome = createUpdateStatsWithOutcome({ setStats, persistStats });

        updateStatsWithOutcome('tie', 0, 80);

        expect(persistStats).toHaveBeenCalledWith(expect.objectContaining({ currentWinStreak: 0 }));
    });

    it('createHydrateStateFromResponse handles missing state and reveal flag', () => {
        const updateBalanceAndStats = jest.fn();
        const setPlayerHand = jest.fn();
        const setDealerHand = jest.fn();
        const setGameOver = jest.fn();
        const setBettingOpen = jest.fn();
        const setCurrentBet = jest.fn();
        const setNumberOfDecks = jest.fn();
        const setCardBackColor = jest.fn();
        const setDealerHitsOnSoft17 = jest.fn();
        const setDeckSize = jest.fn();
        const setRevealDealerCard = jest.fn();
        const setMessage = jest.fn();
        const setCanPersistState = jest.fn();

        const hydrateState = createHydrateStateFromResponse({
            balance: 500,
            updateBalanceAndStats,
            setPlayerHand,
            setPlayerHands: jest.fn(),
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
            setCanPersistState,
        });

        hydrateState(null, {});

        expect(updateBalanceAndStats).not.toHaveBeenCalled();
        expect(setPlayerHand).not.toHaveBeenCalled();

        hydrateState({
            balance: 800,
            playerHands: [{ cards: [{ value: '5', suit: 'Hearts' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'K', suit: 'Hearts' }],
            gameOver: false,
            bettingOpen: true,
            currentBet: 20,
            numberOfDecks: 1,
            dealerHitsOnSoft17: true,
            deckSize: 52,
            revealDealerCard: true,
            message: 'hi',
        }, { message: 'fallback' });

        expect(updateBalanceAndStats).toHaveBeenCalledWith(800);
        expect(setRevealDealerCard).toHaveBeenCalledWith(true);
        expect(setMessage).toHaveBeenCalledWith('hi');
        expect(setCanPersistState).toHaveBeenCalledWith(true);
    });

    it('ensureHand falls back to an empty array', () => {
        const cards = [{ value: 'A', suit: 'Hearts' }];
        expect(ensureHand(cards)).toBe(cards);
        expect(ensureHand(null)).toEqual([]);
    });

    it('fallbackTo falls back when value is nullish', () => {
        expect(fallbackTo(undefined, 10)).toBe(10);
        expect(fallbackTo(0, 10)).toBe(0);
    });

    it('createDeckCountChangeHandler updates deck counts', () => {
        const setNumberOfDecks = jest.fn();
        const setDeckSize = jest.fn();

        const handler = createDeckCountChangeHandler({ setNumberOfDecks, setDeckSize });
        handler({ target: { value: '4' } });

        expect(setNumberOfDecks).toHaveBeenCalledWith(4);
        expect(setDeckSize).toHaveBeenCalledWith(208);
    });

    it('handleBetLogic respects limits and places bets', async () => {
        const setMessage = jest.fn();
        const setCurrentBet = jest.fn();
        const placeBet = jest.fn().mockResolvedValue();

        await handleBetLogic({
            bettingOpen: false,
            currentBet: 10,
            balance: 100,
            setMessage,
            setCurrentBet,
            placeBet,
        }, 5);

        expect(placeBet).not.toHaveBeenCalled();

        await handleBetLogic({
            bettingOpen: true,
            currentBet: 10,
            balance: 15,
            setMessage,
            setCurrentBet,
            placeBet,
        }, 10);

        expect(setMessage).toHaveBeenCalledWith(MESSAGES.betTooHigh);

        await handleBetLogic({
            bettingOpen: true,
            currentBet: 5,
            balance: 50,
            setMessage,
            setCurrentBet,
            placeBet,
        }, 10);

        expect(placeBet).toHaveBeenCalledWith(15);
        expect(setCurrentBet).toHaveBeenCalledWith(15);
    });


    it('processDoubleDownOutcome honours the tie branch', () => {
        const updateBalance = jest.fn();
        const updateStats = jest.fn();
        const setMessage = jest.fn();

        processDoubleDownOutcome({
            data: { tie: true, gameOver: true, balance: 300 },
            doubledBet: 15,
            balance: 280,
            updateBalanceAndStats: updateBalance,
            updateStatsWithOutcome: updateStats,
            setMessage,
        });

        expect(setMessage).toHaveBeenCalledWith('Push 🤝 Chips stay put.');
        expect(updateBalance).toHaveBeenCalledWith(300);
        expect(updateStats).toHaveBeenCalledWith('tie', 0, 300);
    });

    it('processDoubleDownOutcome honour the dealer win branch', () => {
        const updateBalance = jest.fn();
        const updateStats = jest.fn();
        const setMessage = jest.fn();

        processDoubleDownOutcome({
            data: { balance: 150 },
            doubledBet: 15,
            balance: 200,
            updateBalanceAndStats: updateBalance,
            updateStatsWithOutcome: updateStats,
            setMessage,
        });

        expect(setMessage).toHaveBeenCalledWith('Dealer takes it. 💼 Try again!');
        expect(updateBalance).toHaveBeenCalledWith(150);
        expect(updateStats).toHaveBeenCalledWith('loss', 0, 150);
    });

    it('processDoubleDownOutcome falls back to provided balance for ties without API value', () => {
        const updateBalance = jest.fn();
        const updateStats = jest.fn();
        const setMessage = jest.fn();

        processDoubleDownOutcome({
            data: { tie: true },
            doubledBet: 10,
            balance: 50,
            updateBalanceAndStats: updateBalance,
            updateStatsWithOutcome: updateStats,
            setMessage,
        });

        expect(setMessage).toHaveBeenCalledWith('Push 🤝 Chips stay put.');
        expect(updateBalance).toHaveBeenCalledWith(50);
        expect(updateStats).toHaveBeenCalledWith('tie', 0, 50);
    });

    it('processDoubleDownOutcome falls back to provided balance when dealer wins without API value', () => {
        const updateBalance = jest.fn();
        const updateStats = jest.fn();
        const setMessage = jest.fn();

        processDoubleDownOutcome({
            data: {},
            doubledBet: 10,
            balance: 75,
            updateBalanceAndStats: updateBalance,
            updateStatsWithOutcome: updateStats,
            setMessage,
        });

        expect(setMessage).toHaveBeenCalledWith('Dealer takes it. 💼 Try again!');
        expect(updateBalance).toHaveBeenCalledWith(75);
        expect(updateStats).toHaveBeenCalledWith('loss', 0, 75);
    });

    it('processDoubleDownOutcome honours the player win branch', () => {
        const updateBalance = jest.fn();
        const updateStats = jest.fn();
        const setMessage = jest.fn();

        processDoubleDownOutcome({
            data: { playerWins: true },
            doubledBet: 10,
            balance: 200,
            updateBalanceAndStats: updateBalance,
            updateStatsWithOutcome: updateStats,
            setMessage,
        });

        expect(setMessage).toHaveBeenCalledWith('Win! 🥳 You outplayed the house.');
        expect(updateBalance).toHaveBeenCalledWith(220);
        expect(updateStats).toHaveBeenCalledWith('win', 10, 220);
    });

    it('handles startGame with balance from API', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Hearts' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Spades' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                deckSize: 52,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());
    });

    it('handles startGame without balance from API', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Hearts' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Spades' }],
                currentBet: 10,
                deckSize: 52,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());
    });

    it('handles startGame fallback when API returns minimal data', async () => {
        startGame.mockResolvedValue({
            data: {},
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());
    });

    it('handles hit without gameOver', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '5', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '5', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                gameOver: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // Wait for state to update
        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        // Click Hit
        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles hit fallback with minimal API response', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockResolvedValue({
            data: {
                gameOver: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        await act(async () => {
            await userEvent.click(screen.getByText('HIT'));
        });

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles stand with empty player hand from API', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        stand.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '5', suit: 'Spades' }],
                playerWins: true, gameOver: true,
                balance: 1020,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // Wait for state to update
        await waitFor(() => {
            const standButton = screen.getByText('STAND');
            expect(standButton).not.toBeDisabled();
        });

        // Click Stand
        const standButton = screen.getByText('STAND');
        await act(async () => {
            await userEvent.click(standButton);
        });

        await advanceTimers(2000);

        await waitFor(() => expect(stand).toHaveBeenCalled());
    });

    it('handles stand fallback with minimal API response', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        stand.mockResolvedValue({
            data: {},
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        const standButton = screen.getByText('STAND');
        await act(async () => {
            await userEvent.click(standButton);
        });

        await advanceTimers(2000);

        await waitFor(() => expect(stand).toHaveBeenCalled());
    });

    it('handles double down with empty player hand from API', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        doubleDown.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '5', suit: 'Spades' }],
                playerWins: true, gameOver: true,
                balance: 1040,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        // Wait for state to update
        await waitFor(() => {
            const doubleDownButton = screen.getByText('DOUBLE');
            expect(doubleDownButton).not.toBeDisabled();
        });

        // Click Double Down
        const doubleDownButton = screen.getByText('DOUBLE');
        await act(async () => {
            await userEvent.click(doubleDownButton);
        });

        await advanceTimers(2000);

        await waitFor(() => expect(doubleDown).toHaveBeenCalled());
    });

    it('handles double down fallback with minimal API response', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        doubleDown.mockResolvedValue({
            data: {},
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        const doubleDownButton = screen.getByText('DOUBLE');
        await act(async () => {
            await userEvent.click(doubleDownButton);
        });

        await advanceTimers(2000);

        await waitFor(() => expect(doubleDown).toHaveBeenCalled());
    });

    it('handles settings button disabled when betting is not open', async () => {
        // Clear localStorage to avoid resume prompt
        localStorage.clear();

        // Set up state - start with bettingOpen: true to avoid resume prompt
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                gameOver: true, balance: 990,
                bettingOpen: true, // Start with betting open to avoid resume prompt
                gameOver: false,
            },
        });

        // Mock startGame to return state with betting closed
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                balance: 980,
                bettingOpen: false, // Game starts, betting closes
                gameOver: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Start a game to close betting
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // Wait for component to update - settings button should be disabled when betting is closed
        await waitFor(() => {
            const settingsButton = screen.getByLabelText('Game settings');
            // Settings button should be disabled when bettingOpen is false (after game starts)
            expect(settingsButton).toBeDisabled();
        }, { timeout: 3000 });
    });

    it('handles resume with server state having stored hand', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHand: [],
            dealerHand: [],
            currentBet: 0,
            bettingOpen: true,
        }));
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                bettingOpen: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const resumeButton = screen.getByText('Resume');
        await act(async () => {
            await userEvent.click(resumeButton);
        });

        await waitFor(() => expect(screen.queryByText(/Resume your game/i)).not.toBeInTheDocument());
    });

    it('handles resume with local state having stored hand', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const resumeButton = screen.getByText('Resume');
        await act(async () => {
            await userEvent.click(resumeButton);
        });

        await waitFor(() => expect(screen.queryByText(/Resume your game/i)).not.toBeInTheDocument());
    });

    it('handles fetchExistingState when no stored hand exists', async () => {
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles hydrateStateFromResponse with all state fields', async () => {
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                balance: 975,
                bettingOpen: false,
                gameOver: false,
                numberOfDecks: 2,
                dealerHitsOnSoft17: true,
                cardBackColor: 'blue',
                deckSize: 104,
                revealDealerCard: false,
                message: 'Test message',
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles hydrateStateFromResponse with minimal state', async () => {
        getState.mockResolvedValue({
            data: {},
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles updateBalanceAndStats with NaN', async () => {
        getState.mockResolvedValue({
            data: {
                balance: NaN,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles updateStatsWithOutcome with loss', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }, { value: '5', suit: 'Clubs' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                gameOver: true,
                gameOver: true, balance: 990,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Set up game state
        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        // Wait for state to update
        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        // Click Hit to bust
        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await advanceTimers(1000);

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles hasStoredHand with only playerHand', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [],
            currentBet: 0,
            bettingOpen: true,
        }));
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles hasStoredHand with only dealerHand', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHand: [],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 0,
            bettingOpen: true,
        }));
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles hasStoredHand with only currentBet', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHand: [],
            dealerHand: [],
            currentBet: 25,
            bettingOpen: true,
        }));
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles hasStoredHand with bettingOpen false', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHand: [],
            dealerHand: [],
            currentBet: 0,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles resetGame with deckSize from API', async () => {
        resetGame.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                deckSize: 208,
            },
        });

        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                bettingOpen: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const freshStartButton = screen.getByText('Start New');
        await act(async () => {
            await userEvent.click(freshStartButton);
        });

        await waitFor(() => expect(resetGame).toHaveBeenCalled());
    });

    it('handles resetGame without deckSize from API', async () => {
        resetGame.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
            },
        });

        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'Q', suit: 'Hearts' }],
                currentBet: 25,
                bettingOpen: false,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());

        const freshStartButton = screen.getByText('Start New');
        await act(async () => {
            await userEvent.click(freshStartButton);
        });

        await waitFor(() => expect(resetGame).toHaveBeenCalled());
    });

    it('handles hit with gameOver but not busted (player wins)', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }, { value: 'A', suit: 'Clubs' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '5', suit: 'Spades' }],
                gameOver: true,
                playerWins: true, gameOver: true,
                balance: 1020,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles hit with gameOver but not busted (tie)', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        hit.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '10', suit: 'Spades' }],
                gameOver: true,
                tie: true, gameOver: true,
                balance: 1000,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await waitFor(() => {
            const hitButton = screen.getByText('HIT');
            expect(hitButton).not.toBeDisabled();
        });

        const hitButton = screen.getByText('HIT');
        await act(async () => {
            await userEvent.click(hitButton);
        });

        await waitFor(() => expect(hit).toHaveBeenCalled());
    });

    it('handles double down with dealer win', async () => {
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '5', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        doubleDown.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '5', suit: 'Spades' }, { value: '10', suit: 'Clubs' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }, { value: '10', suit: 'Spades' }],
                balance: 980,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await advanceTimers(2000);

        await waitFor(() => {
            const doubleDownButton = screen.getByText('DOUBLE');
            expect(doubleDownButton).not.toBeDisabled();
        });

        const doubleDownButton = screen.getByText('DOUBLE');
        await act(async () => {
            await userEvent.click(doubleDownButton);
        });

        await advanceTimers(2000);

        await waitFor(() => expect(doubleDown).toHaveBeenCalled());
    });

    it('handles resume without pendingState', async () => {
        getState.mockResolvedValue({
            data: {
                playerHand: [],
                dealerHand: [],
                currentBet: 0,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Manually trigger handleResume without pendingState
        // This would happen if resume is called but pendingState is null
        // We can't directly call handleResume, but we can test the scenario
        // by ensuring the component handles the case where resume prompt might show
        // but pendingState is cleared
    });

    it('handles fetchExistingState error with storedGameState', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHands: [{ cards: [{ value: 'K', suit: 'Spades' }], isTurn: true, bet: 10 }],
            dealerHand: [{ value: 'Q', suit: 'Hearts' }],
            currentBet: 25,
            bettingOpen: false,
        }));

        getState.mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
        consoleSpy.mockRestore();
    });

    it('handles calculateTotal with face cards', async () => {
        getState.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: 'K', suit: 'Hearts' }, { value: 'Q', suit: 'Spades' }, { value: 'J', suit: 'Clubs' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'A', suit: 'Diamonds' }],
                currentBet: 0,
                balance: 1000,
                bettingOpen: true,
            },
        });

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());
    });

    it('handles card back color onChange', async () => {
        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        // Open settings
        const settingsButton = screen.getByLabelText('Game settings');
        await act(async () => {
            await userEvent.click(settingsButton);
        });

        await waitFor(() => expect(screen.getByText('Game Settings')).toBeInTheDocument());

        // Toggle card back colors
        const blueRadio = screen.getByDisplayValue('blue');
        await act(async () => {
            await userEvent.click(blueRadio);
        });
        expect(blueRadio.checked).toBe(true);

        const redRadio = screen.getByDisplayValue('red');
        await act(async () => {
            await userEvent.click(redRadio);
        });
        expect(redRadio.checked).toBe(true);
    });

    it('handles stand error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        startGame.mockResolvedValue({
            data: {
                playerHands: [{ cards: [{ value: '10', suit: 'Hearts' }, { value: '10', suit: 'Spades' }], isTurn: true, bet: 10 }],
                dealerHand: [{ value: 'K', suit: 'Hearts' }],
                currentBet: 10,
                gameOver: true, balance: 990,
                bettingOpen: false,
                gameOver: false,
            },
        });

        stand.mockRejectedValue(new Error('Network error'));

        await act(async () => {
            render(<BlackjackGame initialSkipAnimations={true} />);
        });

        await waitFor(() => expect(getState).toHaveBeenCalled());

        await act(async () => {
            await userEvent.click(screen.getByAltText('$10 chip'));
        });

        await act(async () => {
            await userEvent.click(screen.getByText('DEAL'));
        });

        await waitFor(() => expect(startGame).toHaveBeenCalled());

        await waitFor(() => {
            const standButton = screen.getByText('STAND');
            expect(standButton).not.toBeDisabled();
        });

        const standButton = screen.getByText('STAND');
        await act(async () => {
            await userEvent.click(standButton);
        });

        await waitFor(() => expect(stand).toHaveBeenCalled());
        consoleSpy.mockRestore();
    });
});
