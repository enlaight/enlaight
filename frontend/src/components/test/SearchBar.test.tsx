import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => false,
}));

vi.mock('@/contexts/SearchContext', () => ({
	useSearch: () => ({ onSearchFocusRequest: vi.fn() }),
}));

const store: { currentQuery: string } = { currentQuery: '' };
const updateMock = vi.fn((key: string, value: any) => {
	if (key === 'currentQuery') store.currentQuery = value;
});
vi.mock('@/store/useStore', () => ({
	useStore: () => ({
		get currentQuery() { return store.currentQuery; },
		update: updateMock,
	}),
}));

vi.mock('@/services/SearchService', () => ({
	SearchService: {
		post: vi.fn(() => Promise.resolve({ results: [] })),
	},
}));

vi.mock('lucide-react', () => ({
	SendHorizontal: () => <div data-testid="send-icon">Send</div>,
	X: () => <div data-testid="close-icon">Close</div>,
}));

describe('SearchBar', () => {
	beforeEach(() => {
		store.currentQuery = '';
		vi.clearAllMocks();
	});

	it('renders search bar input', () => {
		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);
		expect(screen.getByRole('textbox')).toBeTruthy();
	});

	it('renders send button', () => {
		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);
		expect(screen.getByTestId('send-icon')).toBeTruthy();
	});

	it('calls update on input change', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);
		const input = screen.getByRole('textbox') as HTMLInputElement;
		await user.type(input, 'abc');
		expect(updateMock).toHaveBeenCalledWith('currentQuery', expect.any(String));
	});

	it('renders clear button when query is not empty', () => {
		store.currentQuery = 'hello';
		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);
		expect(screen.getByTestId('close-icon')).toBeTruthy();
	});
});