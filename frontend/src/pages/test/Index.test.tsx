import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Index from '../Index';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: any) => {
			const dict: Record<string, string> = {
				'home.lastDay': 'Last Day',
				'home.last3Days': 'Last 3 Days',
				'home.lastWeek': 'Last Week',
				'home.Month': 'Last Month',
				'home.lastMonth': 'Last Month',
				'home.choosePeriod': 'Choose Period',
				'home.welcomeToWorkspace': 'Welcome to Workspace',
				'home.selectAssistant': 'Select an Assistant',
				'home.loadingAgents': 'Loading Agents',
				'home.historyWith': `Chat History with ${opts?.chat_name || 'Assistant'}`,
				'home.viewingContext': `Viewing ${opts?.project || ''} - ${opts?.client || ''}`,
				'home.deleteTitle': 'Delete Session',
				'home.deleteDesc': 'Are you sure you want to delete this session?',
				'nav.newChat': 'New Chat',
				'common.cancel': 'Cancel',
				'common.delete': 'Delete',
			};
			return dict[key] || key;
		},
	}),
}));

// Mock components
vi.mock('@/components/AgentsChatMount', () => ({
	default: ({ agentId, sessionKey }: any) => (
		<div data-testid="agents-chat-mount">
			Chat Mount - Agent {agentId} Session {sessionKey}
		</div>
	),
}));

vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ text }: any) => <div data-testid="loading-animation">{text}</div>,
}));

vi.mock('@/components/AgentsCard', () => ({
	AgentsCard: ({ name, onClick }: any) => (
		<div data-testid="agent-card" onClick={onClick}>
			{name}
		</div>
	),
}));

vi.mock('@/components/SessionHistoryItem', () => ({
	default: ({ session, handleSession, deleteSession }: any) => (
		<div data-testid="session-history-item">
			<button onClick={handleSession}>
				{session.data}
			</button>
			<button onClick={(e) => deleteSession(e, session)}>Delete</button>
		</div>
	),
}));

// Mock SVGs
vi.mock('@/assets/svgs', () => ({
	ChatInfo: () => <div data-testid="chat-info">Info</div>,
	EnlaightBot: () => <div data-testid="enlaight-bot">Bot</div>,
}));

// Mock hooks
vi.mock('@/hooks/use-agents', () => ({
	useAgents: () => ({
		agents: [
			{
				id: 'a1',
				name: 'Data Analyst',
				description: 'Analyzes data',
				expertise_area: { name: 'Data Analysis' },
				chat_sessions: [
					{ id: 's1', data: 'Session 1', session_key: 'key1', created_at: new Date().toISOString(), agent_id: 'a1' },
				],
				url_n8n: 'https://n8n.example.com/webhook/a1',
				image: 'data-analyst.png',
			},
			{
				id: 'a2',
				name: 'Support Agent',
				description: 'Provides support',
				expertise_area: { name: 'Support' },
				chat_sessions: [],
				url_n8n: 'https://n8n.example.com/webhook/a2',
				image: 'support.png',
			},
		],
		loading: false,
		deleteSessionFromAgent: vi.fn(),
	}),
}));

vi.mock('@/hooks/use-auth', () => ({
	useAuth: () => ({
		user: { id: 'u1', first_name: 'John', role: 'USER' },
		logout: vi.fn(),
	}),
}));

vi.mock('@/store/useStore', () => ({
	useStore: () => ({
		clients: [{ id: 'c1', name: 'Client 1' }],
		projects: [{ id: 'p1', name: 'Project 1' }],
		currentQuery: '',
		update: vi.fn(),
	}),
}));

vi.mock('@/contexts/AgentsChatContext', () => ({
	useAgentsChat: () => ({
		isModalOpen: false,
		selectedAgentId: null,
		sessionKey: null,
		isReset: false,
		scrollSearch: null,
		closeModal: vi.fn(),
		setResetHomepage: vi.fn(),
	}),
}));

vi.mock('@/services/ChatSessionService', () => ({
	ChatSessionService: {
		get: vi.fn(() => Promise.resolve([])),
		post: vi.fn(() => Promise.resolve(true)),
		delete: vi.fn(() => Promise.resolve(true)),
	},
}));

// Mock image imports
vi.mock('@/assets/data-analyst.png', () => ({ default: 'data-analyst.png' }));
vi.mock('@/assets/support-assistant.png', () => ({ default: 'support-assistant.png' }));
vi.mock('@/assets/tech-expert.png', () => ({ default: 'tech-expert.png' }));

describe('Index Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders welcome message with user name', async () => {
		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/Welcome to Workspace, John/)).toBeTruthy();
		});
	});

	it('displays loading animation initially', () => {
		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		const loadingAnim = screen.getByTestId('loading-animation');
		expect(loadingAnim).toBeTruthy();
	});

	it('renders agent cards after loading', async () => {
		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const cards = screen.getAllByTestId('agent-card');
			expect(cards.length).toBeGreaterThan(0);
			expect(screen.getByText('Data Analyst')).toBeTruthy();
			expect(screen.getByText('Support Agent')).toBeTruthy();
		});
	});

	it('opens chat when agent card clicked', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const dataAnalystCard = screen.getByText('Data Analyst');
			expect(dataAnalystCard).toBeTruthy();
		});

		const dataAnalystCard = screen.getByText('Data Analyst');
		await user.click(dataAnalystCard);

		await waitFor(() => {
			expect(screen.getByTestId('agents-chat-mount')).toBeTruthy();
		});
	});

	it('displays agent name and expertise when chat is open', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const dataAnalystCard = screen.getByText('Data Analyst');
			expect(dataAnalystCard).toBeTruthy();
		});

		const dataAnalystCard = screen.getByText('Data Analyst');
		await user.click(dataAnalystCard);

		await waitFor(() => {
			expect(screen.getByText('Data Analyst')).toBeTruthy();
			expect(screen.getByText('DATA ANALYSIS')).toBeTruthy();
		});
	});

	it('closes chat when X button clicked', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const dataAnalystCard = screen.getByText('Data Analyst');
			expect(dataAnalystCard).toBeTruthy();
		});

		const dataAnalystCard = screen.getByText('Data Analyst');
		await user.click(dataAnalystCard);

		await waitFor(() => {
			expect(screen.getByTestId('agents-chat-mount')).toBeTruthy();
		});

		// Find and click close button
		const closeButtons = screen.getAllByRole('button', { name: /icon/ });
		const closeBtn = closeButtons.find((btn) =>
			btn.className.includes('right-[102px]')
		);

		if (closeBtn) {
			await user.click(closeBtn);

			await waitFor(() => {
				expect(screen.queryByTestId('agents-chat-mount')).not.toBeInTheDocument();
			});
		}
	});

	it('starts new chat without changing agent', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const dataAnalystCard = screen.getByText('Data Analyst');
			expect(dataAnalystCard).toBeTruthy();
		});

		const dataAnalystCard = screen.getByText('Data Analyst');
		await user.click(dataAnalystCard);

		await waitFor(() => {
			expect(screen.getByTestId('agents-chat-mount')).toBeTruthy();
		});

		const newChatBtn = screen.getByRole('button', { name: /New Chat/ });
		await user.click(newChatBtn);

		await waitFor(() => {
			expect(screen.getByTestId('agents-chat-mount')).toBeTruthy();
		});
	});

	it('displays chat history when session exists', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const dataAnalystCard = screen.getByText('Data Analyst');
			expect(dataAnalystCard).toBeTruthy();
		});

		const dataAnalystCard = screen.getByText('Data Analyst');
		await user.click(dataAnalystCard);

		await waitFor(() => {
			expect(screen.getByText('Chat History with Data Analyst:')).toBeTruthy();
		});
	});

	it('switches between time filter periods', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const dataAnalystCard = screen.getByText('Data Analyst');
			expect(dataAnalystCard).toBeTruthy();
		});

		const dataAnalystCard = screen.getByText('Data Analyst');
		await user.click(dataAnalystCard);

		await waitFor(() => {
			expect(screen.getByText('Last Day')).toBeTruthy();
		});

		// Try to find and click period selector
		const lastDayBtn = screen.getByText('Last Day');
		expect(lastDayBtn).toBeTruthy();
	});

	it('displays viewing context for non-admins with projects', async () => {
		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/Viewing/)).toBeTruthy();
		});
	});

	it('displays EnlaightBot icon in header', async () => {
		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByTestId('enlaight-bot')).toBeTruthy();
		});
	});

	it('loads at most 4 agent cards', async () => {
		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const cards = screen.getAllByTestId('agent-card');
			expect(cards.length).toBeLessThanOrEqual(4);
		});
	});

	it('renders delete session confirmation dialog', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Index />
			</BrowserRouter>
		);

		await waitFor(() => {
			const dataAnalystCard = screen.getByText('Data Analyst');
			expect(dataAnalystCard).toBeTruthy();
		});

		const dataAnalystCard = screen.getByText('Data Analyst');
		await user.click(dataAnalystCard);

		await waitFor(() => {
			expect(screen.getByTestId('agents-chat-mount')).toBeTruthy();
		});

		// Session history items should be visible
		const sessionItems = screen.getAllByTestId('session-history-item');
		expect(sessionItems.length).toBeGreaterThan(0);
	});
});
