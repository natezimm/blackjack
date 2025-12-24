import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/BlackjackGame', () => () => <div>Blackjack Game Component</div>);

test('renders the blackjack game container', () => {
    render(<App />);
    expect(screen.getByText('Blackjack Game Component')).toBeInTheDocument();
});

test('includes a main landmark and skip link', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
});
