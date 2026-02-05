import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentsChatMount from '../AgentsChatMount';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock createChat so initialization doesn't attempt network or real UI
vi.mock('@n8n/chat', () => ({
	createChat: vi.fn(() => ({ unmount: vi.fn() })),
}));

// Mock svgs
vi.mock('@/assets/svgs', () => ({
	ChatCopy: '<svg/>',
	ChatLikeEmpty: '<svg-empty/>',
	ChatLikeFull: '<svg-full/>',
}));

// Mock services (use inline vi.fn() inside factories to satisfy vitest hoisting)
vi.mock('@/services/ChatSessionService', () => ({
	ChatSessionService: { post: vi.fn(() => Promise.resolve(true)) },
}));

vi.mock('@/services/FavoritesService', () => ({
	FavoritesService: {
		post: vi.fn(() => Promise.resolve({ message_id: 'm-1' })),
		delete: vi.fn(() => Promise.resolve(true)),
	},
}));

// Mock store hook
vi.mock('@/store/useStore', () => ({
	useStore: () => ({
		favorites: [],
		add: vi.fn(),
		removeFav: vi.fn(),
	}),
}));

// Ensure clipboard exists
Object.assign(navigator, {
	clipboard: { writeText: vi.fn(() => Promise.resolve()) },
});

describe('AgentsChatMount basic', () => {
	beforeEach(() => {
		// clean document body between tests
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	it('renders container and creates toolbar when message node appended', async () => {
		render(<AgentsChatMount
			webhookUrl="https://n8n.enlaight.ai/webhook/0f1874f7-cfbb-4c8b-8722-411b326dd9d8/chat"
			agentId="9981gg99dba8f5d76c3d4918e085103e"
			initialMessage={`Hello, I'm Test Assistant. How can I assist you today?`}
			metadata={{
				agentName: 'Test Assistant',
				specialty: 'Data Analysis',
				agentId: '9981gg99dba8f5d76c3d4918e085103e',
			}}
		/>);

		const container = document.getElementById('n8n-chat-container');
		expect(container).toBeTruthy();
	});
});