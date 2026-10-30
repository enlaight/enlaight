import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import QuickChartGraph from '@/components/QuickChartGraph';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/use-batch-translation', () => ({
	useBatchTranslation: (texts: string[]) => ({
		// Stand in for AWS Translate: prove the text goes through the hook.
		getTranslation: (s: string) => (texts.includes(s) ? `[tr]${s}` : s),
		loading: false,
	}),
}));

const bar = {
	type: 'bar',
	data: { labels: ['Prevention'], datasets: [{ label: 'Mentions', data: [42] }] },
	options: { plugins: { title: { display: true, text: 'Top concerning subtopics' } } },
};

describe('QuickChartGraph', () => {
	beforeEach(() => {
		globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake');
		globalThis.URL.revokeObjectURL = vi.fn();
		globalThis.fetch = vi.fn(async () => ({
			ok: true,
			status: 200,
			blob: async () => new Blob(['x'], { type: 'image/png' }),
		})) as any;
	});
	afterEach(() => vi.restoreAllMocks());

	it('asks QuickChart for Chart.js 4 so titles are not silently dropped', async () => {
		render(<QuickChartGraph content={bar} />);
		await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
		const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
		expect(body.version).toBe('4');
		expect(body.format).toBe('png');
	});

	it('offers download and share on a rendered chart, inside a stop-drag wrapper', async () => {
		const { container } = render(<QuickChartGraph content={bar} />);
		await waitFor(() => expect(container.querySelector('a[download]')).not.toBeNull());
		const link = container.querySelector('a[download]') as HTMLAnchorElement;
		expect(link.getAttribute('download')).toBe('Top_concerning_subtopics.png');
		expect(link.getAttribute('href')).toBe('blob:fake');
		expect(container.querySelector('.stop-drag')).not.toBeNull();
		expect(screen.getByText('dashboard.share')).toBeTruthy();
	});

	it('renders a table as DOM without calling QuickChart, translating its text', () => {
		render(
			<QuickChartGraph
				content={{
					type: 'table',
					columns: [{ key: 'n', title: 'Narrative' }],
					dataSource: [{ n: 'The vaccine causes infertility' }],
				}}
			/>
		);
		expect(globalThis.fetch).not.toHaveBeenCalled();
		expect(screen.getByText('[tr]Narrative')).toBeTruthy();
		expect(screen.getByText('[tr]The vaccine causes infertility')).toBeTruthy();
	});

	it('translates a KPI card title and leaves the number alone', () => {
		render(<QuickChartGraph content={{ type: 'card', title: 'Narratives Tracked', value: 80 }} />);
		expect(screen.getByText('[tr]Narratives Tracked')).toBeTruthy();
		expect(screen.getByText('80')).toBeTruthy();
	});
});
