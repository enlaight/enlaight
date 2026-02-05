import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import LoadingAnimation from '../LoadingAnimation';

describe('LoadingAnimation', () => {
	it('renders default animation and text', () => {
		render(<LoadingAnimation text="Loading now" />);
		expect(screen.getByText('Loading now')).toBeTruthy();
	});

	it('renders custom icon when provided', () => {
		render(<LoadingAnimation icon={<div data-testid="custom-icon">ICON</div>} />);
		expect(screen.getByTestId('custom-icon')).toBeTruthy();
	});
});
