jest.mock('react-dom/client', () => ({
    createRoot: jest.fn(),
}));

jest.mock('./App', () => () => <div>App Component</div>);
jest.mock('./reportWebVitals', () => jest.fn());

describe('index', () => {
    const renderMock = jest.fn();
    let createRoot;

    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = '<div id="root"></div>';
        ({ createRoot } = require('react-dom/client'));
        createRoot.mockReturnValue({ render: renderMock });
        renderMock.mockClear();
        createRoot.mockClear();
    });

    it('renders the app into the root element', () => {
        require('./index');

        expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
        expect(renderMock).toHaveBeenCalled();
    });

    it('calls the performance reporting helper', () => {
        const reportWebVitals = require('./reportWebVitals');

        require('./index');

        expect(reportWebVitals).toHaveBeenCalled();
    });
});
