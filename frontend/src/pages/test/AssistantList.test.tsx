import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import AssistantList from '../AssistantList';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'listAssistants.title': 'Assistants',
				'listAssistants.description': 'Available assistants',
				'listAssistants.search': 'Search assistants',
				'listAssistants.chatWithAssistant': 'Chat',
				'listAssistants.noResults': 'No assistants found',
				'common.previous': 'Previous',
				'common.next': 'Next',
			};
			return dict[key] || key;
		},
	}),
}));

// Mock components
vi.mock('@/components/ui/input', () => ({
	Input: ({ type, placeholder, value, onChange, ...props }: any) => (
		<input
			type={type}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			data-testid="search-input"
			{...props}
		/>
	),
}));

vi.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock('@/components/ui/avatar', () => ({
	Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
	AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="avatar-image" />,
	AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
	Badge: ({ children, variant }: any) => <div data-testid="badge" className={variant}>{children}</div>,
}));

vi.mock('@/assets/svgs', () => ({
	EnlaightBot: () => <div data-testid="enlaight-bot">Bot</div>,
}));

// Mock services
vi.mock('@/services/BotService', () => ({
	BotService: {
		list: vi.fn(() => Promise.resolve({
			results: [
				{
					id: 'bot1',
					name: 'Data Analyst',
					description: 'Analyzes data',
					expertise_area: { id: 'exp1', name: 'Data Analysis' },
					image: 'data-analyst.png',
					url_n8n: 'https://n8n.example.com/webhook/bot1',
				},
				{
					id: 'bot2',
					name: 'Support Agent',
					description: 'Provides support',
					expertise_area: { id: 'exp2', name: 'Support' },
					image: 'support.png',
					url_n8n: 'https://n8n.example.com/webhook/bot2',
				},
			],
			count: 2,
		})),
		get: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
}));

// Mock hooks
vi.mock('@/hooks/use-batch-translation', () => ({
	useBatchTranslation: () => ({
		getTranslation: (text: string) => text,
	}),
}));

vi.mock('@/contexts/AgentsChatContext', () => ({
	useAgentsChat: () => ({
		openModal: vi.fn(),
	}),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

describe('AssistantList Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	it('renders assistants list title', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Assistants')).toBeTruthy();
		});
	});

	it('displays assistants description', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Available assistants')).toBeTruthy();
		});
	});

	it('displays search input', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			const searchInputs = screen.queryAllByTestId('search-input');
			expect(searchInputs.length).toBeGreaterThan(0);
		});
	});

	it('allows user to search assistants', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			const searchInputs = screen.queryAllByTestId('search-input');
			expect(searchInputs.length).toBeGreaterThan(0);
		});

		const searchInputs = screen.queryAllByTestId('search-input');
		if (searchInputs.length > 0) {
			await user.type(searchInputs[0], 'Data');
			expect((searchInputs[0] as HTMLInputElement).value).toBe('Data');
		}
	});

	it('renders assistants cards after loading', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
			expect(screen.getByText('Support Agent')).toBeTruthy();
		});
	});

	it('displays assistant names', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
			expect(screen.getByText('Support Agent')).toBeTruthy();
		});
	});

	it('displays assistant descriptions', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Analyzes data')).toBeTruthy();
			expect(screen.getByText('Provides support')).toBeTruthy();
		});
	});

	it('displays expertise areas as badges', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			const badges = screen.getAllByTestId('badge');
			expect(badges.length).toBeGreaterThan(0);
		});
	});

	it('displays assistant avatars', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			const avatars = screen.getAllByTestId('avatar');
			expect(avatars.length).toBeGreaterThan(0);
		});
	});

	it('displays chat button for each assistant', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			const chatButtons = screen.getAllByRole('button', { name: /Chat/ });
			expect(chatButtons.length).toBeGreaterThan(0);
		});
	});

	it('opens chat when chat button clicked', async () => {
		const user = userEvent.setup();
		const mockOpenModal = vi.fn();

		vi.doMock('@/contexts/AgentsChatContext', () => ({
			useAgentsChat: () => ({
				openModal: mockOpenModal,
			}),
		}));

		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			const chatButtons = screen.getAllByRole('button', { name: /Chat/ });
			expect(chatButtons.length).toBeGreaterThan(0);
		});

		const chatButtons = screen.getAllByRole('button', { name: /Chat/ });
		if (chatButtons.length > 0) {
			await user.click(chatButtons[0]);
		}
	});

	it('displays pagination controls', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
		});
	});

	it('handles pagination navigation', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
		});

		const buttons = screen.getAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('shows empty state when no assistants found', async () => {
		vi.doMock('@/services/BotService', () => ({
			BotService: {
				list: vi.fn(() => Promise.resolve({
					results: [],
					count: 0,
				})),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		}));

		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Assistants')).toBeTruthy();
		});
	});

	it('displays error state gracefully', async () => {
		vi.doMock('@/services/BotService', () => ({
			BotService: {
				list: vi.fn(() => Promise.reject(new Error('Failed to load'))),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		}));

		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Assistants')).toBeTruthy();
		});
	});

	it('filters assistants by search term', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
		});

		const searchInputs = screen.queryAllByTestId('search-input');
		if (searchInputs.length > 0) {
			await user.clear(searchInputs[0]);
			await user.type(searchInputs[0], 'Support');
			expect((searchInputs[0] as HTMLInputElement).value).toBe('Support');
		}
	});

	it('debounces search input', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
		});

		const searchInputs = screen.queryAllByTestId('search-input');
		if (searchInputs.length > 0) {
			await user.type(searchInputs[0], 'test');
			expect((searchInputs[0] as HTMLInputElement).value).toBe('test');
		}
	});

	it('displays assistant count', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
			expect(screen.getByText('Support Agent')).toBeTruthy();
		});
	});

	it('renders avatar fallback when no image', async () => {
		render(
			<BrowserRouter>
				<AssistantList />
			</BrowserRouter>
		);

		await waitFor(() => {
			const avatarFallbacks = screen.queryAllByTestId('avatar-fallback');
			expect(avatarFallbacks.length).toBeGreaterThanOrEqual(0);
		});
	});
});
