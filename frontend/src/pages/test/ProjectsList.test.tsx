import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ProjectsList from '../ProjectsList';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'projectManagement.title': 'Projects',
				'projectManagement.description': 'Manage your projects',
				'projectManagement.search': 'Search projects',
				'projectManagement.addProject': 'Add Project',
				'projectManagement.noResults': 'No projects found',
				'projectManagement.client': 'Client',
				'projectManagement.createdAt': 'Created At',
				'common.cancel': 'Cancel',
				'common.confirm': 'Confirm',
				'common.edit': 'Edit',
				'common.delete': 'Delete',
			};
			return dict[key] || key;
		},
	}),
}));

// Mock components
vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ text }: any) => <div data-testid="loading-animation">{text}</div>,
}));

vi.mock('@/components/ProjectDisplayItem', () => ({
	ProjectDisplayItem: ({ project, onEdit, onDelete }: any) => (
		<div data-testid="project-item">
			<span>{project.name}</span>
			<button onClick={() => {
				if (typeof onEdit === 'function') return onEdit(project);
			}}>Edit</button>
			<button onClick={() => {
				if (typeof onDelete === 'function') return onDelete(project);
			}}>Delete</button>
		</div>
	),
}));

vi.mock('@/components/AddProjectModal', () => ({
	AddProjectModal: ({ open, onOpenChange, onSuccess }: any) => (
		open ? (
			<div data-testid="add-project-modal">
				<button onClick={() => onSuccess({ name: 'New Project' })}>Save</button>
				<button onClick={() => onOpenChange(false)}>Close</button>
			</div>
		) : null
	),
}));

vi.mock('@/components/EditProjectModal', () => ({
	EditProjectModal: ({ open, onOpenChange, project, onSuccess }: any) => (
		open ? (
			<div data-testid="edit-project-modal">
				<button onClick={() => onSuccess(project)}>Save</button>
				<button onClick={() => onOpenChange(false)}>Close</button>
			</div>
		) : null
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

// Mock services
vi.mock('@/services/ProjectService', () => ({
	listProjects: vi.fn(() => Promise.resolve({
		results: [
			{
				id: 'proj1',
				name: 'Project 1',
				description: 'First project',
				client: { id: 'client1', name: 'Client A' },
				created_at: new Date().toISOString(),
			},
			{
				id: 'proj2',
				name: 'Project 2',
				description: 'Second project',
				client: { id: 'client2', name: 'Client B' },
				created_at: new Date().toISOString(),
			},
		],
		count: 2,
	})),
	ProjectService: {
		update: vi.fn(() => Promise.resolve()),
		delete: vi.fn(() => Promise.resolve()),
		create: vi.fn(() => Promise.resolve()),
	},
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

vi.mock('@/hooks/use-batch-translation', () => ({
	useBatchTranslation: () => ({
		getTranslation: (text: string) => text,
	}),
}));

describe('ProjectsList Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders projects list title', async () => {
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		expect(await screen.findByText('Projects')).toBeInTheDocument();
	});

	it('displays loading animation initially', async () => {
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('loading-animation')).toBeInTheDocument();
	});

	it('renders projects after loading', async () => {
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		const projectItems = await screen.findAllByTestId('project-item');
		expect(projectItems.length).toBeGreaterThan(0);
	});

	it('displays project names', async () => {
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		expect(await screen.findByText('Project 1')).toBeInTheDocument();
		expect(await screen.findByText('Project 2')).toBeInTheDocument();
	});

	it('displays search input', async () => {
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		expect(await screen.findByTestId('search-input')).toBeInTheDocument();
	});

	it('allows user to search projects', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		const searchInput = await screen.findByTestId('search-input');
		await user.type(searchInput, 'Project 1');
		expect(searchInput).toHaveValue('Project 1');
	});

	it('displays add project button', async () => {
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		const buttons = await screen.findAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('opens add project modal', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);

		const addButton = await screen.findByRole('button', { name: /Add/i });
		await user.click(addButton);

		expect(await screen.findByTestId('add-project-modal')).toBeInTheDocument();
	});

	it('displays edit and delete buttons for each project', async () => {
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);
		const editButtons = await screen.findAllByRole('button', { name: /Edit/ });
		const deleteButtons = await screen.findAllByRole('button', { name: /Delete/ });
		expect(editButtons.length).toBeGreaterThan(0);
		expect(deleteButtons.length).toBeGreaterThan(0);
	});

	it('opens edit project modal', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);

		const editButton = await screen.findByRole('button', { name: /Edit/i });
		await user.click(editButton);

		expect(await screen.findByTestId('edit-project-modal')).toBeInTheDocument();
	});

	it('handles project creation', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);

		const addButton = await screen.findByRole('button', { name: /Add/i });
		await user.click(addButton);

		const saveButton = await screen.findByRole('button', { name: /Save/i });
		await user.click(saveButton);

		expect(await screen.findByText('New Project')).toBeInTheDocument();
	});

	it('handles project deletion', async () => {
		const user = userEvent.setup();
		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);

		const deleteButton = await screen.findByRole('button', { name: /Delete/i });
		await user.click(deleteButton);
	});

	it('shows empty state when no projects found', async () => {
		vi.doMock('@/services/ProjectService', () => ({
			listProjects: vi.fn(() => Promise.resolve({ results: [], count: 0 })),
			ProjectService: { update: vi.fn(), delete: vi.fn(), create: vi.fn() },
		}));

		render(
			<BrowserRouter>
				<ProjectsList />
			</BrowserRouter>
		);

		expect(await screen.findByText(/No projects/i)).toBeInTheDocument();
	});
});