import { render, screen } from '@testing-library/react';
import CardShoe from './CardShoe';

describe('CardShoe', () => {
  it('renders with default red card back', () => {
    render(<CardShoe />);
    const shoe = screen.getByTestId('table-card-shoe');
    expect(shoe).toBeInTheDocument();
    expect(shoe).toHaveAttribute('aria-hidden', 'true');

    const topCard = shoe.querySelector('.shoe-accent-top-card');
    expect(topCard).toHaveAttribute('src', '/card-images/card_back_red.png');
  });

  it('renders with customized card back color and dealing pulse', () => {
    render(<CardShoe cardBackColor="blue" isDealing={true} />);
    const shoe = screen.getByTestId('table-card-shoe');
    expect(shoe).toHaveClass('is-dealing');

    const topCard = shoe.querySelector('.shoe-accent-top-card');
    expect(topCard).toHaveAttribute('src', '/card-images/card_back_blue.png');
  });
});
