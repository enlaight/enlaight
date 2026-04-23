import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import UserList from '../UserList';
import { BrowserRouter } from 'react-router-dom';

const translationDict: Record<string, string> = {
	'listUsers.title': 'Users',
	'listUsers.titleDesc': 'Manage system users',
	'listUsers.searchPlaceholder': 'Search users',
	'listUsers.loading': 'Loading users',
	'listUsers.previous': 'Previous',
	'listUsers.next': 'Next',
	'attachUserToProjects.title': 'Attach to Projects',
	'attachUserToProjects.loading': 'Loading...',
	'attachUserToProjects.noProjects': 'No projects',
	'attachUserToProjects.cancel': 'Cancel',
	'attachUserToProjects.attach': 'Attach',
};

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => translationDict[key] || key,
	}),
}));

vi.mock('i18next', () => ({
	t: (key: string) => translationDict[key] || key,
}));

// Mock components
vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ text }: any) => <div data-testid="loading-animation">{text}</div>,
}));

vi.mock('@/components/UserDisplayItem', () => ({
	UserDisplayItem: ({ user, onLoginAs, onAttachProjects }: any) => (
		<div data-testid="user-item">
			<span>{user.email}</span>
			<button onClick={() => typeof onLoginAs === 'function' && onLoginAs(user.id)}>Login As</button>
			<button onClick={() => typeof onAttachProjects === 'function' && onAttachProjects(user.id)}>Attach</button>
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
		attachUsers: vi.fn(() => Promise.resolve()),
		detachUsers: vi.fn(() => Promise.resolve()),
		update: vi.fn(() => Promise.resolve()),
	},
}));

vi.mock('@/services/api', () => ({
	default: {
		get: vi.fn((url: string) => {
			if (url.includes('/users/')) {
				return Promise.resolve({
					data: { results: [{ id: 'user1', email: 'john@example.com', client_id: 'client1' }] },
				});
			}
			return Promise.resolve({
				data: { access: 'test-access-token', refresh: 'test-refresh-token' },
			});
		}),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		defaults: { headers: {} },
	},
}));

// Mock hooks
vi.mock('@/hooks/use-batch-translation', () => ({
	useBatchTranslation: () => ({
		getTranslation: (text: string) => text,
		loading: false,
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

	it('renders title and user emails', async () => {
		render(<BrowserRouter><UserList /></BrowserRouter>);
		expect(await screen.findByText('Users')).toBeInTheDocument();
		expect(await screen.findByText('john@example.com')).toBeInTheDocument();
		expect(screen.getByText('jane@example.com')).toBeInTheDocument();
	});

	it('allows user to search', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><UserList /></BrowserRouter>);
		const searchInput = await screen.findByTestId('search-input');
		await user.type(searchInput, 'john');
		expect(searchInput).toHaveValue('john');
	});

	it('displays pagination controls', async () => {
		render(<BrowserRouter><UserList /></BrowserRouter>);
		await screen.findAllByTestId('user-item');
		expect(screen.getByText('Previous')).toBeInTheDocument();
		expect(screen.getByText('Next')).toBeInTheDocument();
	});

	it('opens attach-to-projects dialog and toggles checkboxes', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><UserList /></BrowserRouter>);
		const attachButtons = await screen.findAllByRole('button', { name: /Attach/i });
		await user.click(attachButtons[0]);
		expect(await screen.findByTestId('dialog')).toBeInTheDocument();
		const checkboxes = await screen.findAllByTestId('checkbox');
		expect(checkboxes.length).toBeGreaterThan(0);
		await user.click(checkboxes[0]);
		expect(checkboxes[0]).toBeChecked();
	});
});
