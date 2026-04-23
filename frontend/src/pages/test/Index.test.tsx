import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Index from '../Index';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: any) => {
			const dict: Record<string, string> = {
				'home.welcomeToWorkspace': 'Welcome to Workspace',
				'home.selectAssistant': 'Select an Assistant',
				'home.lastDay': 'Last Day',
				'home.historyWith': `Chat History with ${opts?.chat_name || 'Assistant'}`,
				'home.viewingContext': `Viewing ${opts?.project || ''} - ${opts?.client || ''}`,
				'nav.newChat': 'New Chat',
			};
			return dict[key] || key;
		},
	}),
}));

vi.mock('@/components/AgentsChatMount', () => ({
	default: ({ agentId, sessionKey }: any) => (
		<div data-testid="agents-chat-mount">Chat Mount - Agent {agentId} Session {sessionKey}</div>
	),
}));

vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ text }: any) => <div data-testid="loading-animation">{text}</div>,
}));

vi.mock('@/components/AgentsCard', () => ({
	AgentsCard: ({ name, onClick }: any) => (
		<div data-testid="agent-card" onClick={onClick}>{name}</div>
	),
}));

vi.mock('@/components/SessionHistoryItem', () => ({
	default: ({ session, handleSession, deleteSession }: any) => (
		<div data-testid="session-history-item">
			<button onClick={handleSession}>{session.data}</button>
			<button onClick={(e) => deleteSession(e, session)}>Delete</button>
		</div>
	),
}));

vi.mock('@/assets/svgs', () => ({
	ChatInfo: () => <div>Info</div>,
	EnlaightBot: () => <div data-testid="enlaight-bot">Bot</div>,
}));

vi.mock('@/hooks/use-agents', () => ({
	useAgents: () => ({
		agents: [
			{ id: 'a1', name: 'Data Analyst', description: 'Analyzes data', expertise_area: { name: 'Data Analysis' }, chat_sessions: [{ id: 's1', data: 'Session 1', session_key: 'key1', created_at: new Date().toISOString(), agent_id: 'a1' }], url_n8n: 'https://n8n.example.com/webhook/a1', image: 'data-analyst.png' },
			{ id: 'a2', name: 'Support Agent', description: 'Provides support', expertise_area: { name: 'Support' }, chat_sessions: [], url_n8n: 'https://n8n.example.com/webhook/a2', image: 'support.png' },
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

vi.mock('@/assets/data-analyst.png', () => ({ default: 'data-analyst.png' }));
vi.mock('@/assets/support-assistant.png', () => ({ default: 'support-assistant.png' }));
vi.mock('@/assets/tech-expert.png', () => ({ default: 'tech-expert.png' }));

describe('Index Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders welcome message with user name', async () => {
		render(<BrowserRouter><Index /></BrowserRouter>);
		expect(await screen.findByText(/Welcome to Workspace, John/)).toBeTruthy();
	});

	it('renders agent cards with names', async () => {
		render(<BrowserRouter><Index /></BrowserRouter>);
		await screen.findByText('Data Analyst');
		expect(screen.getByText('Support Agent')).toBeTruthy();
		const cards = screen.getAllByTestId('agent-card');
		expect(cards.length).toBeGreaterThan(0);
		expect(cards.length).toBeLessThanOrEqual(4);
	});

	it('opens chat mount when agent card is clicked', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><Index /></BrowserRouter>);
		await user.click(await screen.findByText('Data Analyst'));
		expect(await screen.findByTestId('agents-chat-mount')).toBeTruthy();
	});

	it('displays chat history when chat is open', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><Index /></BrowserRouter>);
		await user.click(await screen.findByText('Data Analyst'));
		await screen.findByTestId('agents-chat-mount');
		expect(screen.getByText('Chat History with Data Analyst:')).toBeTruthy();
		expect(screen.getAllByTestId('session-history-item').length).toBeGreaterThan(0);
	});

	it('closes chat when close button clicked', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><Index /></BrowserRouter>);
		await user.click(await screen.findByText('Data Analyst'));
		await screen.findByTestId('agents-chat-mount');
		const closeBtn = screen.getAllByRole('button').find(btn => btn.className.includes('right-[102px]'));
		if (!closeBtn) throw new Error('close button not found');
		await user.click(closeBtn);
		await waitFor(() => {
			expect(screen.queryByTestId('agents-chat-mount')).not.toBeInTheDocument();
		});
	});

	it('displays viewing context for non-admin users with projects', async () => {
		render(<BrowserRouter><Index /></BrowserRouter>);
		expect(await screen.findByText(/Viewing/)).toBeTruthy();
	});
});