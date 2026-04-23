import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../NavigationMenu', () => ({
	NavigationMenu: ({ isCollapsed }: { isCollapsed?: boolean }) => (
		<nav data-testid="navigation-menu" data-collapsed={isCollapsed}>
			Navigation Menu
		</nav>
	),
}));

describe('Sidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders sidebar with complementary role and aria label', () => {
		render(<Sidebar />);
		expect(screen.getByRole('complementary', { name: 'Main navigation sidebar' })).toBeTruthy();
	});

	it('renders NavigationMenu', () => {
		render(<Sidebar />);
		expect(screen.getByTestId('navigation-menu')).toBeTruthy();
	});

	it('passes isCollapsed prop to NavigationMenu', () => {
		render(<Sidebar isCollapsed={true} />);
		expect(screen.getByTestId('navigation-menu').getAttribute('data-collapsed')).toBe('true');
	});

	it('uses collapsed width when isCollapsed is true', () => {
		const { container } = render(<Sidebar isCollapsed={true} />);
		expect(container.querySelector('aside')?.className).toContain('w-16');
	});

	it('uses full width when isCollapsed is false', () => {
		const { container } = render(<Sidebar isCollapsed={false} />);
		expect(container.querySelector('aside')?.className).toContain('w-[--sidebar-width]');
	});

	it('calls onClose when overlay is clicked', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		const { container } = render(<Sidebar isOpen={true} onClose={handleClose} />);
		const overlay = container.querySelector('.bg-black');
		if (overlay) {
			await user.click(overlay);
			expect(handleClose).toHaveBeenCalledOnce();
		}
	});
});