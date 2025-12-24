import { render, screen } from '@testing-library/react';
import PlayerHand from './PlayerHand';

describe('PlayerHand', () => {
    it('shows the player total and renders each card image', () => {
        const hand = [
            { value: 'A', suit: 'Spades' },
            { value: '9', suit: 'Hearts' },
        ];

        render(<PlayerHand hand={hand} />);

        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getAllByAltText(/of/)).toHaveLength(2);
        expect(screen.getByAltText('A of Spades')).toBeInTheDocument();
    });

    it('shows BUSTED badge when hand is busted', () => {
        const hand = {
            cards: [
                { value: '10', suit: 'Spades' },
                { value: '10', suit: 'Hearts' },
                { value: '5', suit: 'Diamonds' },
            ],
            isBusted: true,
        };

        render(<PlayerHand hand={hand} />);

        expect(screen.getByText('BUSTED')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
    });
});
