import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chip from './Chip';

describe('Chip', () => {
    it('invokes onClick with the chip amount when enabled', async () => {
        const handleClick = jest.fn();

        render(<Chip amount={25} image="/chip.png" disabled={false} onClick={handleClick} />);

        await userEvent.click(screen.getByAltText('$25 chip'));

        expect(handleClick).toHaveBeenCalledWith(25);
    });

    it('prevents clicks when disabled', async () => {
        const handleClick = jest.fn();

        render(<Chip amount={10} image="/chip.png" disabled={true} onClick={handleClick} />);

        await userEvent.click(screen.getByAltText('$10 chip'));

        expect(handleClick).not.toHaveBeenCalled();
    });
});
