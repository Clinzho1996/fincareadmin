"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Progress } from "./ui/progress";
import { Skeleton } from "./ui/skeleton";

interface FinanceData {
	totalRevenue: number;
	totalWithdrawal: number;
	totalSavings: number;
	totalInvestment: number;
	pendingWithdrawals: number;
	completedWithdrawals: number;
}

function FinanceReport() {
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: new Date(new Date().setDate(new Date().getDate() - 30)), // Default: last 30 days
		to: new Date(),
	});
	const [financeData, setFinanceData] = useState<FinanceData | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { data: session } = useSession();

	// Fetch finance data based on the selected date range
	const fetchFinanceData = async (
		startDate: Date | undefined,
		endDate: Date | undefined
	) => {
		try {
			setIsLoading(true);

			if (!startDate || !endDate) {
				console.error("Start date or end date is missing.");
				setIsLoading(false);
				return;
			}

			if (!session?.accessToken) {
				console.error("No access token found.");
				setIsLoading(false);
				return;
			}

			// Format dates for API
			const formatDate = (date: Date) => date.toISOString().split("T")[0];

			const response = await fetch(
				`/api/admin/analytics/finance?startDate=${formatDate(
					startDate
				)}&endDate=${formatDate(endDate)}`,
				{
					headers: {
						Authorization: `Bearer ${session.accessToken}`,
					},
				}
			);

			if (!response.ok) {
				throw new Error("Failed to fetch finance data");
			}

			const data = await response.json();

			if (data.status === "success") {
				setFinanceData(data.data);
			}
		} catch (error) {
			console.error("Error fetching finance data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch data when the date range changes
	useEffect(() => {
		if (dateRange?.from && dateRange?.to) {
			fetchFinanceData(dateRange.from, dateRange.to);
		}
	}, [dateRange, session]);

	// Format currency
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	// Calculate progress percentages
	const calculateProgress = (current: number, total: number) => {
		if (total === 0) return 0;
		return (current / total) * 100;
	};

	return (
		<div className="p-3 bg-white rounded-lg border border-[#E2E4E9] w-full">
			{isLoading ? (
				<div className="flex flex-col justify-start items-center space-y-4">
					<div className="flex items-center space-x-4 w-full">
						<Skeleton className="h-12 w-12 rounded-full bg-gray-300" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-full bg-gray-300" />
							<Skeleton className="h-4 w-3/4 bg-gray-300" />
						</div>
					</div>
					<div className="flex items-center space-x-4 w-full">
						<Skeleton className="h-12 w-12 rounded-full bg-gray-300" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-full bg-gray-300" />
							<Skeleton className="h-4 w-2/3 bg-gray-300" />
						</div>
					</div>
					<div className="flex items-center space-x-4 w-full">
						<Skeleton className="h-12 w-12 rounded-full bg-gray-300" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-full bg-gray-300" />
							<Skeleton className="h-4 w-1/2 bg-gray-300" />
						</div>
					</div>
				</div>
			) : (
				<>
					<div className="flex flex-row justify-between items-center">
						<p className="text-sm font-bold text-black">Finance Report</p>
						<div className="flex flex-row justify-end gap-3 items-center">
							<DateRangePicker
								dateRange={dateRange}
								onSelect={(range) => setDateRange(range)}
							/>
						</div>
					</div>

					<div className="flex flex-col gap-3 mt-5">
						<div className="flex flex-row justify-between items-center">
							<p className="text-xs text-[#18181b] font-normal">
								Total Revenue
							</p>
							<p className="text-xs text-[#18181b] font-normal">
								{financeData
									? formatCurrency(financeData.totalRevenue)
									: "₦0.00"}
							</p>
						</div>
						<Progress
							value={calculateProgress(
								financeData?.totalRevenue || 0,
								Math.max(
									financeData?.totalRevenue || 1,
									financeData?.totalWithdrawal || 1,
									1
								)
							)}
							className="w-full bg-[#f4f4f5] [&>div]:bg-[#22c55e]"
						/>
					</div>

					<div className="flex flex-col gap-3 mt-5">
						<div className="flex flex-row justify-between items-center">
							<p className="text-xs text-[#18181b] font-normal">
								Total Withdrawals
							</p>
							<p className="text-xs text-[#18181b] font-normal">
								{financeData
									? formatCurrency(financeData.totalWithdrawal)
									: "₦0.00"}
							</p>
						</div>
						<div className="text-xs text-gray-500">
							{financeData?.completedWithdrawals} completed,{" "}
							{financeData?.pendingWithdrawals} pending
						</div>
						<Progress
							value={calculateProgress(
								financeData?.totalWithdrawal || 0,
								Math.max(
									financeData?.totalRevenue || 1,
									financeData?.totalWithdrawal || 1,
									1
								)
							)}
							className="w-full bg-[#f4f4f5] [&>div]:bg-[#dba111]"
						/>
					</div>

					<div className="flex flex-col gap-3 mt-5">
						<div className="flex flex-row justify-between items-center">
							<p className="text-xs text-[#18181b] font-normal">
								Total Savings
							</p>
							<p className="text-xs text-[#18181b] font-normal">
								{financeData
									? formatCurrency(financeData.totalSavings)
									: "₦0.00"}
							</p>
						</div>
						<Progress
							value={calculateProgress(
								financeData?.totalSavings || 0,
								Math.max(
									financeData?.totalSavings || 1,
									financeData?.totalInvestment || 1,
									1
								)
							)}
							className="w-full bg-[#f4f4f5] [&>div]:bg-[#3b82f6]"
						/>
					</div>

					<div className="flex flex-col gap-3 mt-5">
						<div className="flex flex-row justify-between items-center">
							<p className="text-xs text-[#18181b] font-normal">
								Total Investment
							</p>
							<p className="text-xs text-[#18181b] font-normal">
								{financeData
									? formatCurrency(financeData.totalInvestment)
									: "₦0.00"}
							</p>
						</div>
						<Progress
							value={calculateProgress(
								financeData?.totalInvestment || 0,
								Math.max(
									financeData?.totalSavings || 1,
									financeData?.totalInvestment || 1,
									1
								)
							)}
							className="w-full bg-[#f4f4f5] [&>div]:bg-[#6e3ff3]"
						/>
					</div>
				</>
			)}
		</div>
	);
}

export default FinanceReport;
