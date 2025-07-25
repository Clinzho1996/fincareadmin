"use client";
import axios from "axios";
import { getSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

interface Subscription {
	id: string;
	user_id: string;
	transaction_id: string;
	subscription_plan_id: string;
	amount: string;
	duration: string;
	start_date: string;
	end_date: string;
	created_at: string;
	updated_at: string;
	subscription_plan: {
		id: string;
		subscription_plan_name?: string;
		number_of_budgets_allowed_per_month?: number;
		number_of_accounts_allowed_per_month?: number;
		subscription_plan_amount?: string;
		created_at: string;
		updated_at: string;
	};
}

interface SubscriptionPlan {
	id: string;
	subscription_plan_name: string;
	subscription_plan_amount: string;
	number_of_budgets_allowed_per_month: number;
	number_of_accounts_allowed_per_month: number;
	created_at: string;
	updated_at: string;
}

interface CurrentSubscriptionResponse {
	status: "success" | "error";
	data: Subscription | null;
	message?: string;
}

interface SubscriptionPlansResponse {
	status: "success" | "error";
	data: SubscriptionPlan[];
	message?: string;
}

export default function SubCard() {
	const [subscription, setSubscription] = useState<Subscription | null>(null);
	const [subscriptionPlans, setSubscriptionPlans] = useState<
		SubscriptionPlan[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		try {
			const session = await getSession();

			if (!session?.accessToken) {
				setError("Authentication required. Please log in.");
				setLoading(false);
				return;
			}

			// Fetch all subscription plans first
			const plansResponse = await axios.get<SubscriptionPlansResponse>(
				"https://api.kuditrak.ng/api/v1/subscription-plans",
				{
					headers: {
						Authorization: `Bearer ${session.accessToken}`,
						Accept: "application/json",
					},
				}
			);

			if (plansResponse.data.status === "success") {
				setSubscriptionPlans(plansResponse.data.data);
			}

			// Then fetch current subscription
			const subscriptionResponse = await axios.get<CurrentSubscriptionResponse>(
				"https://api.kuditrak.ng/api/v1/subscription/current",
				{
					headers: {
						Authorization: `Bearer ${session.accessToken}`,
						Accept: "application/json",
					},
				}
			);

			if (subscriptionResponse.data.status === "success") {
				setSubscription(subscriptionResponse.data.data);
			}

			setError(
				subscriptionResponse.data.message || plansResponse.data.message || null
			);
		} catch (err) {
			setError("Failed to fetch subscription data");
			console.error("Error fetching subscription:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat("en-NG", {
			style: "currency",
			currency: "NGN",
			minimumFractionDigits: 2,
		}).format(parseFloat(amount));
	};

	const formatDate = (dateString: string) => {
		try {
			const options: Intl.DateTimeFormatOptions = {
				day: "numeric",
				month: "long",
				year: "numeric",
			};
			return new Date(dateString).toLocaleDateString("en-US", options);
		} catch {
			return "Invalid date";
		}
	};

	const getPlanName = (planName: string) => {
		const names: Record<string, string> = {
			basic: "Basic Plan",
			premium: "Premium Plan",
			free: "Free Plan",
		};
		return names[planName?.toLowerCase()] || planName;
	};

	const getDurationName = (duration: string) => {
		const durations: Record<string, string> = {
			monthly: "Monthly",
			quarterly: "Quarterly",
			yearly: "Yearly",
		};
		return durations[duration?.toLowerCase()] || duration;
	};

	const getCurrentPlan = () => {
		if (!subscription) {
			return subscriptionPlans.find(
				(plan) => plan.subscription_plan_name.toLowerCase() === "free"
			);
		}
		return subscriptionPlans.find(
			(plan) => plan.id === subscription.subscription_plan_id
		);
	};

	const hasActivePaidSubscription = () => {
		if (!subscription) return false;
		const currentPlan = getCurrentPlan();
		return currentPlan?.subscription_plan_name.toLowerCase() !== "free";
	};

	if (loading) {
		return (
			<div className="bg-white p-4 rounded-lg border shadow-md">
				<div className="px-6 py-3 border shadow-lg rounded-lg flex items-center justify-center h-40">
					<p className="text-gray-500">Loading subscription data...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white p-4 rounded-lg border shadow-md">
				<div className="px-6 py-3 border shadow-lg rounded-lg flex flex-col items-center justify-center h-40 gap-2">
					<p className="text-red-500">{error}</p>
					<Button variant="outline" onClick={fetchData} className="text-sm">
						Retry
					</Button>
				</div>
			</div>
		);
	}

	const currentPlan = getCurrentPlan();
	const isFreePlan =
		!currentPlan ||
		currentPlan?.subscription_plan_name.toLowerCase() === "free";

	return (
		<div className="bg-white p-4 rounded-lg border shadow-md">
			<div className="px-6 py-3 border shadow-lg rounded-lg flex flex-col sm:flex-row justify-between items-center">
				<div className="flex flex-col gap-3">
					<div>
						<p className="text-xs text-[#404040] font-medium uppercase py-1 px-3 bg-[#F3F4F6] rounded-lg w-fit border">
							{currentPlan
								? `${getPlanName(currentPlan.subscription_plan_name)} ${
										hasActivePaidSubscription()
											? getDurationName(subscription?.duration || "")
											: ""
								  }`
								: "Free Plan"}
						</p>
					</div>
					<div className="flex flex-row justify-start gap-20 items-start">
						<div>
							<p className="text-xs text-[#6B7280] font-normal font-inter">
								{hasActivePaidSubscription() ? "Active Since" : "Plan Started"}
							</p>
							<p className="text-sm text-primary-1 font-normal">
								{formatDate(
									hasActivePaidSubscription()
										? subscription?.start_date ?? new Date().toISOString()
										: new Date().toISOString()
								)}
							</p>
						</div>
						{hasActivePaidSubscription() && subscription?.end_date && (
							<div>
								<p className="text-xs text-[#6B7280] font-normal font-inter">
									Next Billing Date
								</p>
								<p className="text-sm text-primary-1 font-normal">
									{formatDate(subscription.end_date)}
								</p>
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex flex-row gap-3 items-center">
						<p className="text-[#404040] text-[28px] font-medium">
							{currentPlan
								? formatCurrency(currentPlan.subscription_plan_amount)
								: formatCurrency("0.00")}
						</p>
						<p className="text-[#A1A1AA] text-[12px] font-inter">
							{hasActivePaidSubscription()
								? `/${subscription?.duration || " forever"}`
								: "/ forever"}
						</p>
					</div>
					<div className="flex flex-row gap-1">
						{isFreePlan ? (
							<Link href="/subscriptions/subscription-plans">
								<Button className="bg-[#173634] text-white border border-[#BCF19A] rounded-lg font-inter hover:bg-[#173634]/90">
									Upgrade to Premium
								</Button>
							</Link>
						) : (
							<>
								<Link href="/subscriptions/subscription-plans">
									<Button className="bg-[#173634] text-white border border-[#BCF19A] rounded-lg font-inter hover:bg-[#173634]/90">
										Change Plan
									</Button>
								</Link>
								<Button
									variant="ghost"
									className="text-[#EE3731] hover:bg-transparent hover:text-[#EE3731]/90">
									Cancel Subscription
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
