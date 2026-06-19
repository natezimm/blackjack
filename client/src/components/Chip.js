import React from 'react';
import '../styles/Chip.css';

const Chip = ({ amount, images, disabled, onClick }) => {
  const hasImages = images && typeof images === 'object';
  const fallbackSrc = hasImages ? images.png : images || '';

  return (
    <button
      type="button"
      className={`chip-img ${disabled ? 'disabled' : ''}`}
      onClick={() => onClick(amount)}
      disabled={disabled}
      aria-label={`Add $${amount} to wager`}
    >
      {hasImages ? (
        <picture>
          {images.smallAvif && (
            <source
              srcSet={images.smallAvif}
              type="image/avif"
              media="(max-width: 600px)"
            />
          )}
          {images.smallWebp && (
            <source
              srcSet={images.smallWebp}
              type="image/webp"
              media="(max-width: 600px)"
            />
          )}
          {images.smallPng && (
            <source
              srcSet={images.smallPng}
              type="image/png"
              media="(max-width: 600px)"
            />
          )}

          {images.avif && <source srcSet={images.avif} type="image/avif" />}
          {images.webp && <source srcSet={images.webp} type="image/webp" />}

          <img src={fallbackSrc} alt={`$${amount} chip`} />
        </picture>
      ) : (
        <img src={fallbackSrc} alt={`$${amount} chip`} />
      )}
    </button>
  );
};

export default Chip;
