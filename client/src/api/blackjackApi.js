import axios from 'axios';

const API_BASE_URL = "https://blackjack-zyb0.onrender.com/api/blackjack";
export const startGame = async () => {
    return axios.get(`${API_BASE_URL}/start`);
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