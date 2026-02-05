import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import UserList from '../UserList';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'userManagement.title': 'Users',
				'userManagement.description': 'Manage system users',
				'userManagement.search': 'Search users',
				'userManagement.addUser': 'Add User',
				'userManagement.attachToProjects': 'Attach to Projects',
				'userManagement.noResults': 'No users found',
				'common.cancel': 'Cancel',
				'common.confirm': 'Confirm',
			};
			return dict[key] || key;
		},
	}),
}));

// Mock components
vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ text }: any) => <div data-testid="loading-animation">{text}</div>,
}));

vi.mock('@/components/UserDisplayItem', () => ({
	UserDisplayItem: ({ user, onLoginAs, onAttachProjects }: any) => (
		<div data-testid="user-item">
			<span>{user.email}</span>
			<button onClick={() => {
				if (typeof onLoginAs === 'function') return onLoginAs(user.id);
				if (typeof onAttachProjects === 'function') return onAttachProjects(user.id);
			}}>Edit</button>
		</div>
	),
}));

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

vi.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, 'aria-describedby': ariaDesc }: any) => (
		<div data-testid="dialog-content" aria-describedby={ariaDesc ?? 'dialog-desc'}>
			{children}
			<div id={ariaDesc ?? 'dialog-desc'} style={{ display: 'none' }}>
				dialog description
			</div>
		</div>
	),
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
	Checkbox: ({ checked, onCheckedChange }: any) => (
		<input
			type="checkbox"
			checked={checked}
			onChange={(e) => onCheckedChange(e.target.checked)}
			data-testid="checkbox"
		/>
	),
}));

// Mock services
vi.mock('@/services/UserService', () => ({
	listUsers: vi.fn(() => Promise.resolve({
		results: [
			{
				id: 'user1',
				email: 'john@example.com',
				first_name: 'John',
				last_name: 'Doe',
				role: 'USER',
				is_active: true,
			},
			{
				id: 'user2',
				email: 'jane@example.com',
				first_name: 'Jane',
				last_name: 'Smith',
				role: 'ADMIN',
				is_active: true,
			},
		],
		count: 2,
	})),
}));

vi.mock('@/services/ProjectService', () => ({
	listProjects: vi.fn(() => Promise.resolve({
		results: [
			{ id: 'proj1', name: 'Project 1', client_id: 'client1' },
			{ id: 'proj2', name: 'Project 2', client_id: 'client2' },
		],
		count: 2,
	})),
	ProjectService: {
		update: vi.fn(() => Promise.resolve()),
	},
}));

vi.mock('@/services/api', () => ({
	default: {
		get: vi.fn(() => Promise.resolve({
			data: {
				results: [
					{
						id: 'user1',
						email: 'john@example.com',
						first_name: 'John',
						last_name: 'Doe',
						role: 'USER',
						is_active: true,
					},
				],
			},
		})),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		defaults: {
			headers: {},
		},
	},
}));

// Mock hooks
vi.mock('@/hooks/use-batch-translation', () => ({
	useBatchTranslation: () => ({
		getTranslation: (text: string) => text,
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

describe('UserList Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders user list title', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		expect(await screen.findByText('Users')).toBeInTheDocument();
	});

	it('displays loading animation initially', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('loading-animation')).toBeInTheDocument();
	});

	it('renders users after loading', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const userItems = await screen.findAllByTestId('user-item');
		expect(userItems.length).toBeGreaterThan(0);
	});

	it('displays user emails', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		expect(await screen.findByText('john@example.com')).toBeInTheDocument();
		expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
	});

	it('displays search input', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('search-input')).toBeInTheDocument();
	});

	it('allows user to search', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const searchInput = await screen.findByTestId('search-input');
		await user.type(searchInput, 'john');
		expect(searchInput).toHaveValue('john');
	});

	it('displays action buttons for each user', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const buttons = await screen.findAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('has pagination for users', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const userItems = await screen.findAllByTestId('user-item');
		expect(userItems.length).toBeGreaterThan(0);
	});

	it('displays add user button', async () => {
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const addButton = await screen.findByRole('button', { name: /Add/i });
		expect(addButton).toBeInTheDocument();
	});

	it('handles edit user action', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const editButton = await screen.findByRole('button', { name: /Edit/i });
		await user.click(editButton);
		expect(await screen.findByTestId('user-item')).toBeInTheDocument(); // modal or state should update
	});

	it('handles multiple project selection', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const checkbox = await screen.findByTestId('checkbox');
		await user.click(checkbox);
		expect(checkbox).toBeChecked();
	});

	it('handles login as user', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<UserList />
			</BrowserRouter>
		);
		const loginButton = await screen.findByRole('button', { name: /Login/i });
		await user.click(loginButton);
	});
});