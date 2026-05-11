import { Component, ReactNode, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Chart as ChartJS, registerables } from "chart.js";
import { SankeyController, Flow } from "chartjs-chart-sankey";
import { Chart } from "react-chartjs-2";
import { Card } from "@/components/ui/card";

ChartJS.register(...registerables, SankeyController, Flow);

function QuickChartRenderer({ content }: { content: any }) {
	const { t } = useTranslation();
	const [url, setUrl] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const contentKey = useMemo(() => JSON.stringify(content ?? null), [content]);
	const isTable = content?.type === "table";
	const isMarkdown = content?.type === "markdown";
	const isSankey = content?.type === "sankey";
	const isWordcloud = content?.type === "wordcloud";

	useEffect(() => {
		if (isTable || isMarkdown || isSankey) return;

		const parsed = JSON.parse(contentKey);
		if (!parsed) return;

		const payload = parsed;

		let cancelled = false;

		async function generate() {
			setLoading(true);
			setError(false);
			try {
				let endpoint = "charts/chart";
				let body: any = { chart: payload, format: "png" };
				if (isWordcloud) {
					const { type: _type, ...rest } = payload;
					endpoint = "quickchart-public/wordcloud";
					body = { format: "png", ...rest };
				}

				const response = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(body),
				});

				if (cancelled) return;
				if (!response.ok) throw new Error(`QuickChart ${response.status}`);

				const blob = await response.blob();
				const objectUrl = URL.createObjectURL(blob);
				setUrl(objectUrl);
				setLoading(false);
			} catch (err) {
				console.error("Failed to generate output", err);
				if (!cancelled) {
					setError(true);
					setLoading(false);
				}
			}
		}

		generate();

		return () => {
			cancelled = true;
		};
	}, [contentKey, isTable, isMarkdown, isSankey, isWordcloud]);

	useEffect(() => {
		return () => {
			if (url.startsWith("blob:")) URL.revokeObjectURL(url);
		};
	}, [url]);

	if (content?.type === "card") {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center text-center gap-2 p-4">
				<div className="text-5xl font-bold leading-none">{content?.value}</div>
				<div className="text-sm text-muted-foreground">{content?.title}</div>
			</div>
		);
	}

	if (isMarkdown) {
		return (
			<div className="max-w-full max-h-full overflow-auto prose prose-sm">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>
					{content?.markdown ?? ""}
				</ReactMarkdown>
			</div>
		);
	}

	if (isSankey) {
		const datasets = content?.data?.datasets ?? [];
		return (
			<div className="w-full h-full">
				<Chart
					type="sankey"
					data={{ datasets }}
					options={content?.options ?? {}}
				/>
			</div>
		);
	}

	if (isTable) {
		const columns = content?.columns ?? [];
		const dataSource = content?.dataSource ?? [];

		return (
			<div className="max-w-full max-h-full overflow-auto">
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr>
							{columns.map((col: any) => (
								<th
									key={col.key}
									className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold"
								>
									{col.title}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{dataSource.map((row: any, rowIndex: number) => (
							<tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
								{columns.map((col: any) => (
									<td
										key={col.key}
										className="border border-gray-300 px-3 py-2"
									>
										{row[col.key]}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	if (error) return (
		<Card className="w-full h-full flex items-center justify-center">
			<div className="font-normal text-muted-foreground text-sm text-center px-4">
				Error generating graphic, check the console
			</div>
		</Card>
	);

	if (!url || loading) return (
		<Card className="w-full h-full flex items-center justify-center">
		<div className="flex flex-col gap-5 w-[50%] items-center justify-center text-center">
			<div className="flex items-center justify-center bg-secondary rounded-full p-5">
			<Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
			</div>
			<div className="font-normal text-muted-foreground text-sm">{t('dashboard.loadingData')}</div>
		</div>
    </Card>
	);

	return (
		<div className="flex max-w-full max-h-full">
			<img
				src={url}
				alt="Chart"
				onError={(e) => {
					console.error("Failed to render chart image", e);
					setError(true);
				}}
			/>
		</div>
	);

}

class QuickChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error: unknown, info: unknown) {
		console.error("QuickChartGraph crashed", error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<Card className="w-full h-full flex items-center justify-center">
					<div className="font-normal text-muted-foreground text-sm text-center px-4">
						Error generating graphic, check the console
					</div>
				</Card>
			);
		}
		return this.props.children;
	}
}

const QuickChartGraph = (props: { content: any }) => (
	<QuickChartErrorBoundary>
		<QuickChartRenderer {...props} />
	</QuickChartErrorBoundary>
);

export default QuickChartGraph;
