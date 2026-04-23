import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionHistoryItem from '../SessionHistoryItem';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('lucide-react', () => ({
	MoreHorizontal: (props: any) => <div data-testid="more-icon" {...props}>More</div>,
	Trash2: () => <div data-testid="trash-icon">Delete</div>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
	DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
	DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuItem: ({ children, onClick }: any) => (
		<button data-testid="dropdown-item" onClick={onClick}>{children}</button>
	),
}));

describe('SessionHistoryItem', () => {
	const mockSession = { data: 'Test Session', agent_name: 'Test Agent', id: '123' };
	const mockHandleSession = vi.fn();
	const mockHandleEditSession = vi.fn();
	const mockDeleteSession = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders session data and agent name', () => {
		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);
		expect(screen.getByText('Test Session')).toBeTruthy();
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
		if (item) await user.click(item);
		expect(mockHandleSession).toHaveBeenCalled();
	});

	it('calls handleEditSession when more icon is clicked', async () => {
		const user = userEvent.setup();
		render(
			<SessionHistoryItem
				session={mockSession}
				handleSession={mockHandleSession}
				handleEditSession={mockHandleEditSession}
				deleteSession={mockDeleteSession}
			/>
		);
		await user.click(screen.getByTestId('more-icon'));
		expect(mockHandleEditSession).toHaveBeenCalled();
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
		await user.click(screen.getByTestId('dropdown-item'));
		expect(mockDeleteSession).toHaveBeenCalled();
	});
});