import React from "react";

// const exampleData = {
// 	type: "bar", // line, pie, bar, doughnut, radar, polarArea
// 	data: {
// 		labels: ["Jan", "Feb", "Mar", "Apr",],
// 		datasets: [
// 			{
// 				label: "Sales",
// 				data: [10, 20, 15, 30, 0, 25],
// 				backgroundColor: "#fac114",
// 			},
// 			{
// 				label: "Another Dataset",
// 				data: [5, 15, 10, 25, 0, 20],
// 				backgroundColor: "#14aafc",
// 			}
// 		],
// 	},
// };

function QuickChartGraph({ data }: { data: any }) {
	const chartUrl = `charts/chart?c=${encodeURIComponent(
		JSON.stringify(data)
	)}`;

	return (
		<div>
			<img src={chartUrl} alt="Chart" />
		</div>
	);
}

export default QuickChartGraph;