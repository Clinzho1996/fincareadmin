// app/api/admin/analytics/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		// Verify admin permissions
		const token = await getToken({ req: request });

		if (!token || token.role !== "admin") {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();

		// Get all analytics data in parallel for better performance
		const [
			totalLoans,
			totalInvestment,
			totalSavings,
			totalUsers,
			pendingWithdrawals,
			activeAuctions,
			pendingMemberships,
			recentTransactions,
		] = await Promise.all([
			// Total Loans (only approved loans)
			db
				.collection("loans")
				.aggregate([
					{ $match: { status: "approved" } },
					{ $group: { _id: null, total: { $sum: "$loanAmount" } } },
				])
				.toArray(),

			// Total Investment
			db
				.collection("investments")
				.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
				.toArray(),

			// Total Savings
			db
				.collection("users")
				.aggregate([
					{ $group: { _id: null, total: { $sum: "$savingsBalance" } } },
				])
				.toArray(),

			// Total Users
			db.collection("users").countDocuments({ isEmailVerified: true }),

			// Pending Withdrawals
			db.collection("withdrawals").countDocuments({ status: "pending" }),

			// Active Auctions
			db.collection("auctions").countDocuments({ status: "active" }),

			// Pending Memberships
			db.collection("users").countDocuments({ membershipStatus: "pending" }),

			// Recent Transactions (last 7 days)
			db
				.collection("transactions")
				.find({
					createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
				})
				.sort({ createdAt: -1 })
				.limit(10)
				.toArray(),
		]);

		// Calculate percentage changes (compared to previous period)
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		const [
			previousLoans,
			previousInvestment,
			previousSavings,
			previousUsersCount,
		] = await Promise.all([
			// Loans from previous period
			db
				.collection("loans")
				.aggregate([
					{
						$match: {
							status: "approved",
							createdAt: { $lt: thirtyDaysAgo },
						},
					},
					{ $group: { _id: null, total: { $sum: "$loanAmount" } } },
				])
				.toArray(),

			// Investment from previous period
			db
				.collection("investments")
				.aggregate([
					{
						$match: {
							createdAt: { $lt: thirtyDaysAgo },
						},
					},
					{ $group: { _id: null, total: { $sum: "$amount" } } },
				])
				.toArray(),

			// Savings from previous period
			db
				.collection("users")
				.aggregate([
					{
						$match: {
							createdAt: { $lt: thirtyDaysAgo },
						},
					},
					{ $group: { _id: null, total: { $sum: "$savingsBalance" } } },
				])
				.toArray(),

			// Users count from previous period
			db.collection("users").countDocuments({
				isEmailVerified: true,
				createdAt: { $lt: thirtyDaysAgo },
			}),
		]);

		// Helper function to calculate percentage change
		const calculateChange = (current, previous) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		const analyticsData = {
			loans: {
				total: totalLoans[0]?.total || 0,
				change: calculateChange(
					totalLoans[0]?.total || 0,
					previousLoans[0]?.total || 0
				),
				pending: pendingWithdrawals,
			},
			investment: {
				total: totalInvestment[0]?.total || 0,
				change: calculateChange(
					totalInvestment[0]?.total || 0,
					previousInvestment[0]?.total || 0
				),
				active: activeAuctions,
			},
			savings: {
				total: totalSavings[0]?.total || 0,
				change: calculateChange(
					totalSavings[0]?.total || 0,
					previousSavings[0]?.total || 0
				),
			},
			users: {
				total: totalUsers,
				change: calculateChange(totalUsers, previousUsersCount),
				pending: pendingMemberships,
			},
			recentTransactions: recentTransactions.map((transaction) => ({
				id: transaction._id,
				type: transaction.type,
				amount: transaction.amount,
				status: transaction.status,
				createdAt: transaction.createdAt,
				userId: transaction.userId,
			})),
			timestamp: new Date().toISOString(),
		};

		return NextResponse.json({
			status: "success",
			data: analyticsData,
		});
	} catch (error) {
		console.error("Analytics API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
