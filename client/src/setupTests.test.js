import './setupTests';

test('exposes jest-dom matchers', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    expect(div).toBeInTheDocument();
});
