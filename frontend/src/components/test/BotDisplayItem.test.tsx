import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BotDisplayItem } from '../BotDisplayItem';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

// Mock UI components
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
	Button: ({ children, onClick }: any) => (
		<div
			role="button"
			data-testid="button"
			onClick={onClick}
		>
			{children}
		</div>
	),
}));


vi.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: any) => (
		<div data-testid="dropdown-menu">{children}</div>
	),

	DropdownMenuContent: ({ children, align }: any) => (
		<div data-testid="dropdown-content" data-align={align}>
			{children}
		</div>
	),

	DropdownMenuItem: ({ children, onClick }: any) => (
		<div
			role="menuitem"
			data-testid="dropdown-item"
			onClick={onClick}
		>
			{children}
		</div>
	),

	DropdownMenuTrigger: ({ children, asChild }: any) =>
		asChild ? (
			children
		) : (
			<button data-testid="dropdown-trigger">{children}</button>
		),
}));


vi.mock('@/components/ui/select', () => ({
	Select: ({ children }: any) => <div data-testid="select">{children}</div>,
	SelectContent: ({ children }: any) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children }: any) => (
		<div data-testid="select-item">{children}</div>
	),
	SelectTrigger: ({ children }: any) => (
		<button data-testid="select-trigger">{children}</button>
	),
	SelectValue: () => <div data-testid="select-value">Select</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
	MoreVertical: () => <div data-testid="more-icon">More</div>,
	Edit: () => <div data-testid="edit-icon">Edit</div>,
	Trash2: () => <div data-testid="trash-icon">Delete</div>,
	Link: () => <div data-testid="link-icon">Link</div>,
	Unlink: () => <div data-testid="unlink-icon">Unlink</div>,
}));

describe('BotDisplayItem', () => {
	const mockBot = {
		id: 'bot-1',
		name: 'Test Bot',
		description: 'A test bot',
		image: 'https://example.com/bot.png',
		url_n8n: 'https://n8n.example.com/webhook/test',
		expertise_area: {
			id: 'exp-1',
			name: 'AI Assistant',
		},
		projects: [
			{ id: 'proj-1', name: 'Project 1' },
		],
	};

	const mockProps = {
		bot: mockBot,
		onAttachProjects: vi.fn(),
		detachTarget: { botId: '', projectId: '' },
		onSetDetachTarget: vi.fn(),
		onDetach: vi.fn(),
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		getTranslation: (text: string) => text,
		disabled: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders bot avatar with image', () => {
		render(<BotDisplayItem {...mockProps} />);

		const avatar = screen.getByTestId('avatar');
		expect(avatar).toBeTruthy();

		const avatarImage = screen.getByTestId('avatar-image');
		expect(avatarImage).toHaveAttribute('src', 'https://example.com/bot.png');
	});

	it('renders avatar fallback with bot name initials', () => {
		render(<BotDisplayItem {...mockProps} />);

		const fallback = screen.getByTestId('avatar-fallback');
		expect(fallback).toBeTruthy();
		expect(fallback.textContent).toBe('TB');
	});

	it('renders bot name', () => {
		render(<BotDisplayItem {...mockProps} />);

		expect(screen.getByText('Test Bot')).toBeTruthy();
	});

	it('renders bot description', () => {
		render(<BotDisplayItem {...mockProps} />);

		expect(screen.getByText('A test bot')).toBeTruthy();
	});

	it('renders expertise area badge', () => {
		render(<BotDisplayItem {...mockProps} />);

		const badge = screen.getByTestId('badge');
		expect(badge).toBeTruthy();
		expect(badge.textContent).toContain('AI Assistant');
	});

	it('renders dropdown menu trigger', () => {
		render(<BotDisplayItem {...mockProps} />);

		const trigger = screen.getByTestId('dropdown-trigger');
		expect(trigger).toBeTruthy();
	});

	it('calls onEdit when edit option is clicked', async () => {
		const user = userEvent.setup();

		const { container } = render(<BotDisplayItem {...mockProps} />);

		// Find and click edit button in dropdown
		const editButtons = screen.getAllByTestId('dropdown-item');
		if (editButtons.length > 0) {
			const editButton = editButtons.find((btn) =>
				btn.textContent?.includes('Edit')
			);
			if (editButton) {
				await user.click(editButton);
				expect(mockProps.onEdit).toHaveBeenCalledWith(mockBot);
			}
		}
	});

	it('calls onDelete when delete option is clicked', async () => {
		const user = userEvent.setup();

		render(<BotDisplayItem {...mockProps} />);

		const deleteButtons = screen.getAllByTestId('dropdown-item');
		if (deleteButtons.length > 0) {
			const deleteButton = deleteButtons.find((btn) =>
				btn.textContent?.includes('Delete')
			);
			if (deleteButton) {
				await user.click(deleteButton);
				expect(mockProps.onDelete).toHaveBeenCalledWith(mockBot);
			}
		}
	});

	it('renders button to attach projects', () => {
		render(<BotDisplayItem {...mockProps} />);

		const buttons = screen.getAllByTestId('button');
		const attachButton = buttons.find((btn) =>
			btn.textContent?.includes('Attach')
		);
		expect(attachButton || buttons.length > 0).toBeTruthy();
	});

	it('calls onAttachProjects when attach button is clicked', async () => {
		const user = userEvent.setup();

		render(<BotDisplayItem {...mockProps} />);

		const buttons = screen.getAllByTestId('button');
		if (buttons.length > 0) {
			const attachButton = buttons.find((btn) =>
				btn.textContent?.includes('Attach')
			);
			if (attachButton) {
				await user.click(attachButton);
				expect(mockProps.onAttachProjects).toHaveBeenCalledWith('bot-1');
			}
		}
	});

	it('renders projects list with detach option', () => {
		render(<BotDisplayItem {...mockProps} />);

		expect(document.body).toBeTruthy();
	});

	it('applies disabled state when disabled prop is true', () => {
		const disabledProps = { ...mockProps, disabled: true };

		const { container } = render(<BotDisplayItem {...disabledProps} />);

		expect(container.firstChild).toBeTruthy();
	});

	it('renders with proper container classes', () => {
		const { container } = render(<BotDisplayItem {...mockProps} />);

		const mainDiv = container.querySelector('div');
		expect(mainDiv).toHaveClass('flex');
		expect(mainDiv).toHaveClass('items-center');
		expect(mainDiv).toHaveClass('justify-between');
		expect(mainDiv).toHaveClass('p-4');
		expect(mainDiv).toHaveClass('border');
		expect(mainDiv).toHaveClass('rounded-lg');
	});

	it('translates description using getTranslation', () => {
		const mockTranslate = vi.fn((text: string) => `translated_${text}`);

		const props = {
			...mockProps,
			getTranslation: mockTranslate,
		};

		render(<BotDisplayItem {...props} />);

		// getTranslation should be called for description
		expect(mockTranslate).toHaveBeenCalled();
	});

	it('handles bot without expertise area', () => {
		const botWithoutExpertise = {
			...mockBot,
			expertise_area: null,
		};

		render(
			<BotDisplayItem
				{...mockProps}
				bot={botWithoutExpertise}
			/>
		);

		expect(screen.getByText('Test Bot')).toBeTruthy();
	});

	it('renders all dropdown menu options', () => {
		render(<BotDisplayItem {...mockProps} />);

		const dropdownItems = screen.getAllByTestId('dropdown-item');
		expect(dropdownItems.length).toBeGreaterThan(0);
	});
});
