import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import AssistantList from '../AssistantList';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const dict: Record<string, string> = {
				'listAssistants.title': 'Assistants',
				'listAssistants.titleDesc': 'Available assistants',
				'listAssistants.searchPlaceholder': 'Search assistants',
				'listAssistants.chatWithAssistant': 'Chat',
			};
			return dict[key] || key;
		},
	}),
}));

vi.mock('@/components/ui/input', () => ({
	Input: ({ type, placeholder, value, onChange, ...props }: any) => (
		<input
			type={type}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			data-testid="search-input"
			{...props}
		/>
	),
}));

vi.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>{children}</button>
	),
}));

vi.mock('@/components/ui/avatar', () => ({
	Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
	AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
	AvatarFallback: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
	Badge: ({ children }: any) => <div data-testid="badge">{children}</div>,
}));

vi.mock('@/assets/svgs', () => ({
	EnlaightBot: () => <div>Bot</div>,
}));

vi.mock('@/services/BotService', () => ({
	BotService: {
		list: vi.fn(() => Promise.resolve({
			results: [
				{ id: 'bot1', name: 'Data Analyst', description: 'Analyzes data', expertise_area: { id: 'exp1', name: 'Data Analysis' }, image: 'data-analyst.png', url_n8n: 'https://n8n.example.com/webhook/bot1' },
				{ id: 'bot2', name: 'Support Agent', description: 'Provides support', expertise_area: { id: 'exp2', name: 'Support' }, image: 'support.png', url_n8n: 'https://n8n.example.com/webhook/bot2' },
			],
			count: 2,
		})),
	},
}));

vi.mock('@/hooks/use-batch-translation', () => ({
	useBatchTranslation: () => ({ getTranslation: (text: string) => text }),
}));

vi.mock('@/contexts/AgentsChatContext', () => ({
	useAgentsChat: () => ({ openModal: vi.fn() }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return { ...actual, useNavigate: () => mockNavigate };
});

describe('AssistantList Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders title and description', async () => {
		render(<BrowserRouter><AssistantList /></BrowserRouter>);
		expect(await screen.findByText('Assistants')).toBeTruthy();
		expect(screen.getByText('Available assistants')).toBeTruthy();
	});

	it('renders assistant cards with names and descriptions', async () => {
		render(<BrowserRouter><AssistantList /></BrowserRouter>);
		expect(await screen.findByText('Data Analyst')).toBeTruthy();
		expect(screen.getByText('Support Agent')).toBeTruthy();
		expect(screen.getByText('Analyzes data')).toBeTruthy();
		expect(screen.getByText('Provides support')).toBeTruthy();
	});

	it('renders expertise badges', async () => {
		render(<BrowserRouter><AssistantList /></BrowserRouter>);
		await screen.findByText('Data Analyst');
		expect(screen.getAllByTestId('badge').length).toBeGreaterThan(0);
	});

	it('renders chat buttons for each assistant', async () => {
		render(<BrowserRouter><AssistantList /></BrowserRouter>);
		await screen.findByText('Data Analyst');
		expect(screen.getAllByRole('button', { name: /Chat/ }).length).toBeGreaterThan(0);
	});

	it('allows user to type in search input', async () => {
		const user = userEvent.setup();
		render(<BrowserRouter><AssistantList /></BrowserRouter>);
		const inputs = await screen.findAllByTestId('search-input');
		await user.type(inputs[0], 'Data');
		expect((inputs[0] as HTMLInputElement).value).toBe('Data');
	});
});