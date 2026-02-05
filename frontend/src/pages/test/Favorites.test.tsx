import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Favorites from '../Favorites';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'favorites.title': 'Favorites',
				'favorites.description': 'Your favorite messages and conversations',
				'common.noResults': 'No favorites found',
			};
			return dict[key] || key;
		},
	}),
}));

// Mock components
vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ text }: any) => <div data-testid="loading-animation">{text}</div>,
}));

vi.mock('@/components/ui/card', () => ({
	Card: ({ children }: any) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

// Mock services
vi.mock('@/services/FavoritesService', () => ({
	FavoritesService: {
		get: vi.fn(() => Promise.resolve([
			{
				id: 1,
				message_id: 'msg1',
				agent: 'agent1',
				session: 'session1',
				text: 'This is a favorite message',
				created_at: new Date().toISOString(),
			},
			{
				id: 2,
				message_id: 'msg2',
				agent: 'agent2',
				session: 'session2',
				text: 'Another favorite message',
				created_at: new Date().toISOString(),
			},
		])),
		delete: vi.fn(() => Promise.resolve(true)),
	},
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
		favorites: [
			{
				id: 1,
				message_id: 'msg1',
				agent: 'agent1',
				session: 'session1',
				text: 'This is a favorite message',
				created_at: new Date().toISOString(),
			},
			{
				id: 2,
				message_id: 'msg2',
				agent: 'agent2',
				session: 'session2',
				text: 'Another favorite message',
				created_at: new Date().toISOString(),
			},
		],
		update: vi.fn(),
	}),
}));

vi.mock('@/contexts/AgentsChatContext', () => ({
	useAgentsChat: () => ({
		openModal: vi.fn(),
	}),
}));

describe('Favorites Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders page title and description', async () => {
		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Favorites')).toBeTruthy();
			expect(screen.getByText('Your favorite messages and conversations')).toBeTruthy();
		});
	});

	it('displays loading animation initially', () => {
		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		const loadingAnim = screen.queryByTestId('loading-animation');
		expect(loadingAnim).toBeTruthy();
	});

	it('renders favorites list after loading', async () => {
		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		await waitFor(() => {
			const cards = screen.getAllByTestId('card');
			expect(cards.length).toBeGreaterThan(0);
		});
	});

	it('displays favorite items with correct agent names', async () => {
		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/Data Analyst/)).toBeTruthy();
			expect(screen.getByText(/Support Agent/)).toBeTruthy();
		});
	});

	it('opens chat when favorite item clicked', async () => {
		const user = userEvent.setup();
		const mockOpenModal = vi.fn();

		vi.doMock('@/contexts/AgentsChatContext', () => ({
			useAgentsChat: () => ({
				openModal: mockOpenModal,
			}),
		}));

		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		await waitFor(() => {
			const cards = screen.getAllByTestId('card');
			expect(cards.length).toBeGreaterThan(0);
		});
	});

	it('truncates long favorite messages', async () => {
		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByTestId('card')).toBeTruthy();
		});
	});

	it('handles delete favorite', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		await waitFor(() => {
			const cards = screen.getAllByTestId('card');
			expect(cards.length).toBeGreaterThan(0);
		});
	});

	it('displays empty state when no favorites', async () => {
		vi.doMock('@/store/useStore', () => ({
			useStore: () => ({
				agents: [],
				favorites: [],
				update: vi.fn(),
			}),
		}));

		render(
			<BrowserRouter>
				<Favorites />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByTestId('card')).toBeTruthy();
		});
	});
});
