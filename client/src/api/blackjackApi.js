import axios from 'axios';
import { validateApiUrl } from '../utils/securityUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Validate API URL on initialization
let validatedUrl;
try {
    validatedUrl = validateApiUrl(API_BASE_URL);
} catch (error) {
    console.error('API Configuration Error:', error.message);
    // In development, allow fallback to show helpful error
    if (process.env.NODE_ENV === 'development') {
        validatedUrl = API_BASE_URL || 'http://localhost:8080/api/blackjack';
    } else {
        throw error;
    }
}

const apiClient = axios.create({
    baseURL: validatedUrl,
    withCredentials: true,
    timeout: 10000, // 10 second timeout for security
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log errors but don't expose sensitive details
        if (error.response) {
            console.error('API Error:', error.response.status);
        } else if (error.request) {
            console.error('Network Error: No response received');
        } else {
            console.error('Request Error:', error.message);
        }
        return Promise.reject(error);
    }
);

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

export const resolveInsurance = async (amount) => {
    return apiClient.post('/insurance', { amount });
};

export const getState = async () => {
    return apiClient.get('/state');
};

export const resetGame = async (decks = 1, dealerHitsOnSoft17 = false) => {
    return apiClient.post('/reset', { decks, dealerHitsOnSoft17 });
};
