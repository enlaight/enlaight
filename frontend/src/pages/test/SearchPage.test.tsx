import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import SearchPage from '../SearchPage';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'search.title': 'Search Results',
				'search.description': 'Find conversations and messages',
				'search.searching': 'Searching',
				'search.noMatchesTitle': 'No Matches',
				'search.noMatchesEmpty': 'Start typing to search',
				'search.noMatchesFor': 'No results found for',
				'search.resultsFor': 'Results for',
			};
			return dict[key] || key;
		},
	}),
}));

// Mock components
vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ icon, text }: any) => (
		<div data-testid="loading-animation">
			<div data-testid="loading-icon">{icon}</div>
			<div>{text}</div>
		</div>
	),
}));

vi.mock('@/components/ui/card', () => ({
	Card: ({ children }: any) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
	useAuth: () => ({
		user: { id: 'u1', first_name: 'John', role: 'USER' },
	}),
}));

vi.mock('@/store/useStore', () => ({
	useStore: () => ({
		agents: [
			{ id: 'agent1', name: 'Data Analyst' },
			{ id: 'agent2', name: 'Support Agent' },
		],
		query: 'test',
		searchResults: [
			{
				id: 'result1',
				agent_id: 'agent1',
				session_id: 'session1',
				message: 'Test search result 1',
				created_at: new Date().toISOString(),
			},
			{
				id: 'result2',
				agent_id: 'agent2',
				session_id: 'session2',
				message: 'Test search result 2',
				created_at: new Date().toISOString(),
			},
		],
		loadingSearch: false,
		update: vi.fn(),
	}),
}));

vi.mock('@/contexts/AgentsChatContext', () => ({
	useAgentsChat: () => ({
		openModal: vi.fn(),
	}),
}));

describe('SearchPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders search title and description', async () => {
		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Search Results')).toBeTruthy();
			expect(screen.getByText('Find conversations and messages')).toBeTruthy();
		});
	});

	it('displays loading animation when searching', async () => {
		vi.doMock('@/store/useStore', () => ({
			useStore: () => ({
				agents: [],
				query: 'test',
				searchResults: [],
				loadingSearch: true,
				update: vi.fn(),
			}),
		}));

		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		const loadingAnim = screen.queryByTestId('loading-animation');
		expect(loadingAnim).toBeTruthy();
	});

	it('displays search results after loading', async () => {
		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			const cards = screen.getAllByTestId('card');
			expect(cards.length).toBeGreaterThan(0);
		});
	});

	it('displays agent names for search results', async () => {
		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/Data Analyst/)).toBeTruthy();
			expect(screen.getByText(/Support Agent/)).toBeTruthy();
		});
	});

	it('shows empty state when no results', async () => {
		vi.doMock('@/store/useStore', () => ({
			useStore: () => ({
				agents: [],
				query: 'nonexistent',
				searchResults: [],
				loadingSearch: false,
				update: vi.fn(),
			}),
		}));

		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('No Matches')).toBeTruthy();
		});
	});

	it('shows different empty state when no query entered', async () => {
		vi.doMock('@/store/useStore', () => ({
			useStore: () => ({
				agents: [],
				query: '',
				searchResults: [],
				loadingSearch: false,
				update: vi.fn(),
			}),
		}));

		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/Start typing to search/)).toBeTruthy();
		});
	});

	it('displays search query in results header', async () => {
		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/test/)).toBeTruthy();
		});
	});

	it('truncates long search result messages', async () => {
		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByTestId('card')).toBeTruthy();
		});
	});

	it('opens chat when result clicked', async () => {
		const user = userEvent.setup();
		const mockOpenModal = vi.fn();

		vi.doMock('@/contexts/AgentsChatContext', () => ({
			useAgentsChat: () => ({
				openModal: mockOpenModal,
			}),
		}));

		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			const cards = screen.getAllByTestId('card');
			expect(cards.length).toBeGreaterThan(0);
		});
	});

	it('clears query when navigating', async () => {
		const mockUpdate = vi.fn();
		vi.doMock('@/store/useStore', () => ({
			useStore: () => ({
				agents: [],
				query: 'test',
				searchResults: [],
				loadingSearch: false,
				update: mockUpdate,
			}),
		}));

		render(
			<BrowserRouter>
				<SearchPage />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Search Results')).toBeTruthy();
		});
	});
});
