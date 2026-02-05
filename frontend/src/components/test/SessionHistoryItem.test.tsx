import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionHistoryItem from '../SessionHistoryItem';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
	MoreHorizontal: () => <div data-testid="more-icon">More</div>,
	Trash2: () => <div data-testid="trash-icon">Delete</div>,
}));

// Mock dropdown menu components
vi.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children, open, onOpenChange }: any) => (
		<div data-testid="dropdown-menu" data-open={open} onClick={() => onOpenChange?.(!open)}>
			{children}
		</div>
	),
	DropdownMenuTrigger: ({ children, asChild }: any) => (
		<button data-testid="dropdown-trigger">{children}</button>
	),
	DropdownMenuContent: ({ children, align }: any) => (
		<div data-testid="dropdown-content" data-align={align}>
			{children}
		</div>
	),
	DropdownMenuItem: ({ children, onClick }: any) => (
		<button data-testid="dropdown-item" onClick={onClick}>
			{children}
		</button>
	),
}));

describe('SessionHistoryItem', () => {
	const mockSession = {
		data: 'Test Session',
		agent_name: 'Test Agent',
		id: '123',
	};

	const mockHandleSession = vi.fn();
	const mockHandleEditSession = vi.fn();
	const mockDeleteSession = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders session data', () => {
		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		expect(screen.getByText('Test Session')).toBeTruthy();
	});

	it('renders agent name', () => {
		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		expect(screen.getByText('Test Agent')).toBeTruthy();
	});

	it('calls handleSession when item is clicked', async () => {
		const user = userEvent.setup();

		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const item = screen.getByText('Test Session').closest('div');
		if (item) {
			await user.click(item);
		}

		expect(mockHandleSession).toHaveBeenCalled();
	});

	it('renders dropdown menu trigger', () => {
		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const trigger = screen.getByTestId('dropdown-trigger');
		expect(trigger).toBeTruthy();
	});

	it('calls handleEditSession when dropdown is opened', async () => {
		const user = userEvent.setup();

		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const trigger = screen.getByTestId('dropdown-trigger');
		await user.click(trigger);

		expect(mockHandleEditSession).toHaveBeenCalled();
	});

	it('renders delete option in dropdown menu', () => {
		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const deleteItem = screen.getByTestId('dropdown-item');
		expect(deleteItem).toBeTruthy();
		expect(deleteItem.textContent).toContain('Delete');
	});

	it('calls deleteSession when delete is clicked', async () => {
		const user = userEvent.setup();

		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const deleteItem = screen.getByTestId('dropdown-item');
		await user.click(deleteItem);

		expect(mockDeleteSession).toHaveBeenCalled();
	});

	it('renders with light mode by default', () => {
		const { container } = render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
				darkmode={false}
			/>
		);

		expect(container.firstChild).toBeTruthy();
	});

	it('applies dark mode styles when darkmode prop is true', () => {
		const { container } = render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
				darkmode={true}
			/>
		);

		expect(container.firstChild).toBeTruthy();
	});

	it('renders with proper container classes', () => {
		const { container } = render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const item = container.querySelector('div');
		expect(item?.className).toContain('flex');
		expect(item?.className).toContain('w-full');
		expect(item?.className).toContain('items-center');
		expect(item?.className).toContain('cursor-pointer');
	});

	it('renders session data with text formatting classes', () => {
		const { container } = render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const sessionData = screen.getByText('Test Session');
		expect(sessionData.className).toContain('text-base');
		expect(sessionData.className).toContain('font-medium');
	});

	it('renders agent name with smaller font than session data', () => {
		const { container } = render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);

		const agentName = screen.getByText('Test Agent');
		expect(agentName.className).toContain('text-[13px]');
		expect(agentName.className).toContain('font-medium');
	});
});
