import { render, screen } from '@testing-library/react';
import DealerChipTray from './DealerChipTray';

describe('DealerChipTray', () => {
  it('renders dealer chip tray with all chip denomination slots', () => {
    render(<DealerChipTray />);
    const tray = screen.getByTestId('table-chip-tray');
    expect(tray).toBeInTheDocument();
    expect(tray).toHaveAttribute('aria-hidden', 'true');

    const slots = tray.querySelectorAll('.tray-slot');
    expect(slots).toHaveLength(5);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
