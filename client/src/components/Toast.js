import React, { useEffect, useState } from 'react';
import '../styles/Toast.css';

const Toast = ({ message, duration = 3000, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(() => {
            setIsClosing(true);
        }, duration);

        return () => clearTimeout(timer);
    }, [message, duration]);

    useEffect(() => {
        if (isClosing) {
            const timer = setTimeout(() => {
                onClose();
                setIsClosing(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isClosing, onClose]);

    if (!message) return null;

    return (
        <div className="toast-container">
            <div className={`toast ${isClosing ? 'toast-closing' : ''}`}>
                {message}
            </div>
        </div>
    );
};

export default Toast;
