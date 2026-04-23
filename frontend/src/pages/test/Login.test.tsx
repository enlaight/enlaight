import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Login from '../Login';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'login.welcome': 'Welcome Back',
				'login.pleaseLogin': 'Please login to your account',
				'login.emailPlaceholder': 'your@email.com',
				'login.passwordPlaceholder': 'Password',
				'login.login': 'Login',
			};
			return dict[key] || key;
		},
	}),
	default: { use: () => { } },
}));

vi.mock('@/lib/i18-utils', () => ({ default: {} }));

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

vi.mock('@/components/ui/button', () => ({
	Button: ({ children, type, onClick, disabled, ...props }: any) => (
		<button type={type} onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

const loginMock = vi.fn((_email: string, _password: string) => Promise.resolve());
vi.mock('@/hooks/use-auth', () => ({
	useAuth: () => ({
		user: null,
		login: loginMock,
		logout: vi.fn(),
		isAuthenticated: false,
	}),
}));

vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ toast: vi.fn() }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => ({ pathname: '/login', search: '', hash: '', state: null }),
		Link: ({ children, to }: any) => <a href={to}>{children}</a>,
	};
});

describe('Login Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders welcome message, email, and password fields', () => {
		render(<BrowserRouter><Login /></BrowserRouter>);
		expect(screen.getByText('Welcome Back')).toBeTruthy();
		expect(screen.getByText('Please login to your account')).toBeTruthy();
		expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy();
		expect(screen.getByPlaceholderText('Password')).toBeTruthy();
	});

	it('has correct input types', () => {
		render(<BrowserRouter><Login /></BrowserRouter>);
		const email = screen.getByTestId('input-email') as HTMLInputElement;
		const password = screen.getByTestId('input-password') as HTMLInputElement;
		expect(email.type).toBe('email');
		expect(password.type).toBe('password');
	});

	it('accepts input in email and password fields', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><Login /></BrowserRouter>);
		const email = screen.getByTestId('input-email') as HTMLInputElement;
		const password = screen.getByTestId('input-password') as HTMLInputElement;
		await user.type(email, 'test@example.com');
		await user.type(password, 'password123');
		expect(email.value).toBe('test@example.com');
		expect(password.value).toBe('password123');
	});

	it('toggles password visibility', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><Login /></BrowserRouter>);
		const password = screen.getByTestId('input-password') as HTMLInputElement;
		expect(password.type).toBe('password');
		const toggleButton = screen.getAllByRole('button')[0];
		await user.click(toggleButton);
		expect(password.type).toBe('text');
	});

	it('calls login with credentials on submit', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><Login /></BrowserRouter>);
		await user.type(screen.getByTestId('input-email'), 'test@example.com');
		await user.type(screen.getByTestId('input-password'), 'password123');
		await user.click(screen.getByRole('button', { name: /Login/ }));
		expect(loginMock).toHaveBeenCalledWith('test@example.com', 'password123');
	});
});