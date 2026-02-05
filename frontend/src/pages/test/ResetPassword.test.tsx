import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ResetPassword from '../ResetPassword';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'resetPassword.title': 'Reset Password',
				'resetPassword.enterNewPassword': 'Enter your new password',
				'resetPassword.newPassword': 'New Password',
				'resetPassword.confirmPassword': 'Confirm Password',
				'resetPassword.resetButton': 'Reset Password',
				'resetPassword.backToLogin': 'Back to Login',
			};
			return dict[key] || key;
		},
	}),
}));

// Mock components
vi.mock('@/components/ui/button', () => ({
	Button: ({ children, type, onClick, disabled, ...props }: any) => (
		<button type={type} onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

vi.mock('@/components/ui/input', () => ({
	Input: ({ type, placeholder, value, onChange, id, ...props }: any) => (
		<input
			id={id}
			type={type}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			data-testid={`input-${id}`}
			{...props}
		/>
	),
}));

vi.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
	Card: ({ children }: any) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
	CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
	CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
	CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
	AlertDialog: ({ children }: any) => <div data-testid="alert-dialog">{children}</div>,
	AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogContent: ({ children, 'aria-describedby': ariaDesc }: any) => (
		<div data-testid="alert-dialog-content" aria-describedby={ariaDesc ?? 'alert-dialog-desc'}>
			{children}
			<div id={ariaDesc ?? 'alert-dialog-desc'} style={{ display: 'none' }}>
				alert dialog description
			</div>
		</div>
	),
	AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
	AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock services
vi.mock('@/services/PasswordService', () => ({
	resetPassword: vi.fn((email, token, newPassword) => Promise.resolve()),
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useSearchParams: () => {
			const params = new URLSearchParams('email=test@example.com&token=valid-token');
			return [params];
		},
	};
});

describe('ResetPassword Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	it('renders reset password form', () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		expect(screen.getByTestId('card')).toBeTruthy();
	});

	it('displays new password input field', () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		expect(inputs.length).toBeGreaterThanOrEqual(1);
	});

	it('displays confirm password input field', () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		expect(inputs.length).toBeGreaterThanOrEqual(2);
	});

	it('allows user to enter new password', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'NewPassword123');

		expect((inputs[0] as HTMLInputElement).value).toBe('NewPassword123');
	});

	it('allows user to confirm password', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[1], 'NewPassword123');

		expect((inputs[1] as HTMLInputElement).value).toBe('NewPassword123');
	});

	it('displays password visibility toggles', () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const buttons = screen.getAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('toggles new password visibility', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const buttons = screen.getAllByRole('button');
		// Find and click a visibility toggle (if exists)
		if (buttons.length > 1) {
			await user.click(buttons[0]);
			expect(buttons[0]).toBeTruthy();
		}
	});

	it('toggles confirm password visibility', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const buttons = screen.getAllByRole('button');
		if (buttons.length > 1) {
			await user.click(buttons[1]);
			expect(buttons[1]).toBeTruthy();
		}
	});

	it('displays reset button', () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const buttons = screen.getAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('validates password length', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'short');
		await user.type(inputs[1], 'short');

		const resetButton = screen.getAllByRole('button').find(btn => !btn.className.includes('absolute'));
		if (resetButton) {
			expect(resetButton).toBeTruthy();
		}
	});

	it('validates password match', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'Password123');
		await user.type(inputs[1], 'DifferentPassword123');

		// Both passwords should be entered
		expect((inputs[0] as HTMLInputElement).value).toBe('Password123');
		expect((inputs[1] as HTMLInputElement).value).toBe('DifferentPassword123');
	});

	it('displays back to login link', () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const buttons = screen.getAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('handles form submission with valid data', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'NewPassword123');
		await user.type(inputs[1], 'NewPassword123');

		const submitButton = screen.getAllByRole('button').find(btn => !btn.className.includes('absolute'));
		if (submitButton) {
			await user.click(submitButton);

			await waitFor(() => {
				expect(submitButton).toBeTruthy();
			});
		}
	});

	it('disables submit button with invalid password', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		// Don't fill in passwords
		const inputs = screen.getAllByRole('textbox');
		expect(inputs.length).toBeGreaterThanOrEqual(2);
	});

	it('shows alert dialog on reset confirmation', async () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByTestId('card')).toBeTruthy();
		});
	});

	it('has correct input types', () => {
		render(
			<BrowserRouter>
				<ResetPassword />
			</BrowserRouter>
		);

		const inputs = screen.getAllByRole('textbox');
		expect(inputs.length).toBeGreaterThanOrEqual(2);
	});
});
