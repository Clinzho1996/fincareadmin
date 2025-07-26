"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker"; // Import your DateRangePicker
import axios from "axios";
import { format } from "date-fns";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Progress } from "./ui/progress";
import { Skeleton } from "./ui/skeleton";

function FinanceReport() {
	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: new Date(), // Default start date (today)
		to: new Date(new Date().setDate(new Date().getDate() + 7)), // Default end date (7 days from today)
	});
	const [financeData, setFinanceData] = useState<{
		totalRevenue: string;
		totalWithdrawal: string;
		subscriptions: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

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

			const session = await getSession();
			console.log("session", session);

			const accessToken = session?.accessToken;
			if (!accessToken) {
				console.error("No access token found.");
				setIsLoading(false);
				return;
			}

			const response = await axios.post(
				"https://api.comicscrolls.com/api/v1/analytics/admin/transaction-summary",
				{
					start_date: format(startDate, "yyyy-MM-dd"), // Format as YYYY-MM-DD
					end_date: format(endDate, "yyyy-MM-dd"), // Format as YYYY-MM-DD
				},
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			if (response.data.status === "success") {
				setFinanceData(response.data.data);
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
	}, [dateRange]);

	return (
		<div className="p-3 bg-white rounded-lg border border-[#E2E4E9] w-full">
			{isLoading ? (
				<div className="flex flex-col justify-start items-center">
					<div className="flex items-center space-x-4 ">
						<Skeleton className="h-12 w-12 rounded-full bg-gray-500" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-[300px] bg-gray-500" />
							<Skeleton className="h-4 w-[350px] bg-gray-500" />
						</div>
					</div>
					<div className="flex items-center space-x-4">
						<Skeleton className="h-12 w-12 rounded-full bg-gray-500" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-[300px] bg-gray-500" />
							<Skeleton className="h-4 w-[350px] bg-gray-500" />
						</div>
					</div>
				</div>
			) : (
				<>
					<div className="flex flex-row justify-between items-center">
						<p className="text-sm font-bold text-black">Finance</p>
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
								₦{financeData?.totalRevenue || "0.00"}
							</p>
						</div>
						<Progress
							value={75} // You can replace this with a dynamic value if available
							className="w-full bg-[#f4f4f5] [&>div]:bg-[#22c55e]"
						/>
					</div>
					<div className="flex flex-col gap-3 mt-10">
						<div className="flex flex-row justify-between items-center">
							<p className="text-xs text-[#18181b] font-normal">
								Total Withdrawal
							</p>
							<p className="text-xs text-[#18181b] font-normal">
								₦{financeData?.totalWithdrawal || "0.00"}
							</p>
						</div>
						<Progress
							value={62} // You can replace this with a dynamic value if available
							className="w-full bg-[#f4f4f5] [&>div]:bg-[#dba111]"
						/>
					</div>
					<div className="flex flex-col gap-3 mt-10">
						<div className="flex flex-row justify-between items-center">
							<p className="text-xs text-[#18181b] font-normal">
								Total Subscription
							</p>
							<p className="text-xs text-[#18181b] font-normal">
								{financeData?.subscriptions || "0.00"}
							</p>
						</div>
						<Progress
							value={33} // You can replace this with a dynamic value if available
							className="w-full bg-[#f4f4f5] [&>div]:bg-[#6e3ff3]"
						/>
					</div>
				</>
			)}
		</div>
	);
}

export default FinanceReport;
