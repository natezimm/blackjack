import { MESSAGES } from '../constants/messages';

export const processDoubleDownOutcome = ({
    data,
    doubledBet,
    balance,
    updateBalanceAndStats,
    updateStatsWithOutcome,
    setMessage,
}) => {
    if (data.playerWins) {
        setMessage(MESSAGES.win);
        const nextBalance = data.balance ?? balance + doubledBet * 2;
        updateBalanceAndStats(nextBalance);
        updateStatsWithOutcome('win', doubledBet, data.balance ?? balance + doubledBet * 2);
    } else if (data.tie) {
        setMessage(MESSAGES.tie);
        updateBalanceAndStats(data.balance ?? balance);
        updateStatsWithOutcome('tie', 0, data.balance ?? balance);
    } else {
        setMessage(MESSAGES.dealerWin);
        updateBalanceAndStats(data.balance ?? balance);
        updateStatsWithOutcome('loss', 0, data.balance ?? balance);
    }
};
