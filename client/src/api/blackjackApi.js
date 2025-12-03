import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const startGame = async (decks = 1, dealerHitsOnSoft17 = false) => {
    return axios.get(`${API_BASE_URL}/start`, { params: { decks, dealerHitsOnSoft17 } });
};

export const hit = async () => {
    return axios.post(`${API_BASE_URL}/hit`);
};

export const stand = async () => {
    return axios.post(`${API_BASE_URL}/stand`);
};

export const placeBet = async (amount) => {
    return axios.post(`${API_BASE_URL}/bet`, { amount });
};