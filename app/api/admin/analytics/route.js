// app/api/admin/analytics/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		// Verify admin permissions
		const token = await getToken({ req: request });

		if (!token || (token.role !== "super_admin" && token.role !== "admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();

		console.log("🔍 ANALYTICS DEBUG - Starting analytics calculation");

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
			// DEBUG: Get loan statistics
			loanStats,
			userLoanTotals,
		] = await Promise.all([
			// Total Loans (only approved loans) - CURRENT METHOD
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

			// DEBUG: Get loan collection statistics
			db
				.collection("loans")
				.aggregate([
					{
						$group: {
							_id: "$status",
							count: { $sum: 1 },
							totalAmount: { $sum: "$loanAmount" },
						},
					},
				])
				.toArray(),

			// DEBUG: Get total loans from users collection (stored values)
			db
				.collection("users")
				.aggregate([{ $group: { _id: null, total: { $sum: "$totalLoans" } } }])
				.toArray(),
		]);

		console.log("🔍 ANALYTICS DEBUG - Loan data:", {
			fromLoansCollection: totalLoans[0]?.total || 0,
			fromUsersCollection: userLoanTotals[0]?.total || 0,
			loanStatusBreakdown: loanStats,
			loanCount: await db.collection("loans").countDocuments(),
			approvedLoanCount: await db
				.collection("loans")
				.countDocuments({ status: "approved" }),
		});

		// Calculate percentage changes (compared to previous period)
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		const [
			previousLoans,
			previousInvestment,
			previousSavings,
			previousUsersCount,
			// DEBUG: Previous period from users collection
			previousUserLoans,
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

			// DEBUG: Previous period loans from users collection
			db
				.collection("users")
				.aggregate([
					{
						$match: {
							createdAt: { $lt: thirtyDaysAgo },
						},
					},
					{ $group: { _id: null, total: { $sum: "$totalLoans" } } },
				])
				.toArray(),
		]);

		// Helper function to calculate percentage change
		const calculateChange = (current, previous) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		// DECISION: Choose which loan total to use
		// Option 1: Use loans collection (only approved loans)
		const loanTotalFromLoansCollection = totalLoans[0]?.total || 0;

		// Option 2: Use users collection (stored totals - includes manually entered data)
		const loanTotalFromUsersCollection = userLoanTotals[0]?.total || 0;

		// Option 3: Use the larger of the two (or choose based on your business logic)
		const finalLoanTotal =
			loanTotalFromUsersCollection > 0
				? loanTotalFromUsersCollection
				: loanTotalFromLoansCollection;

		console.log("🔍 ANALYTICS DEBUG - Final loan total decision:", {
			fromLoansCollection: loanTotalFromLoansCollection,
			fromUsersCollection: loanTotalFromUsersCollection,
			finalDecision: finalLoanTotal,
		});

		const analyticsData = {
			loans: {
				total: finalLoanTotal, // Use the chosen total
				change: calculateChange(
					finalLoanTotal,
					previousUserLoans[0]?.total || previousLoans[0]?.total || 0
				),
				pending: pendingWithdrawals,
				// Include debug info (remove in production)
				_debug: {
					fromLoansCollection: loanTotalFromLoansCollection,
					fromUsersCollection: loanTotalFromUsersCollection,
				},
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

		console.log(
			"✅ ANALYTICS DEBUG - Final analytics data:",
			analyticsData.loans
		);

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
