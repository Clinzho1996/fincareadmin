// app/api/admin/analytics/finance/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		// Verify admin permissions
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");

		if (!startDate || !endDate) {
			return NextResponse.json(
				{ error: "Start date and end date are required" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Convert dates to Date objects
		const start = new Date(startDate);
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999); // End of the day

		// Get all financial data in parallel
		const [
			totalRevenue,
			totalWithdrawal,
			totalSavings,
			totalInvestment,
			withdrawalStats,
		] = await Promise.all([
			// Total Revenue (from transactions)
			db
				.collection("transactions")
				.aggregate([
					{
						$match: {
							type: "revenue",
							status: "completed",
							createdAt: { $gte: start, $lte: end },
						},
					},
					{ $group: { _id: null, total: { $sum: "$amount" } } },
				])
				.toArray(),

			// Total Withdrawal
			db
				.collection("withdrawals")
				.aggregate([
					{
						$match: {
							status: { $in: ["completed", "processing"] },
							createdAt: { $gte: start, $lte: end },
						},
					},
					{ $group: { _id: null, total: { $sum: "$amount" } } },
				])
				.toArray(),

			// Total Savings (current balance across all users)
			db
				.collection("users")
				.aggregate([
					{ $group: { _id: null, total: { $sum: "$savingsBalance" } } },
				])
				.toArray(),

			// Total Investment
			db
				.collection("investments")
				.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
				.toArray(),

			// Withdrawal statistics
			db
				.collection("withdrawals")
				.aggregate([
					{
						$match: {
							createdAt: { $gte: start, $lte: end },
						},
					},
					{
						$group: {
							_id: "$status",
							count: { $sum: 1 },
							total: { $sum: "$amount" },
						},
					},
				])
				.toArray(),
		]);

		// Calculate withdrawal stats
		const pendingWithdrawals =
			withdrawalStats.find((s) => s._id === "pending")?.count || 0;
		const completedWithdrawals =
			withdrawalStats.find((s) => s._id === "completed")?.count || 0;

		const financeData = {
			totalRevenue: totalRevenue[0]?.total || 0,
			totalWithdrawal: totalWithdrawal[0]?.total || 0,
			totalSavings: totalSavings[0]?.total || 0,
			totalInvestment: totalInvestment[0]?.total || 0,
			pendingWithdrawals,
			completedWithdrawals,
		};

		return NextResponse.json({
			status: "success",
			data: financeData,
		});
	} catch (error) {
		console.error("Finance analytics API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
