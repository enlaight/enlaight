import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { ProfileModal } from '../ProfileModal';

// Mock i18n
vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock AuthService
vi.mock('@/services/AuthService', () => ({
	AuthService: {
		me: vi.fn(() => Promise.resolve({
			id: 'u1',
			first_name: 'Jane',
			last_name: 'Doe',
			username: 'jdoe',
			email: 'jane@example.com',
			role: 'ADMINISTRATOR',
			job_title: 'Engineer',
			department: 'R&D',
			date_joined: '2020-01-01T00:00:00.000Z',
			is_active: true,
		}))
	},
}));

describe('ProfileModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows loading then user data when opened', async () => {
		const onClose = vi.fn();

		render(<ProfileModal isOpen={true} onClose={onClose} />);

		// Initially loading text should be present
		expect(screen.getByText('profileModal.loading')).toBeTruthy();

		// Wait for user data to render
		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeTruthy();
			expect(screen.getByText('jane@example.com')).toBeTruthy();
			expect(screen.getByText('Engineer')).toBeTruthy();
		});
	});

	it('renders fallback initials when avatar missing', async () => {
		const { AuthService } = await import('@/services/AuthService');
		(AuthService.me as any).mockResolvedValueOnce({
			id: 'u2',
			username: 'xyz',
			email: 'xyz@example.com',
			is_active: false,
		});

		render(<ProfileModal isOpen={true} onClose={vi.fn()} />);

		await waitFor(() => expect(screen.getByText('XY')).toBeTruthy());
	});
});
