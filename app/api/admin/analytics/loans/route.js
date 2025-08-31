// app/api/admin/analytics/loans/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y

		const { db } = await connectToDatabase();

		// Calculate date range based on period
		const dateRanges = {
			"7d": 7,
			"30d": 30,
			"90d": 90,
			"1y": 365,
		};

		const days = dateRanges[period] || 30;
		const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		// Loan analytics
		const loanAnalytics = await db
			.collection("loans")
			.aggregate([
				{
					$match: {
						createdAt: { $gte: startDate },
					},
				},
				{
					$group: {
						_id: {
							status: "$status",
							month: { $month: "$createdAt" },
							year: { $year: "$createdAt" },
						},
						count: { $sum: 1 },
						totalAmount: { $sum: "$loanAmount" },
					},
				},
				{
					$sort: { "_id.year": 1, "_id.month": 1 },
				},
			])
			.toArray();

		return NextResponse.json({
			status: "success",
			data: {
				period,
				loans: loanAnalytics,
				summary: {
					total: loanAnalytics.reduce((sum, item) => sum + item.count, 0),
					totalAmount: loanAnalytics.reduce(
						(sum, item) => sum + item.totalAmount,
						0
					),
				},
			},
		});
	} catch (error) {
		console.error("Loan analytics error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
