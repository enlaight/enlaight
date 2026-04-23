import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentsCard } from '../AgentsCard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/assets/data-analyst.png', () => ({ default: 'data-analyst.png' }));
vi.mock('@/assets/support-assistant.png', () => ({ default: 'support-assistant.png' }));
vi.mock('@/assets/tech-expert.png', () => ({ default: 'tech-expert.png' }));

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
		expect(screen.getByText('Data Science')).toBeTruthy();
		expect(screen.getByText('Expert in machine learning')).toBeTruthy();
	});

	it('calls onClick handler when button is clicked', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();
		render(<AgentsCard onClick={handleClick} />);
		await user.click(screen.getByRole('button', { name: 'home.newChat' }));
		expect(handleClick).toHaveBeenCalledOnce();
	});

	it('truncates long description with line-clamp-3', () => {
		const longDesc = 'This is a very long description that should be truncated. '.repeat(5);
		render(<AgentsCard desc={longDesc} />);
		const description = screen.getByText(new RegExp(longDesc.slice(0, 50)));
		expect(description.className).toContain('line-clamp-3');
	});
});