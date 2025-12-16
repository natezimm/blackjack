import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export const startGame = async (decks = 1, dealerHitsOnSoft17 = false) => {
    return apiClient.get('/start', { params: { decks, dealerHitsOnSoft17 } });
};

export const hit = async () => {
    return apiClient.post('/hit');
};

export const stand = async () => {
    return apiClient.post('/stand');
};

export const placeBet = async (amount) => {
    return apiClient.post('/bet', { amount });
};

export const doubleDown = async () => {
    return apiClient.post('/doubledown');
};

export const split = async () => {
    return apiClient.post('/split');
};

export const getState = async () => {
    return apiClient.get('/state');
};

export const resetGame = async (decks = 1, dealerHitsOnSoft17 = false) => {
    return apiClient.post('/reset', { decks, dealerHitsOnSoft17 });
};
