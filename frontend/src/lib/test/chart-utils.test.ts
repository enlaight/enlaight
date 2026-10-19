import { describe, it, expect } from 'vitest';
import { chartImageUrl, summariseChart } from '@/lib/chart-utils';

const bar = {
	type: 'bar',
	data: {
		labels: ['Prevention', 'Spread'],
		datasets: [{ label: 'Number of mentions', data: [42, 31] }],
	},
	options: { plugins: { title: { display: true, text: 'Top concerning subtopics' } } },
};

describe('chartImageUrl', () => {
	it('builds an absolute /charts URL carrying v=4 and format=png', () => {
		const url = chartImageUrl(bar)!;
		expect(url.startsWith('/charts/chart?')).toBe(true);
		const qs = new URLSearchParams(url.split('?')[1]);
		expect(qs.get('v')).toBe('4');
		expect(qs.get('format')).toBe('png');
		expect(JSON.parse(qs.get('c')!).options.plugins.title.text).toBe('Top concerning subtopics');
	});

	it('returns null for the content types that render as DOM', () => {
		expect(chartImageUrl({ type: 'card', title: 'Narratives', value: 80 })).toBeNull();
		expect(chartImageUrl({ type: 'table', columns: [], dataSource: [], data: {} })).toBeNull();
		expect(chartImageUrl({ type: 'markdown', markdown: '# hi', data: {} })).toBeNull();
		expect(chartImageUrl({ type: 'wordcloud', text: 'a b c', data: {} })).toBeNull();
		expect(chartImageUrl(null)).toBeNull();
	});
});

describe('summariseChart', () => {
	it('flattens title, labels and numbers and drops styling keys', () => {
		const out = summariseChart(bar);
		expect(out).toBe('Top concerning subtopics\nNumber of mentions — Prevention: 42, Spread: 31');
		expect(out).not.toContain('borderColor');
	});

	it('summarises a KPI card', () => {
		expect(summariseChart({ type: 'card', title: 'Narratives Tracked', value: 80 }))
			.toBe('Narratives Tracked: 80');
	});

	it('returns an empty string for nothing', () => {
		expect(summariseChart(null)).toBe('');
	});
});
