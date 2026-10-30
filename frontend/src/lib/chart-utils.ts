/** Helpers for handing a dashboard chart to something other than the dashboard. */

const IMAGELESS_TYPES = ["card", "table", "markdown", "wordcloud"];

/**
 * Build a QuickChart image URL for a Chart.js config, or null when the content
 * is not one (cards, tables, markdown, word clouds render as DOM instead).
 *
 * The path is absolute on purpose. Traefik routes `PathPrefix(/charts)` to the
 * self-hosted renderer and the Vite dev server proxies the same prefix, so a
 * relative "charts/chart" only resolves correctly from a one-segment route.
 *
 * `v=4` matters: without it QuickChart renders with Chart.js 2.9.4, which
 * ignores `options.plugins.title` and `options.indexAxis`.
 */
export const chartImageUrl = (content: any): string | null => {
	if (!content || !content.type || !content.data) return null;
	if (IMAGELESS_TYPES.includes(content.type)) return null;
	const qs = new URLSearchParams({
		c: JSON.stringify(content),
		v: "4",
		format: "png",
	});
	return `/charts/chart?${qs.toString()}`;
};

/**
 * Flatten a chart config into the few lines an assistant can reason about:
 * the title, the labels and the numbers. Pasting the raw config instead gave
 * the model a wall of styling keys and gave the user no chart.
 */
export const summariseChart = (content: any): string => {
	if (!content) return "";
	if (content.type === "card") {
		return `${content.title ?? "Value"}: ${content.value}`;
	}
	const title = content?.options?.plugins?.title?.text ?? "";
	const labels: string[] = content?.data?.labels ?? [];
	const sets: any[] = content?.data?.datasets ?? [];
	const lines = sets.map((d) => {
		const pairs = labels.map((l, i) => `${l}: ${d.data?.[i]}`).join(", ");
		return `${d.label ?? "series"} — ${pairs}`;
	});
	return [title, ...lines].filter(Boolean).join("\n");
};
