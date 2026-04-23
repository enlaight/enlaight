import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ResetPassword from '../ResetPassword';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

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
	CardContent: ({ children }: any) => <div>{children}</div>,
	CardDescription: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
	AlertDialog: ({ children }: any) => <div>{children}</div>,
	AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
	AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/services/PasswordService', () => ({
	resetPassword: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useNavigate: () => vi.fn(),
		useSearchParams: () => [new URLSearchParams('email=test@example.com&token=valid-token')],
	};
});

describe('ResetPassword Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders both password inputs as type=password', () => {
		render(<BrowserRouter><ResetPassword /></BrowserRouter>);
		const newPwd = screen.getByTestId('input-newPassword') as HTMLInputElement;
		const confirmPwd = screen.getByTestId('input-confirmPassword') as HTMLInputElement;
		expect(newPwd.type).toBe('password');
		expect(confirmPwd.type).toBe('password');
	});

	it('accepts input in password fields', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><ResetPassword /></BrowserRouter>);
		const newPwd = screen.getByTestId('input-newPassword') as HTMLInputElement;
		const confirmPwd = screen.getByTestId('input-confirmPassword') as HTMLInputElement;
		await user.type(newPwd, 'NewPassword123');
		await user.type(confirmPwd, 'NewPassword123');
		expect(newPwd.value).toBe('NewPassword123');
		expect(confirmPwd.value).toBe('NewPassword123');
	});
});