import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BotDisplayItem } from '../BotDisplayItem';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ui/avatar', () => ({
	Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
	AvatarImage: ({ src, alt }: any) => (
		<img data-testid="avatar-image" src={src} alt={alt} />
	),
	AvatarFallback: ({ children }: any) => (
		<div data-testid="avatar-fallback">{children}</div>
	),
}));

vi.mock('@/components/ui/badge', () => ({
	Badge: ({ children }: any) => <div data-testid="badge">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled }: any) => (
		<button data-testid="button" onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: any) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuItem: ({ children, onClick }: any) => (
		<button data-testid="dropdown-item" onClick={onClick}>{children}</button>
	),
	DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/select', () => ({
	Select: ({ children }: any) => <div data-testid="select">{children}</div>,
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children }: any) => <div>{children}</div>,
	SelectTrigger: ({ children }: any) => <button>{children}</button>,
	SelectValue: () => <div>Select</div>,
}));

vi.mock('lucide-react', () => ({
	MoreVertical: () => <span>More</span>,
	Edit: () => <span>Edit</span>,
	Trash2: () => <span>Delete</span>,
	Link: () => <span>Link</span>,
	Unlink: () => <span>Unlink</span>,
}));

describe('BotDisplayItem', () => {
	const mockBot = {
		id: 'bot-1',
		name: 'Test Bot',
		description: 'A test bot',
		image: 'https://example.com/bot.png',
		url_n8n: 'https://n8n.example.com/webhook/test',
		expertise_area: { id: 'exp-1', name: 'AI Assistant' },
		projects: [{ id: 'proj-1', name: 'Project 1' }],
	};

	const makeProps = () => ({
		bot: mockBot,
		onAttachProjects: vi.fn(),
		detachTarget: { botId: '', projectId: '' },
		onSetDetachTarget: vi.fn(),
		onDetach: vi.fn(),
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		getTranslation: (text: string) => text,
		disabled: false,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders bot avatar, name, description, and expertise', () => {
		render(<BotDisplayItem {...(makeProps() as any)} />);
		expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', 'https://example.com/bot.png');
		expect(screen.getByTestId('avatar-fallback').textContent).toBe('TB');
		expect(screen.getByText('Test Bot')).toBeTruthy();
		expect(screen.getByText('A test bot')).toBeTruthy();
		expect(screen.getByText('AI Assistant')).toBeTruthy();
	});

	it('calls onEdit when edit dropdown item is clicked', async () => {
		const user = userEvent.setup();
		const props = makeProps();
		render(<BotDisplayItem {...(props as any)} />);
		const editItem = screen.getAllByTestId('dropdown-item').find(btn =>
			btn.textContent?.includes('agentManagement.editBot')
		);
		if (!editItem) throw new Error('edit dropdown item not found');
		await user.click(editItem);
		expect(props.onEdit).toHaveBeenCalledWith(mockBot);
	});

	it('calls onDelete when delete dropdown item is clicked', async () => {
		const user = userEvent.setup();
		const props = makeProps();
		render(<BotDisplayItem {...(props as any)} />);
		const deleteItem = screen.getAllByTestId('dropdown-item').find(btn =>
			btn.textContent?.includes('agentManagement.deleteBot')
		);
		if (!deleteItem) throw new Error('delete dropdown item not found');
		await user.click(deleteItem);
		expect(props.onDelete).toHaveBeenCalledWith(mockBot);
	});

	it('calls onAttachProjects when attach item is clicked', async () => {
		const user = userEvent.setup();
		const props = makeProps();
		render(<BotDisplayItem {...(props as any)} />);
		const attachItem = screen.getAllByTestId('dropdown-item').find(btn =>
			btn.textContent?.includes('agentManagement.attachToProjects')
		);
		if (!attachItem) throw new Error('attach dropdown item not found');
		await user.click(attachItem);
		expect(props.onAttachProjects).toHaveBeenCalledWith('bot-1');
	});

	it('handles bot without expertise area', () => {
		const props = { ...makeProps(), bot: { ...mockBot, expertise_area: null } };
		render(<BotDisplayItem {...(props as any)} />);
		expect(screen.getByText('Test Bot')).toBeTruthy();
		expect(screen.queryByText('AI Assistant')).toBeNull();
	});
});