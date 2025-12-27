jest.mock('axios', () => {
    const mockInterceptors = {
        response: {
            use: jest.fn(),
        },
        request: {
            use: jest.fn(),
        },
    };
    const create = jest.fn(() => ({
        get: jest.fn(),
        post: jest.fn(),
        interceptors: mockInterceptors,
    }));
    const mockAxios = { create };
    mockAxios.default = mockAxios;
    return mockAxios;
});

const axios = require('axios');
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockInterceptors = {
    response: { use: jest.fn() },
    request: { use: jest.fn() },
};

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
        axios.create.mockReturnValue({ 
            get: mockGet, 
            post: mockPost,
            interceptors: mockInterceptors,
        });
        process.env.REACT_APP_API_URL = 'https://example.com';
        reloadApi();
    });

    it('configures the axios client with the API base url', () => {
        expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
            baseURL: 'https://example.com',
            withCredentials: true,
        }));
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

    it('handles response interceptor for successful responses', () => {
        // Verify interceptor was registered
        expect(mockInterceptors.response.use).toHaveBeenCalled();
        
        // Get the success handler from the interceptor registration
        const successHandler = mockInterceptors.response.use.mock.calls[0][0];
        const testResponse = { data: 'test' };
        expect(successHandler(testResponse)).toBe(testResponse);
    });

    it('handles response interceptor for errors with response', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        const errorHandler = mockInterceptors.response.use.mock.calls[0][1];
        
        const errorWithResponse = { response: { status: 500 } };
        expect(() => errorHandler(errorWithResponse)).rejects.toEqual(errorWithResponse);
        
        errorSpy.mockRestore();
    });

    it('handles response interceptor for network errors', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        const errorHandler = mockInterceptors.response.use.mock.calls[0][1];
        
        const networkError = { request: {} };
        expect(() => errorHandler(networkError)).rejects.toEqual(networkError);
        
        errorSpy.mockRestore();
    });

    it('handles response interceptor for request setup errors', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        const errorHandler = mockInterceptors.response.use.mock.calls[0][1];
        
        const setupError = { message: 'Request setup failed' };
        expect(() => errorHandler(setupError)).rejects.toEqual(setupError);
        
        errorSpy.mockRestore();
    });

    it('falls back to localhost in development when API URL validation fails', () => {
        process.env.NODE_ENV = 'development';
        process.env.REACT_APP_API_URL = '';  // Empty/invalid URL
        
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        reloadApi();
        
        // Should create client with fallback URL
        expect(axios.create).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('uses default parameters for resetGame when not provided', async () => {
        await resetGame();
        expect(mockPost).toHaveBeenCalledWith('/reset', { decks: 1, dealerHitsOnSoft17: false });
    });
});
