"use client";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from "recharts";

const data = [
	{ name: "Detergent", value: 54, color: "#3b82f6" },
	{ name: "Repairs", value: 12, color: "#10b981" },
	{ name: "Water", value: 12, color: "#f59e0b" },
	{ name: "Other", value: 22, color: "#6b7280" },
];

export const PieChartComponent = () => {
	return (
		<ResponsiveContainer width="105%" height={300}>
			<PieChart>
				<Pie
					data={data}
					cx="50%"
					cy="50%"
					labelLine={false}
					outerRadius={80}
					fill="#8884d8"
					dataKey="value"
					label={({ name, percent }) =>
						`${name}: ${(percent * 100).toFixed(0)}%`
					}>
					{data.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={entry.color} />
					))}
				</Pie>
				<Legend />
			</PieChart>
		</ResponsiveContainer>
	);
};
