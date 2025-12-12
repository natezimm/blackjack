import { render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import BlackjackGame from './BlackjackGame';
import { getState, placeBet, startGame } from '../api/blackjackApi';

jest.mock('../api/blackjackApi', () => ({
    startGame: jest.fn(),
    hit: jest.fn(),
    stand: jest.fn(),
    placeBet: jest.fn(),
    doubleDown: jest.fn(),
    getState: jest.fn(),
    resetGame: jest.fn(),
}));

const defaultApiState = {
    playerHand: [],
    dealerHand: [],
    currentBet: 0,
    balance: 1000,
    deckSize: 52,
};

describe('BlackjackGame', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        getState.mockResolvedValue({ data: {} });
        placeBet.mockResolvedValue({ data: {} });
        startGame.mockResolvedValue({ data: defaultApiState });
    });

    it('shows the resume prompt when a saved hand exists', async () => {
        localStorage.setItem('blackjackGameState', JSON.stringify({
            playerHand: [{ value: 'K', suit: 'Spades' }],
            dealerHand: [],
            currentBet: 25,
            bettingOpen: false,
        }));
        getState.mockResolvedValue({ data: { playerHand: [{ value: 'Q', suit: 'Hearts' }] } });

            await act(async () => {
                render(<BlackjackGame />);
            });

        await waitFor(() => expect(screen.getByText(/Resume your game/i)).toBeInTheDocument());
        expect(getState).toHaveBeenCalled();
    });

    it('places a bet through the API and updates the current bet display', async () => {
            await act(async () => {
                render(<BlackjackGame />);
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
                render(<BlackjackGame />);
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
});
