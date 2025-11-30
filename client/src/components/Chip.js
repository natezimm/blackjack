import React from 'react';
import '../styles/Chip.css';

const Chip = ({ amount, image, disabled, onClick }) => {
    return (
        <div
            className={`chip-img ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onClick(amount)}
        >
            <img src={image} alt={`$${amount} chip`} />
        </div>
    );
};

export default Chip;