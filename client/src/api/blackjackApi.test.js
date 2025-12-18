jest.mock('axios', () => {
    const create = jest.fn();
    const mockAxios = { create };
    mockAxios.default = mockAxios;
    return mockAxios;
});

const axios = require('axios');
const mockGet = jest.fn();
const mockPost = jest.fn();

describe('blackjackApi', () => {
    let startGame;
    let hit;
    let stand;
    let placeBet;
    let doubleDown;
    let split;
    let resolveInsurance;
    let getState;
    let resetGame;

    const reloadApi = () => {
        jest.isolateModules(() => {
            ({
                startGame,
                hit,
                stand,
                placeBet,
                doubleDown,
                split,
                resolveInsurance,
                getState,
                resetGame,
            } = require('./blackjackApi'));
        });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockReset();
        mockPost.mockReset();
        axios.create.mockReturnValue({ get: mockGet, post: mockPost });
        process.env.REACT_APP_API_URL = 'https://example.com';
        reloadApi();
    });

    it('configures the axios client with the API base url', () => {
        expect(axios.create).toHaveBeenCalledWith({
            baseURL: 'https://example.com',
            withCredentials: true,
        });
    });

    it('requests game start with deck options', async () => {
        await startGame(2, true);
        expect(mockGet).toHaveBeenCalledWith('/start', { params: { decks: 2, dealerHitsOnSoft17: true } });
    });

    it('posts hit, stand, split, double down, and insurance actions', async () => {
        await hit();
        expect(mockPost).toHaveBeenCalledWith('/hit');

        mockPost.mockClear();
        await stand();
        expect(mockPost).toHaveBeenCalledWith('/stand');

        mockPost.mockClear();
        await split();
        expect(mockPost).toHaveBeenCalledWith('/split');

        mockPost.mockClear();
        await doubleDown();
        expect(mockPost).toHaveBeenCalledWith('/doubledown');

        mockPost.mockClear();
        await resolveInsurance(25);
        expect(mockPost).toHaveBeenCalledWith('/insurance', { amount: 25 });
    });

    it('places a bet with the specified amount', async () => {
        await placeBet(50);
        expect(mockPost).toHaveBeenCalledWith('/bet', { amount: 50 });
    });

    it('reads state and resets the game with options', async () => {
        mockGet.mockClear();
        await getState();
        expect(mockGet).toHaveBeenCalledWith('/state');

        mockPost.mockClear();
        await resetGame(6, true);
        expect(mockPost).toHaveBeenCalledWith('/reset', { decks: 6, dealerHitsOnSoft17: true });
    });

    it('uses default parameters for startGame when not provided', async () => {
        await startGame();
        expect(mockGet).toHaveBeenCalledWith('/start', { params: { decks: 1, dealerHitsOnSoft17: false } });
    });

    it('uses default parameters for resetGame when not provided', async () => {
        await resetGame();
        expect(mockPost).toHaveBeenCalledWith('/reset', { decks: 1, dealerHitsOnSoft17: false });
    });
});
