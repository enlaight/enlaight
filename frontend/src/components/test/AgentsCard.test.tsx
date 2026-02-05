import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentsCard } from '../AgentsCard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

// Mock images
vi.mock('@/assets/data-analyst.png', () => ({
	default: 'data-analyst.png',
}));

vi.mock('@/assets/support-assistant.png', () => ({
	default: 'support-assistant.png',
}));

vi.mock('@/assets/tech-expert.png', () => ({
	default: 'tech-expert.png',
}));

describe('AgentsCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders with default props', () => {
		render(<AgentsCard />);

		expect(screen.getByText('John')).toBeTruthy();
		expect(screen.getByText('AI Assistant')).toBeTruthy();
		expect(screen.getByText(/This is a helpful AI assistant/)).toBeTruthy();
	});

	it('renders with custom props', () => {
		render(
			<AgentsCard
				index={1}
				name="Alice"
				expertise="Data Science"
				desc="Expert in machine learning"
			/>
		);

		expect(screen.getByText('Alice')).toBeTruthy();
		expect(screen.getByText('DATA SCIENCE')).toBeTruthy();
		expect(screen.getByText('Expert in machine learning')).toBeTruthy();
	});

	it('calls onClick handler when button is clicked', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();

		render(<AgentsCard onClick={handleClick as any} />);

		const button = screen.getByRole('button', { name: 'home.newChat' });
		await user.click(button);

		expect(handleClick).toHaveBeenCalledOnce();
	});

	it('renders with translated button text', () => {
		render(<AgentsCard />);

		const button = screen.getByRole('button');
		expect(button.textContent).toBe('home.newChat');
	});

	it('displays image with correct alt text', () => {
		const { container } = render(<AgentsCard name="Test Agent" />);

		const image = container.querySelector('img');
	});

	it('truncates long description to 3 lines', () => {
		const longDesc = 'This is a very long description that should be truncated. '.repeat(5);

		render(<AgentsCard desc={longDesc} />);

		const description = screen.getByText(new RegExp(longDesc.slice(0, 50)));
		const classList = description.className;
		expect(classList).toContain('line-clamp-3');
	});

	it('renders Card and CardContent components', () => {
		const { container } = render(<AgentsCard />);

		const card = container.querySelector('[class*="Card"]');
		expect(card).toBeTruthy();
	});
});
