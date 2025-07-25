import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChartComponent } from "./PieChartComponent";

export const DashboardStats = () => {
	return (
		<div className="grid gap-4  w-full">
			{/* Expenses Card */}
			<Card className="bg-white shadow-md border border-[#E2E4E9]">
				<CardHeader>
					<CardTitle>Expenses</CardTitle>
				</CardHeader>
				<CardContent>
					<PieChartComponent />
				</CardContent>
			</Card>
		</div>
	);
};
