import { describe, it, expect, beforeEach, vi } from 'vitest';

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock('react-dom/client', () => ({
  default: { createRoot: createRootMock },
  createRoot: createRootMock,
}));

vi.mock('./App', () => ({
  default: () => <div>App Component</div>,
}));

const reportWebVitalsMock = vi.fn();
vi.mock('./reportWebVitals', () => ({
  default: reportWebVitalsMock,
}));

describe('index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('renders the app into the root element and calls reportWebVitals', async () => {
    await import('./index');

    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById('root')
    );
    expect(renderMock).toHaveBeenCalled();
    expect(reportWebVitalsMock).toHaveBeenCalled();
  });
});
