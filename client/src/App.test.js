import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/BlackjackGame', () => () => <div>Blackjack Game Component</div>);

test('renders the blackjack game container', () => {
    render(<App />);
    expect(screen.getByText('Blackjack Game Component')).toBeInTheDocument();
});
