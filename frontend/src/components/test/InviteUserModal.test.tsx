import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { InviteUserModal } from '../InviteUserModal';

// Mock translations
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

// Mock services and hooks
vi.mock('@/services/AuthService', () => ({ AuthService: { me: vi.fn(() => Promise.resolve({ id: 'u1', role: 'ADMINISTRATOR' })) } }));
vi.mock('@/services/ClientService', () => ({ listClients: vi.fn(() => Promise.resolve([{ id: 'c1', name: 'Client 1' }])) }));
vi.mock('@/services/ProjectService', () => ({ listProjects: vi.fn(() => Promise.resolve({ results: [{ id: 'p1', name: 'Project 1', client: 'Client 1' }] })) }));
vi.mock('@/services/InviteService', () => ({ sendInvite: vi.fn(() => Promise.resolve(true)) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('InviteUserModal', () => {
	beforeEach(() => vi.clearAllMocks());

	it('renders email input after loading', async () => {
		render(<InviteUserModal open={true} onOpenChange={() => { }} />);

		// Wait for email input to be available
		await waitFor(() => expect(screen.getByPlaceholderText('user@example.com')).toBeTruthy());
	});

	it('shows validation error when submitting empty form', async () => {
		render(<InviteUserModal open={true} onOpenChange={() => { }} />);

		// Wait for form to appear
		await waitFor(() => expect(screen.getByPlaceholderText('user@example.com')).toBeTruthy());

		const user = userEvent.setup();
		const sendButton = screen.getByRole('button', { name: /Send Invitation/i });
		await user.click(sendButton);

		await waitFor(() => expect(screen.getByText('Email is required')).toBeTruthy());
	});
});
