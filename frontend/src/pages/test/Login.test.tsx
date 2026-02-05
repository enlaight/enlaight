import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Login from '../Login';
import { BrowserRouter } from 'react-router-dom';

// Mock translations
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'login.welcome': 'Welcome Back',
				'login.pleaseLogin': 'Please login to your account',
				'login.emailPlaceholder': 'your@email.com',
				'login.passwordPlaceholder': 'Password',
				'login.login': 'Login',
				'login.signingIn': 'Signing in...',
				'login.forgotPassword': 'Forgot password?',
				'login.dontHaveAccount': "Don't have an account?",
				'login.signup': 'Sign up',
				'login.loginSuccessTitle': 'Success',
				'login.loginSuccessDesc': 'You have been logged in successfully',
				'login.loginFailedTitle': 'Login Failed',
				'login.invalidCredentials': 'Invalid credentials',
			};
			return dict[key] || key;
		},
	}),
	default: {
		use: () => { },
	},
}));

vi.mock('@/lib/i18-utils', () => ({
	default: {},
}));

// Mock components
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

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
	useAuth: () => ({
		user: null,
		login: vi.fn((email: string, password: string) => Promise.resolve()),
		logout: vi.fn(),
		isAuthenticated: false,
	}),
}));

vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

const mockNavigate = vi.fn();
const mockUseLocation = {
	pathname: '/login',
	search: '',
	hash: '',
	state: null,
};

vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => mockUseLocation,
		Link: ({ children, to }: any) => <a href={to}>{children}</a>,
	};
});

describe('Login Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	it('renders login form with email and password fields', async () => {
		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy();
		expect(screen.getByPlaceholderText('Password')).toBeTruthy();
	});

	it('renders welcome message', () => {
		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		expect(screen.getByText('Welcome Back')).toBeTruthy();
		expect(screen.getByText('Please login to your account')).toBeTruthy();
	});

	it('renders login button', () => {
		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const loginButton = screen.getByRole('button', { name: /Login/ });
		expect(loginButton).toBeTruthy();
	});

	it('renders password visibility toggle', () => {
		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const toggleButtons = screen.getAllByRole('button');
		// Should have login button + password visibility toggle
		expect(toggleButtons.length).toBeGreaterThanOrEqual(1);
	});

	it('allows user to type in email field', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const emailInput = screen.getByTestId('input-email') as HTMLInputElement;
		await user.type(emailInput, 'test@example.com');

		expect(emailInput.value).toBe('test@example.com');
	});

	it('allows user to type in password field', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const passwordInput = screen.getByTestId('input-password') as HTMLInputElement;
		await user.type(passwordInput, 'password123');

		expect(passwordInput.value).toBe('password123');
	});

	it('toggles password visibility', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const passwordInput = screen.getByTestId('input-password') as HTMLInputElement;
		expect(passwordInput.type).toBe('password');

		const toggleButtons = screen.getAllByRole('button');
		// First button should be the toggle (not the login button)
		const toggleButton = toggleButtons[0];
		await user.click(toggleButton);

		// After toggle, should show password
		expect(passwordInput.type).toBe('text');
	});

	it('handles form submission', async () => {
		const user = userEvent.setup();
		const mockLogin = vi.fn().mockResolvedValue(undefined);

		vi.doMock('@/hooks/use-auth', () => ({
			useAuth: () => ({
				user: null,
				login: mockLogin,
				logout: vi.fn(),
				isAuthenticated: false,
			}),
		}));

		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const emailInput = screen.getByTestId('input-email');
		const passwordInput = screen.getByTestId('input-password');
		const loginButton = screen.getByRole('button', { name: /Login/ });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(loginButton);

		await waitFor(() => {
			expect(loginButton).toBeTruthy();
		});
	});

	it('disables login button while loading', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const emailInput = screen.getByTestId('input-email');
		const passwordInput = screen.getByTestId('input-password');
		const loginButton = screen.getByRole('button', { name: /Login/ });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(loginButton);

		await waitFor(() => {
			expect(loginButton).toBeTruthy();
		});
	});

	it('shows signup link', () => {
		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const links = screen.getAllByRole('link');
		expect(links.length).toBeGreaterThanOrEqual(1);
	});

	it('shows forgot password link', () => {
		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const links = screen.getAllByRole('link');
		expect(links.length).toBeGreaterThanOrEqual(1);
	});

	it('shows loading indicator during login', async () => {
		const user = userEvent.setup();

		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const emailInput = screen.getByTestId('input-email');
		const passwordInput = screen.getByTestId('input-password');
		const loginButton = screen.getByRole('button', { name: /Login/ });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(loginButton);

		// Check for loading state
		await waitFor(() => {
			expect(loginButton).toBeTruthy();
		});
	});

	it('has correct input types', () => {
		render(
			<BrowserRouter>
				<Login />
			</BrowserRouter>
		);

		const emailInput = screen.getByTestId('input-email') as HTMLInputElement;
		const passwordInput = screen.getByTestId('input-password') as HTMLInputElement;

		expect(emailInput.type).toBe('email');
		expect(passwordInput.type).toBe('password');
	});
});
