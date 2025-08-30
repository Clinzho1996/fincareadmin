"use client";

import { useEffect, useState } from "react";
import ActionCard from "./ActionCard";

function Hero() {
	const [analytics, setAnalytics] = useState({
		totalLoans: 0,
		totalInvestments: 0,
		totalSavings: 0,
		totalUsers: 0,
	});

	const formattedAmount = (amount: number) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	useEffect(() => {
		const fetchAnalytics = async () => {
			try {
				const res = await fetch("/api/admin/analytics");
				const data = await res.json();
				if (data.status === "success") {
					setAnalytics(data.data);
				}
			} catch (error) {
				console.error("Error fetching analytics:", error);
			}
		};
		fetchAnalytics();
	}, []);

	return (
		<div className="flex flex-row justify-between items-center gap-4 w-full max-w-[100vw]">
			<ActionCard
				title="Total Loans"
				amount={formattedAmount(analytics.totalLoans)}
			/>
			<ActionCard
				title="Total Investment"
				amount={formattedAmount(analytics.totalInvestments)}
			/>
			<ActionCard
				title="Total Savings"
				amount={formattedAmount(analytics.totalSavings)}
			/>
			<ActionCard title="Total Users" amount={analytics.totalUsers} />
		</div>
	);
}

export default Hero;
