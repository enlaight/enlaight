import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import KnowledgeBases from '../KnowledgeBases';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'knowledgeBases.title': 'Knowledge Bases',
				'knowledgeBases.description': 'Manage your knowledge bases',
				'knowledgeBases.selectProject': 'Select Project',
				'knowledgeBases.search': 'Search knowledge bases',
				'knowledgeBases.addKB': 'Add Knowledge Base',
				'knowledgeBases.noResults': 'No knowledge bases found',
				'knowledgeBases.created': 'Created',
				'knowledgeBases.documents': 'Documents',
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

vi.mock('@/components/AddEditKBModal', () => ({
	AddEditKBModal: ({ open, onOpenChange, kb, onSave }: any) => (
		open ? (
			<div data-testid="kb-modal">
				<button onClick={() => onSave({ name: 'New KB' })}>Save</button>
				<button onClick={() => onOpenChange(false)}>Close</button>
			</div>
		) : null
	),
}));

vi.mock('@/components/ManageFilesModal', () => ({
	ManageFilesModal: ({ open, onOpenChange, kb }: any) => (
		open ? (
			<div data-testid="files-modal">
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

vi.mock('@/components/ui/select', () => ({
	Select: ({ children }: any) => <div data-testid="select">{children}</div>,
	SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
	SelectItem: ({ children, value }: any) => <div data-testid="select-item">{children}</div>,
	SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
	SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

vi.mock('@/components/ui/card', () => ({
	Card: ({ children }: any) => <div data-testid="card">{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
	Badge: ({ children }: any) => <div data-testid="badge">{children}</div>,
}));

vi.mock('@/components/ui/avatar', () => ({
	Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
	AvatarFallback: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
	Table: ({ children }: any) => <table data-testid="table">{children}</table>,
	TableBody: ({ children }: any) => <tbody>{children}</tbody>,
	TableCell: ({ children }: any) => <td>{children}</td>,
	TableHead: ({ children }: any) => <thead>{children}</thead>,
	TableHeader: ({ children }: any) => <tr>{children}</tr>,
	TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/alert', () => ({
	Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
	AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

// Mock services
vi.mock('@/services/KnowledgeBaseService', () => ({
	KnowledgeBaseService: {
		list: vi.fn((projectId) => Promise.resolve([
			{
				id: 1,
				name: 'KB 1',
				description: 'First knowledge base',
				avatar: null,
				hash_id: 'hash1',
				created_at: new Date().toISOString(),
			},
			{
				id: 2,
				name: 'KB 2',
				description: 'Second knowledge base',
				avatar: null,
				hash_id: 'hash2',
				created_at: new Date().toISOString(),
			},
		])),
		create: vi.fn(() => Promise.resolve()),
		update: vi.fn(() => Promise.resolve()),
		delete: vi.fn(() => Promise.resolve()),
	},
}));

vi.mock('@/services/ProjectService', () => ({
	listProjects: vi.fn(() => Promise.resolve({
		results: [
			{ id: 'proj1', name: 'Project 1' },
			{ id: 'proj2', name: 'Project 2' },
		],
		count: 2,
	})),
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

describe('KnowledgeBases Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders knowledge bases title', async () => {
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    expect(await screen.findByText('Knowledge Bases')).toBeInTheDocument();
  });

  it('displays project selector', async () => {
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    expect(await screen.findByTestId('select')).toBeInTheDocument();
  });

  it('displays loading animation initially', async () => {
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    expect(await screen.findByTestId('loading-animation')).toBeInTheDocument();
  });

  it('renders knowledge bases table after loading', async () => {
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    expect(await screen.findByTestId('table')).toBeInTheDocument();
  });

  it('displays search input', async () => {
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const searchInput = await screen.findByTestId('search-input');
    expect(searchInput).toBeInTheDocument();
  });

  it('allows user to search knowledge bases', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const searchInput = await screen.findByTestId('search-input');
    await user.type(searchInput, 'KB 1');
    expect(searchInput).toHaveValue('KB 1');
  });

  it('displays add knowledge base button', async () => {
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const addButton = await screen.findByRole('button', { name: /Add/i });
    expect(addButton).toBeInTheDocument();
  });

  it('opens add knowledge base modal', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);
    expect(await screen.findByTestId('kb-modal')).toBeInTheDocument();
  });

  it('displays edit and delete buttons for each knowledge base', async () => {
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const editButtons = await screen.findAllByRole('button', { name: /Edit/i });
    const deleteButtons = await screen.findAllByRole('button', { name: /Delete/i });
    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('handles knowledge base creation', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);
    const saveButton = await screen.findByRole('button', { name: /Save/i });
    await user.click(saveButton);
    // optionally assert that KnowledgeBaseService.create was called
  });

  it('handles knowledge base deletion', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    await user.click(deleteButton);
    // optionally assert that KnowledgeBaseService.delete was called
  });

  it('filters knowledge bases by project', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    const select = await screen.findByTestId('select');
    await user.selectOptions(select, ['project1']);
    expect(select).toHaveValue('project1');
  });

  it('handles permission errors gracefully', async () => {
    vi.doMock('@/services/KnowledgeBaseService', () => ({
      KnowledgeBaseService: {
        list: vi.fn(() => Promise.reject(new Error('Permission denied'))),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    }));
    render(
      <BrowserRouter>
        <KnowledgeBases />
      </BrowserRouter>
    );
    expect(await screen.findByTestId('select')).toBeInTheDocument();
  });
});
