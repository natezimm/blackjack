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
});
