import React from 'react';
import '../styles/DealerChipTray.css';

const CHIP_SLOTS = [
  { id: 'blue', label: '10' },
  { id: 'red', label: '5' },
  { id: 'green', label: '25' },
  { id: 'black', label: '100' },
  { id: 'purple', label: '500' },
];

const DealerChipTray = () => {
  return (
    <div
      className="table-chip-tray"
      aria-hidden="true"
      data-testid="table-chip-tray"
    >
      <div className="chip-tray-frame">
        <div className="chip-tray-row">
          {CHIP_SLOTS.map((slot) => (
            <div key={slot.id} className={`tray-slot slot-${slot.id}`}>
              <div className="tray-stack" />
              <span className="slot-cap">{slot.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DealerChipTray);
