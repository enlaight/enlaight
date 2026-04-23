import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ProjectsList from '../ProjectsList';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'projects.directory': 'Projects',
				'projects.description': 'Manage your projects',
				'projects.searchPlaceholder': 'Search projects',
				'projects.addProject': 'Add Project',
			};
			return dict[key] || key;
		},
	}),
}));

vi.mock('@/components/LoadingAnimation', () => ({
	default: ({ text }: any) => <div data-testid="loading-animation">{text}</div>,
}));

vi.mock('@/components/ProjectDisplayItem', () => ({
	ProjectDisplayItem: ({ project, onEdit, onDelete }: any) => (
		<div data-testid="project-item">
			<span>{project.name}</span>
			<button onClick={() => onEdit?.(project)}>Edit</button>
			<button onClick={() => onDelete?.(project)}>Delete</button>
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
		<input type={type} placeholder={placeholder} value={value} onChange={onChange} data-testid="search-input" {...props} />
	),
}));

vi.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>{children}</button>
	),
}));

vi.mock('@/services/ProjectService', () => ({
	listProjects: vi.fn(() => Promise.resolve({
		results: [
			{ id: 'proj1', name: 'Project 1', description: 'First project', client: { id: 'client1', name: 'Client A' }, created_at: new Date().toISOString() },
			{ id: 'proj2', name: 'Project 2', description: 'Second project', client: { id: 'client2', name: 'Client B' }, created_at: new Date().toISOString() },
		],
		count: 2,
	})),
	ProjectService: {
		update: vi.fn(() => Promise.resolve()),
		delete: vi.fn(() => Promise.resolve()),
		create: vi.fn(() => Promise.resolve()),
	},
}));

vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/use-batch-translation', () => ({
	useBatchTranslation: () => ({ getTranslation: (text: string) => text }),
}));

describe('ProjectsList Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders title and project names', async () => {
		render(<BrowserRouter><ProjectsList /></BrowserRouter>);
		expect(await screen.findByText('Projects')).toBeInTheDocument();
		expect(await screen.findByText('Project 1')).toBeInTheDocument();
		expect(screen.getByText('Project 2')).toBeInTheDocument();
	});

	it('allows user to search projects', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><ProjectsList /></BrowserRouter>);
		const searchInput = await screen.findByTestId('search-input');
		await user.type(searchInput, 'Project 1');
		expect(searchInput).toHaveValue('Project 1');
	});

	it('opens add project modal and closes after save', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><ProjectsList /></BrowserRouter>);
		await user.click(await screen.findByRole('button', { name: /Add/i }));
		await screen.findByTestId('add-project-modal');
		await user.click(screen.getByRole('button', { name: /Save/i }));
		expect(screen.queryByTestId('add-project-modal')).not.toBeInTheDocument();
	});

	it('opens edit project modal when edit clicked', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><ProjectsList /></BrowserRouter>);
		const editButtons = await screen.findAllByRole('button', { name: /Edit/i });
		await user.click(editButtons[0]);
		expect(await screen.findByTestId('edit-project-modal')).toBeInTheDocument();
	});
});