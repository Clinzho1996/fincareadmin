"use client";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "@/components/ui/chart";
import { IconRectangleFilled } from "@tabler/icons-react";
import axios from "axios";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";

const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

interface ApiResponse {
	status: string;
	message: string;
	data: {
		[month: string]: {
			totalAuthors: number;
			totalReaders: number;
		};
	};
}

function SalesTracker() {
	const [chartData, setChartData] = useState<
		{ month: string; totalAuthors: number; totalReaders: number }[]
	>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [selectedYear, setSelectedYear] = useState<string>(
		new Date().getFullYear().toString()
	);

	const fetchTransactionData = async () => {
		try {
			setIsLoading(true);
			const session = await getSession();

			console.log("session", session);

			const accessToken = session?.accessToken;
			if (!accessToken) {
				console.error("No access token found.");
				setIsLoading(false);
				return;
			}

			const response = await axios.post<ApiResponse>(
				`https://api.comicscrolls.com/api/v1/analytics/admin/sign-up-per-month`,
				{ year: selectedYear },
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				}
			);

			// Extract the data for each month
			const formattedData = months.map((month) => ({
				month,
				totalAuthors: response.data.data[month]?.totalAuthors || 0,
				totalReaders: response.data.data[month]?.totalReaders || 0,
			}));

			console.log("Transaction Data:", formattedData);
			setChartData(formattedData);
		} catch (error) {
			console.error("Error fetching transaction data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchTransactionData();
	}, [selectedYear]);

	const chartConfig = {
		Authors: {
			label: "Total Customers",
			color: "hsl(var(--chart-1))",
		},
		Readers: {
			label: "Total Orders",
			color: "hsl(var(--chart-2))",
		},
	} satisfies ChartConfig;

	return (
		<div className=" p-3 bg-white rounded-lg border border-[#E2E4E9] w-full">
			{isLoading ? (
				<div className="flex flex-col justify-start items-center">
					<div className="flex items-center space-x-4 ">
						<Skeleton className="h-12 w-12 rounded-full bg-gray-500" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-[500px] bg-gray-500" />
							<Skeleton className="h-4 w-[500px] bg-gray-500" />
						</div>
					</div>
					<div className="flex items-center space-x-4">
						<Skeleton className="h-12 w-12 rounded-full bg-gray-500" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-[500px] bg-gray-500" />
							<Skeleton className="h-4 w-[500px] bg-gray-500" />
						</div>
					</div>
				</div>
			) : (
				<div>
					<div className="flex flex-col lg:flex-row justify-between items-center border-b-[1px] border-b-[#E2E4E9] py-2">
						<div className="flex flex-row justify-start gap-2 items-center">
							<Image src="/images/info.png" alt="info" width={20} height={20} />
							<p className="text-sm font-bold text-black">Report Tracker</p>
						</div>
						<div className="flex flex-row justify-end gap-3 items-center">
							<Select onValueChange={setSelectedYear}>
								<SelectTrigger className="w-[120px]">
									<SelectValue placeholder="Select Year" />
								</SelectTrigger>
								<SelectContent className="bg-white">
									<SelectGroup className="bg-white">
										{Array.from({ length: 3 }, (_, i) => (
											<SelectItem
												key={i}
												value={(new Date().getFullYear() - i).toString()}>
												{new Date().getFullYear() - i}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="py-3 h-fit">
						<ChartContainer config={chartConfig}>
							<LineChart
								height={200}
								accessibilityLayer
								data={chartData}
								margin={{
									top: 10,
									left: 12,
									right: 12,
									bottom: 10,
								}}>
								<CartesianGrid vertical={false} horizontal={true} />
								<XAxis
									dataKey="month"
									tickLine={false}
									axisLine={false}
									tickMargin={1}
									tickFormatter={(value) => value.slice(0, 3)}
								/>
								<ChartTooltip
									cursor={{ stroke: "#ccc", strokeWidth: 1 }}
									content={({ payload, label }) => {
										if (!payload || payload.length === 0) return null;
										const authors = payload.find(
											(p) => p.dataKey === "totalAuthors"
										)?.value;
										const readers = payload.find(
											(p) => p.dataKey === "totalReaders"
										)?.value;
										return (
											<div className="custom-tooltip p-3 bg-white border-[1px] shadow-lg border-[#E4E4E7] rounded-lg w-[280px]">
												<p className="text-center font-bold font-inter">
													{label}
												</p>
												<div className="flex flex-row flex-wrap mt-3 gap-5 justify-center items-center">
													<div>
														<p className="text-bold font-inter text-xs text-center">
															{authors}
														</p>
														<div className="flex flex-row justify-start items-center gap-1">
															<IconRectangleFilled size={10} color="#098E09" />
															<p className="text-dark-1">Total Users</p>
														</div>
													</div>
													<div>
														<p className="text-bold font-inter text-xs text-center">
															{readers}
														</p>
														<div className="flex flex-row justify-start items-center gap-1">
															<IconRectangleFilled size={10} color="#6E3FF3" />
															<p className="text-dark-1">Total Loans</p>
														</div>
													</div>
												</div>
											</div>
										);
									}}
								/>
								<Line
									dataKey="totalAuthors"
									type="monotone"
									stroke="#09A609"
									strokeWidth={2}
									dot={true}
								/>
								<Line
									dataKey="totalReaders"
									type="monotone"
									stroke="#6E3FF3"
									strokeWidth={2}
									dot={true}
								/>
							</LineChart>
						</ChartContainer>
					</div>
				</div>
			)}
		</div>
	);
}

export default SalesTracker;
