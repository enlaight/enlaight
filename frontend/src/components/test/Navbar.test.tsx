import { render, screen } from '@testing-library/react';
import { Navbar } from '../Navbar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../SearchBar', () => ({
	SearchBar: () => <div data-testid="search-bar">Search Bar</div>,
}));

vi.mock('../UserControls', () => ({
	UserControls: () => <div data-testid="user-controls">User Controls</div>,
}));

describe('Navbar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders header with logo linking to home', () => {
		render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);
		expect(screen.getByRole('banner')).toBeTruthy();
		expect(screen.getByLabelText('Company logo')).toBeTruthy();
		expect(screen.getByRole('link').getAttribute('href')).toBe('/');
	});

	it('renders SearchBar and UserControls', () => {
		render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>
		);
		expect(screen.getAllByTestId('search-bar').length).toBeGreaterThan(0);
		expect(screen.getByTestId('user-controls')).toBeTruthy();
	});
});