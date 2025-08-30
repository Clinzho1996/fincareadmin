// components/Hero.js
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import ActionCard from "./ActionCard";

function Hero() {
	const [analytics, setAnalytics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { data: session } = useSession();

	const formattedAmount = (amount) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
		}).format(amount);
	};

	useEffect(() => {
		const fetchAnalytics = async () => {
			try {
				setLoading(true);

				if (!session) {
					throw new Error("Not authenticated");
				}

				const response = await fetch("/api/admin/analytics", {
					headers: {
						Authorization: `Bearer ${session.accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error("Failed to fetch analytics");
				}

				const data = await response.json();

				if (data.status === "success") {
					setAnalytics(data.data);
				} else {
					throw new Error(data.error || "Failed to fetch analytics");
				}
			} catch (err) {
				setError(err.message);
				console.error("Error fetching analytics:", err);
			} finally {
				setLoading(false);
			}
		};

		if (session) {
			fetchAnalytics();
		}
	}, [session]);

	if (loading) {
		return (
			<div className="flex flex-row justify-between items-center gap-4 w-full max-w-[100vw]">
				{[1, 2, 3, 4].map((item) => (
					<div
						key={item}
						className="flex-1 bg-gray-200 rounded-lg p-6 animate-pulse">
						<div className="h-6 bg-gray-300 rounded mb-4"></div>
						<div className="h-8 bg-gray-300 rounded"></div>
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex justify-center items-center w-full p-4">
				<div className="text-red-500 bg-red-100 p-4 rounded-lg">
					Error loading analytics: {error}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-row justify-between items-center gap-4 w-full max-w-[100vw]">
			<ActionCard
				title="Total Loans"
				amount={formattedAmount(analytics?.loans?.total || 0)}
				change={analytics?.loans?.change}
				subtitle={`${analytics?.loans?.pending} pending withdrawals`}
			/>
			<ActionCard
				title="Total Investment"
				amount={formattedAmount(analytics?.investment?.total || 0)}
				change={analytics?.investment?.change}
				subtitle={`${analytics?.investment?.active} active auctions`}
			/>
			<ActionCard
				title="Total Savings"
				amount={formattedAmount(analytics?.savings?.total || 0)}
				change={analytics?.savings?.change}
			/>
			<ActionCard
				title="Total Users"
				amount={analytics?.users?.total || 0}
				change={analytics?.users?.change}
				subtitle={`${analytics?.users?.pending} pending memberships`}
			/>
		</div>
	);
}

export default Hero;
