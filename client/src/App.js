import React from 'react';
import './App.css';
import BlackjackGame from './components/BlackjackGame';

const App = () => {
    return (
        <>
            <a className="skip-link" href="#main-content">
                Skip to main content
            </a>
            <main id="main-content" tabIndex={-1}>
                <BlackjackGame />
            </main>
        </>
    );
};

export default App;