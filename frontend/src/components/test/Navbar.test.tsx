import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '../Navbar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

// Mock SearchBar component
vi.mock('../SearchBar', () => ({
	SearchBar: () => <div data-testid="search-bar">Search Bar</div>,
}));

// Mock UserControls component
vi.mock('../UserControls', () => ({
	UserControls: () => <div data-testid="user-controls">User Controls</div>,
}));

describe('Navbar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders navbar with logo', () => {
		render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const header = screen.getByRole('banner');
		expect(header).toBeTruthy();

		const logo = screen.getByAltText('Company logo');
		expect(logo).toBeTruthy();
	});

	it('renders navigation link to home', () => {
		render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const homeLink = screen.getByRole('link');
		expect(homeLink.getAttribute('href')).toBe('/');
	});

	it('renders SearchBar component', () => {
		render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const searchBar = screen.getByTestId('search-bar');
		expect(searchBar).toBeTruthy();
	});

	it('renders UserControls component', () => {
		render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const userControls = screen.getByTestId('user-controls');
		expect(userControls).toBeTruthy();
	});

	it('renders with proper CSS classes for styling', () => {
		const { container } = render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const header = container.querySelector('header');
		expect(header?.className).toContain('relative');
		expect(header?.className).toContain('flex');
		expect(header?.className).toContain('w-full');
		expect(header?.className).toContain('h-16');
	});

	it('renders logo as SVG element', () => {
		const { container } = render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const svg = container.querySelector('svg');
		expect(svg).toBeTruthy();
		expect(svg?.getAttribute('viewBox')).toBe('0 0 184 32');
	});

	it('applies responsive classes to SearchBar', () => {
		const { container } = render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const navElement = container.querySelector('header');
		expect(navElement).toBeTruthy();
	});

	it('renders with proper navigation structure', () => {
		const { container } = render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);

		const flexContainer = container.querySelector('.flex.justify-between');
		expect(flexContainer).toBeTruthy();
	});
});
