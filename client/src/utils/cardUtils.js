export const calculateTotal = (hand) => {
    let total = 0;
    let aces = 0;

    hand.forEach(card => {
        if (card.value === 'A') {
            aces += 1;
            total += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            total += 10;
        } else {
            total += parseInt(card.value, 10);
        }
    });

    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }

    return total;
};

export const getCardImage = (value, suit) => {
    const fileName = `${value.toLowerCase()}_of_${suit.toLowerCase()}.png`;
    return `/card-images/${fileName}`;
};
