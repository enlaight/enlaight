import { render, screen } from '@testing-library/react';
import { NavigationMenu } from '../navigation/NavigationMenu';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/use-auth', () => ({
	useAuth: () => ({
		logout: vi.fn(() => Promise.resolve()),
		user: { role: 'ADMINISTRATOR' },
	}),
}));

vi.mock('@/hooks/use-agents', () => ({
	useAgents: () => ({
		agents: [
			{ id: '1', name: 'Agent 1' },
			{ id: '2', name: 'Agent 2' },
		],
		deleteSessionFromAgent: vi.fn(),
	}),
}));

vi.mock('@/contexts/AgentsChatContext', () => ({
	useAgentsChat: () => ({
		openModal: vi.fn(),
		resetHomepage: vi.fn(),
	}),
}));

vi.mock('@/contexts/SearchContext', () => ({
	useSearch: () => ({ triggerSearchFocus: vi.fn() }),
}));

vi.mock('@/store/useStore', () => ({
	useStore: () => ({ update: vi.fn() }),
}));

vi.mock('@/services/ChatSessionService', () => ({
	ChatSessionService: {
		get: vi.fn(() => Promise.resolve([])),
	},
}));

vi.mock('../navigation/MenuItem', () => ({
	MenuItem: ({ label }: any) => <div data-testid="menu-item">{label}</div>,
}));

vi.mock('../navigation/SubMenuItem', () => ({
	SubMenuItem: ({ label }: any) => <div data-testid="sub-menu-item">{label}</div>,
}));

vi.mock('../navigation/SecondaryMenuItem', () => ({
	SecondaryMenuItem: ({ label }: any) => (
		<div data-testid="secondary-menu-item">{label}</div>
	),
}));

vi.mock('../navigation/UsersFlyout', () => ({
	UsersFlyout: () => <div data-testid="users-flyout">Users Flyout</div>,
}));

vi.mock('@/components/InviteUserModal', () => ({
	InviteUserModal: () => <div data-testid="invite-modal">Invite Modal</div>,
}));

vi.mock('../navigation/menuData', () => ({
	getMenuItems: () => [
		{ id: 'home', label: 'Home' },
		{ id: 'agents', label: 'Agents' },
	],
	getSecondaryMenuItems: () => [{ id: 'settings', label: 'Settings' }],
}));

vi.mock('lucide-react', () => ({
	MessagesSquare: () => <div data-testid="messages-icon">Messages</div>,
}));

vi.mock('../SessionHistoryItem', () => ({
	default: ({ session }: any) => <div data-testid="session-item">{session.data}</div>,
}));

describe('NavigationMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders main menu items and sub-menu items', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		expect((await screen.findAllByTestId('menu-item')).length).toBeGreaterThan(0);
		expect(await screen.findByTestId('sub-menu-item')).toBeInTheDocument();
	});

	it('renders secondary menu items and invite modal', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('secondary-menu-item')).toBeInTheDocument();
		expect(await screen.findByTestId('invite-modal')).toBeInTheDocument();
	});

	it('renders UsersFlyout', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('users-flyout')).toBeInTheDocument();
	});
});