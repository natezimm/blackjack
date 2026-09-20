import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const create = vi.fn();
  return {
    default: {
      create,
    },
    create,
  };
});

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockInterceptors = {
  response: { use: vi.fn() },
  request: { use: vi.fn() },
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

  const reloadApi = async () => {
    vi.resetModules();
    const api = await import('./blackjackApi');
    startGame = api.startGame;
    hit = api.hit;
    stand = api.stand;
    placeBet = api.placeBet;
    doubleDown = api.doubleDown;
    split = api.split;
    resolveInsurance = api.resolveInsurance;
    getState = api.getState;
    resetGame = api.resetGame;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGet.mockReset();
    mockPost.mockReset();
    mockInterceptors.response.use.mockReset();
    mockInterceptors.request.use.mockReset();
    axios.create.mockReturnValue({
      get: mockGet,
      post: mockPost,
      interceptors: mockInterceptors,
    });
    process.env.REACT_APP_API_URL = 'https://example.com';
    await reloadApi();
  });

  it('configures the axios client with the API base url', () => {
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://example.com',
        withCredentials: true,
      })
    );
  });

  it('requests game start with deck options', async () => {
    await startGame(2, true);
    expect(mockGet).toHaveBeenCalledWith('/start', {
      params: { decks: 2, dealerHitsOnSoft17: true },
    });
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
    expect(mockPost).toHaveBeenCalledWith('/reset', {
      decks: 6,
      dealerHitsOnSoft17: true,
    });
  });

  it('uses default parameters for startGame when not provided', async () => {
    await startGame();
    expect(mockGet).toHaveBeenCalledWith('/start', {
      params: { decks: 1, dealerHitsOnSoft17: false },
    });
  });

  it('handles response interceptor for successful responses', () => {
    expect(mockInterceptors.response.use).toHaveBeenCalled();

    const successHandler = mockInterceptors.response.use.mock.calls[0][0];
    const testResponse = { data: 'test' };
    expect(successHandler(testResponse)).toBe(testResponse);
  });

  it('handles response interceptor for errors with response', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();
    const errorHandler = mockInterceptors.response.use.mock.calls[0][1];

    const errorWithResponse = { response: { status: 500 } };
    await expect(() => errorHandler(errorWithResponse)).rejects.toEqual(
      errorWithResponse
    );

    errorSpy.mockRestore();
  });

  it('handles response interceptor for network errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();
    const errorHandler = mockInterceptors.response.use.mock.calls[0][1];

    const networkError = { request: {} };
    await expect(() => errorHandler(networkError)).rejects.toEqual(
      networkError
    );

    errorSpy.mockRestore();
  });

  it('handles response interceptor for request setup errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();
    const errorHandler = mockInterceptors.response.use.mock.calls[0][1];

    const setupError = { message: 'Request setup failed' };
    await expect(() => errorHandler(setupError)).rejects.toEqual(setupError);

    errorSpy.mockRestore();
  });

  it('falls back to localhost in development when API URL validation fails', async () => {
    process.env.NODE_ENV = 'development';
    process.env.REACT_APP_API_URL = '';

    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await reloadApi();

    expect(axios.create).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('uses default parameters for resetGame when not provided', async () => {
    await resetGame();
    expect(mockPost).toHaveBeenCalledWith('/reset', {
      decks: 1,
      dealerHitsOnSoft17: false,
    });
  });
});
