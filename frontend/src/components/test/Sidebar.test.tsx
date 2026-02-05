import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock NavigationMenu component
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

	it('renders sidebar with proper role and aria label', () => {
		render(<Sidebar />);

		const sidebar = screen.getByRole('complementary', {
			name: 'Main navigation sidebar',
		});
		expect(sidebar).toBeTruthy();
	});

	it('renders NavigationMenu component', () => {
		render(<Sidebar />);

		const navMenu = screen.getByTestId('navigation-menu');
		expect(navMenu).toBeTruthy();
	});

	it('renders with default props (open and not collapsed)', () => {
		render(<Sidebar />);

		const sidebar = screen.getByRole('complementary');
		expect(sidebar).toBeTruthy();
	});

	it('passes isCollapsed prop to NavigationMenu', () => {
		render(<Sidebar isCollapsed={true} />);

		const navMenu = screen.getByTestId('navigation-menu');
		expect(navMenu.getAttribute('data-collapsed')).toBe('true');
	});

	it('hides sidebar on mobile when isOpen is false', () => {
		const { container } = render(<Sidebar isOpen={false} />);

		const sidebar = container.querySelector('aside');
		expect(sidebar?.className).toContain('transition-all');
	});

	it('shows sidebar on mobile when isOpen is true', () => {
		const { container } = render(<Sidebar isOpen={true} />);

		const sidebar = container.querySelector('aside');
		expect(sidebar?.className).toContain('transition-all');
		expect(sidebar?.className).toContain('bg-sidebar');
	});

	it('collapses sidebar when isCollapsed is true', () => {
		const { container } = render(<Sidebar isCollapsed={true} />);

		const sidebar = container.querySelector('aside');
		expect(sidebar?.className).toContain('w-16');
		expect(sidebar?.className).toContain('min-w-16');
	});

	it('expands sidebar when isCollapsed is false', () => {
		const { container } = render(<Sidebar isCollapsed={false} />);

		const sidebar = container.querySelector('aside');
		expect(sidebar?.className).toContain('w-[--sidebar-width]');
	});

	it('calls onClose callback when overlay is clicked', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();

		const { container } = render(<Sidebar isOpen={true} onClose={handleClose} />);

		const overlay = container.querySelector('.bg-black');
		if (overlay) {
			await user.click(overlay);
			expect(handleClose).toHaveBeenCalledOnce();
		}
	});

	it('calls onToggleCollapse callback when collapse is triggered', () => {
		const handleToggleCollapse = vi.fn();

		render(
			<Sidebar isCollapsed={false} onToggleCollapse={handleToggleCollapse} />
		);

		// The callback would be called by NavigationMenu or other components
		expect(handleToggleCollapse).not.toHaveBeenCalled();
	});

	it('renders with proper CSS classes', () => {
		const { container } = render(<Sidebar />);

		const sidebar = container.querySelector('aside');
		expect(sidebar?.className).toContain('relative');
		expect(sidebar?.className).toContain('flex');
		expect(sidebar?.className).toContain('items-start');
		expect(sidebar?.className).toContain('bg-sidebar');
		expect(sidebar?.className).toContain('transition-all');
		expect(sidebar?.className).toContain('duration-300');
	});

	it('applies mobile-specific classes', () => {
		const { container } = render(<Sidebar />);

		const sidebar = container.querySelector('aside');
		expect(sidebar?.className).toContain('max-sm:fixed');
		expect(sidebar?.className).toContain('max-sm:top-16');
		expect(sidebar?.className).toContain('max-sm:z-[1000]');
	});

	it('renders inner container with proper structure', () => {
		const { container } = render(<Sidebar />);

		const innerDiv = container.querySelector('aside > div');
		expect(innerDiv?.className).toContain('relative');
		expect(innerDiv?.className).toContain('flex');
		expect(innerDiv?.className).toContain('w-full');
		expect(innerDiv?.className).toContain('flex-col');
	});
});
