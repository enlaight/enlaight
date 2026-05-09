import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

function QuickChartRenderer({ content }: { content: any }) {
	const { t } = useTranslation();
	const [url, setUrl] = useState("");
	const [loading, setLoading] = useState(true);

	const contentKey = useMemo(() => JSON.stringify(content ?? null), [content]);
	const isTable = content?.type === "table";

	useEffect(() => {
		if (isTable) return;

		const parsed = JSON.parse(contentKey);
		if (!parsed) return;

		const payload = parsed;

		let cancelled = false;

		async function generate() {
			setLoading(true);
			try {
				const response = await fetch("charts/chart", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ chart: payload, format: "png" }),
				});

				if (cancelled) return;
				if (!response.ok) throw new Error(`QuickChart ${response.status}`);

				const blob = await response.blob();
				const objectUrl = URL.createObjectURL(blob);
				setUrl(objectUrl);
				setLoading(false);
			} catch (err) {
				console.error("Failed to generate output", err);
			}
		}

		generate();

		return () => {
			cancelled = true;
		};
	}, [contentKey, isTable]);

	useEffect(() => {
		return () => {
			if (url.startsWith("blob:")) URL.revokeObjectURL(url);
		};
	}, [url]);

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
			<img src={url} alt="Chart" />
		</div>
	);

}

export default QuickChartRenderer;
