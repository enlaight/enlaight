import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationMenu } from '../navigation/NavigationMenu';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

// Mock hooks
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

// Mock contexts
vi.mock('@/contexts/AgentsChatContext', () => ({
	useAgentsChat: () => ({
		openModal: vi.fn(),
		resetHomepage: vi.fn(),
	}),
}));

vi.mock('@/contexts/SearchContext', () => ({
	useSearch: () => ({
		triggerSearchFocus: vi.fn(),
	}),
}));

// Mock store
vi.mock('@/store/useStore', () => ({
	useStore: () => ({
		update: vi.fn(),
	}),
}));

// Mock services
vi.mock('@/services/ChatSessionService', () => ({
	ChatSessionService: {
		get: vi.fn(() => Promise.resolve([])),
	},
}));

// Mock sub-components
vi.mock('../navigation/MenuItem', () => ({
	MenuItem: ({ label }: { label: string }) => <div data-testid="menu-item">{label}</div>,
}));

vi.mock('../navigation/SubMenuItem', () => ({
	SubMenuItem: ({ label }: { label: string }) => <div data-testid="sub-menu-item">{label}</div>,
}));

vi.mock('../navigation/SecondaryMenuItem', () => ({
	SecondaryMenuItem: ({ label }: { label: string }) => (
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
	getSecondaryMenuItems: () => [
		{ id: 'settings', label: 'Settings' },
	],
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
	MessagesSquare: () => <div data-testid="messages-icon">Messages</div>,
}));

vi.mock('../SessionHistoryItem', () => ({
	default: ({ session, handleSession }: any) => (
		<div data-testid="session-item" onClick={handleSession}>
			{session.data}
		</div>
	),
}));

describe('NavigationMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders navigation menu component', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);

		const menuItem = await screen.findByTestId('menu-item');
		const subMenuItem = await screen.findByTestId('sub-menu-item');
		const messagesIcon = await screen.findByTestId('messages-icon');

		expect(menuItem).toBeInTheDocument();
		expect(subMenuItem).toBeInTheDocument();
		expect(messagesIcon).toBeInTheDocument();
	});

	it('renders with default isCollapsed prop as false', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu isCollapsed={false} />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('menu-item')).toBeInTheDocument();
	});

	it('renders with isCollapsed prop as true', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu isCollapsed={true} />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('menu-item')).toBeInTheDocument();
	});

	it('initializes with active item set to home', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		const activeItem = await screen.findByTestId('menu-item-active');
		expect(activeItem).toBeInTheDocument();
	});

	it('renders main and secondary menu items', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		const menuItems = await screen.findAllByTestId(/menu-item/i);
		const subMenuItems = await screen.findAllByTestId(/sub-menu-item/i);
		expect(menuItems.length).toBeGreaterThan(0);
		expect(subMenuItems.length).toBeGreaterThan(0);
	});

	it('loads and displays chat history', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('messages-icon')).toBeInTheDocument();
	});

	it('handles menu item clicks', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		const menuItem = await screen.findByTestId('menu-item');
		await user.click(menuItem);
	});

	it('displays Users Flyout when appropriate', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		const flyout = await screen.findByTestId('users-flyout');
		expect(flyout).toBeInTheDocument();
	});

	it('renders invite modal component', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu />
			</BrowserRouter>
		);
		const modal = await screen.findByTestId('invite-modal');
		expect(modal).toBeInTheDocument();
	});

	it('shows admin-only menu items for administrators', async () => {
		render(
			<BrowserRouter>
				<NavigationMenu isCollapsed={true} />
			</BrowserRouter>
		);
		const adminItem = await screen.findByTestId('admin-menu-item');
		expect(adminItem).toBeInTheDocument();
	});
});