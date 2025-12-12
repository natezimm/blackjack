import { render, screen } from '@testing-library/react';
import DealerHand from './DealerHand';

describe('DealerHand', () => {
    const sampleHand = [
        { value: 'A', suit: 'Spades' },
        { value: '9', suit: 'Diamonds' },
    ];

    it('hides the dealer total and first card when not revealed', () => {
        render(<DealerHand hand={sampleHand} reveal={false} cardBackColor="blue" />);

        expect(screen.getByText('Dealer')).toBeInTheDocument();
        expect(screen.getByText('?')).toBeInTheDocument();
        expect(screen.getByAltText('Card Back')).toBeInTheDocument();
    });

    it('shows the dealer total when revealed', () => {
        render(<DealerHand hand={sampleHand} reveal={true} />);

        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByAltText('A of Spades')).toBeInTheDocument();
    });
});
