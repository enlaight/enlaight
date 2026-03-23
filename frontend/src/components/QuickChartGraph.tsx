import React from "react";

function QuickChartGraph({ data }) {
	const exampleData = {
		type: "bar",
		data: {
			labels: ["Jan", "Feb", "Mar", "Apr",],
			datasets: [
				{
					label: "Sales",
					data: [10, 20, 15, 30, 0, 25],
					backgroundColor: "#fac114",
				},
				{
					label: "Another Dataset",
					data: [5, 15, 10, 25, 0, 20],
					backgroundColor: "#14aafc",
				}
			],
		},
	};

	const chartUrl = `http://localhost:8001/chart?c=${encodeURIComponent(
		JSON.stringify(exampleData)
	)}`;

	return (
		<div>
			<img src={chartUrl} alt="Chart" />
		</div>
	);
}

export default QuickChartGraph;