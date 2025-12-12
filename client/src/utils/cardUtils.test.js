import { calculateTotal, getCardImage } from './cardUtils';

describe('calculateTotal', () => {
    it('counts face cards as 10 and aces as 11 when safe', () => {
        const hand = [
            { value: 'A', suit: 'Spades' },
            { value: 'K', suit: 'Hearts' },
        ];

        expect(calculateTotal(hand)).toBe(21);
    });

    it('downgrades aces from 11 to 1 to avoid busting', () => {
        const hand = [
            { value: 'A', suit: 'Spades' },
            { value: '9', suit: 'Hearts' },
            { value: '5', suit: 'Clubs' },
        ];

        expect(calculateTotal(hand)).toBe(15);
    });
});

describe('getCardImage', () => {
    it('builds a lowercase asset path for the card', () => {
        expect(getCardImage('K', 'Hearts')).toBe('/card-images/k_of_hearts.png');
    });
});
