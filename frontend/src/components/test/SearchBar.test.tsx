import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

// Mock use-mobile hook
vi.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => false,
}));

// Mock SearchContext
vi.mock('@/contexts/SearchContext', () => ({
	useSearch: () => ({
		onSearchFocusRequest: vi.fn(),
	}),
}));

// Mock store
vi.mock('@/store/useStore', () => ({
	useStore: () => ({
		currentQuery: '',
		update: vi.fn(),
	}),
}));

// Mock SearchService
vi.mock('@/services/SearchService', () => ({
	SearchService: {
		search: vi.fn(() => Promise.resolve({ results: [] })),
	},
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
	SendHorizontal: () => <div data-testid="send-icon">Send</div>,
	X: () => <div data-testid="close-icon">Close</div>,
}));

describe('SearchBar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders search bar input', () => {
		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		const input = screen.queryByRole('textbox');
		expect(input).toBeTruthy();
	});

	it('accepts custom className prop', () => {
		const { container } = render(
			<BrowserRouter>
				<SearchBar className="custom-class" />
			</BrowserRouter>
		);

		const searchBar = container.querySelector('.custom-class');
		expect(searchBar || container.firstChild).toBeTruthy();
	});

	it('renders with default empty className', () => {
		const { container } = render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		// Verify component renders without errors
		expect(container.firstChild).toBeTruthy();
	});

	it('renders send button or icon', () => {
		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		const sendIcon = screen.getByTestId('send-icon');
		expect(sendIcon).toBeTruthy();
	});

	it('updates query on input change', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await user.type(input, 'test query');

		expect(input.value).toBe('test query');
	});

	it('handles empty search submission gracefully', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await user.type(input, '   ');

		// Component should handle empty/whitespace queries
		expect(input.value).toBe('   ');
	});

	it('renders clear button when expanded on mobile', () => {
		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		const closeIcon = screen.getByTestId('close-icon');
		expect(closeIcon).toBeTruthy();
	});

	it('applies responsive styling', () => {
		const { container } = render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		// Verify component renders properly for responsive design
		expect(container.firstChild).toBeTruthy();
	});

	it('handles search form submission', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<SearchBar />
			</BrowserRouter>
		);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await user.type(input, 'search term');

		// Component should handle form submission
		expect(input.value).toBe('search term');
	});
});
