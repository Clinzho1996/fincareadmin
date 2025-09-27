// app/api/admin/analytics/top-savers/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "month"; // day, week, month, year, all
		const limit = parseInt(searchParams.get("limit")) || 20;
		const page = parseInt(searchParams.get("page")) || 1;
		const skip = (page - 1) * limit;

		const { db } = await connectToDatabase();

		// Calculate date range based on period
		const dateRange = getDateRange(period);
		console.log("Date range for period", period, ":", dateRange);

		// Aggregate top savers based on savings transactions
		const pipeline = [
			// Match savings within the date range
			{
				$match: {
					status: "verified",
					createdAt: dateRange
						? { $gte: dateRange.start, $lte: dateRange.end }
						: { $exists: true },
					$or: [
						{ amount: { $gt: 0 } },
						{ currentBalance: { $gt: 0 } },
						{ targetAmount: { $gt: 0 } },
					],
				},
			},
			// Group by user and calculate totals
			{
				$group: {
					_id: "$userId",
					totalSavingsAmount: {
						$sum: {
							$cond: [
								{ $gt: ["$amount", 0] },
								"$amount",
								{
									$cond: [
										{ $gt: ["$currentBalance", 0] },
										"$currentBalance",
										{ $ifNull: ["$targetAmount", 0] },
									],
								},
							],
						},
					},
					savingsCount: { $sum: 1 },
					lastSavingsDate: { $max: "$createdAt" },
					firstSavingsDate: { $min: "$createdAt" },
					savingsIds: { $push: "$_id" },
				},
			},
			// Lookup user details
			{
				$lookup: {
					from: "users",
					localField: "_id",
					foreignField: "_id",
					as: "userDetails",
				},
			},
			// Unwind user details
			{
				$unwind: {
					path: "$userDetails",
					preserveNullAndEmptyArrays: true,
				},
			},
			// Project relevant fields
			{
				$project: {
					userId: "$_id",
					totalSavingsAmount: 1,
					savingsCount: 1,
					lastSavingsDate: 1,
					firstSavingsDate: 1,
					savingsIds: 1,
					userDetails: {
						firstName: 1,
						lastName: 1,
						otherName: 1,
						email: 1,
						phone: 1,
						savingsBalance: 1,
						totalSavings: 1,
						membershipLevel: 1,
						membershipStatus: 1,
					},
				},
			},
			// Sort by total savings amount (descending)
			{
				$sort: { totalSavingsAmount: -1 },
			},
			// Pagination
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
		];

		// Get total count for pagination
		const countPipeline = [
			...pipeline.slice(0, 2), // Match and group stages only
			{
				$count: "totalCount",
			},
		];

		const [topSavers, countResult] = await Promise.all([
			db.collection("savings").aggregate(pipeline).toArray(),
			db.collection("savings").aggregate(countPipeline).toArray(),
		]);

		const total = countResult.length > 0 ? countResult[0].totalCount : 0;

		// Calculate overall statistics
		const statsPipeline = [
			{
				$match: {
					status: "verified",
					createdAt: dateRange
						? { $gte: dateRange.start, $lte: dateRange.end }
						: { $exists: true },
				},
			},
			{
				$group: {
					_id: null,
					totalSavingsVolume: {
						$sum: {
							$cond: [
								{ $gt: ["$amount", 0] },
								"$amount",
								{
									$cond: [
										{ $gt: ["$currentBalance", 0] },
										"$currentBalance",
										{ $ifNull: ["$targetAmount", 0] },
									],
								},
							],
						},
					},
					totalTransactions: { $sum: 1 },
					averageSavings: { $avg: "$amount" },
					uniqueSavers: { $addToSet: "$userId" },
				},
			},
			{
				$project: {
					totalSavingsVolume: 1,
					totalTransactions: 1,
					averageSavings: 1,
					uniqueSaversCount: { $size: "$uniqueSavers" },
				},
			},
		];

		const statsResult = await db
			.collection("savings")
			.aggregate(statsPipeline)
			.toArray();
		const statistics =
			statsResult.length > 0
				? statsResult[0]
				: {
						totalSavingsVolume: 0,
						totalTransactions: 0,
						averageSavings: 0,
						uniqueSaversCount: 0,
				  };

		return NextResponse.json({
			status: "success",
			data: {
				topSavers,
				statistics,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
				period,
				dateRange,
			},
		});
	} catch (error) {
		console.error("GET /api/admin/analytics/top-savers error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

function getDateRange(period) {
	const now = new Date();
	let start, end;

	switch (period) {
		case "day":
			start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			break;
		case "week":
			start = new Date(now);
			start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
			start.setHours(0, 0, 0, 0);
			end = new Date(start);
			end.setDate(start.getDate() + 7);
			break;
		case "month":
			start = new Date(now.getFullYear(), now.getMonth(), 1);
			end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			break;
		case "year":
			start = new Date(now.getFullYear(), 0, 1);
			end = new Date(now.getFullYear() + 1, 0, 1);
			break;
		case "all":
		default:
			return null; // No date range for "all"
	}

	return { start, end };
}

// Additional endpoint for savings trends
export async function POST(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { period = "month", userId } = await request.json();

		const { db } = await connectToDatabase();

		// Get savings trend data
		const trendPipeline = [
			{
				$match: {
					status: "verified",
					...(userId && { userId: new ObjectId(userId) }),
				},
			},
			{
				$group: {
					_id: {
						year: { $year: "$createdAt" },
						month: { $month: "$createdAt" },
						week: { $week: "$createdAt" },
						day: { $dayOfMonth: "$createdAt" },
					},
					totalAmount: {
						$sum: {
							$cond: [
								{ $gt: ["$amount", 0] },
								"$amount",
								{
									$cond: [
										{ $gt: ["$currentBalance", 0] },
										"$currentBalance",
										{ $ifNull: ["$targetAmount", 0] },
									],
								},
							],
						},
					},
					transactionCount: { $sum: 1 },
					date: { $first: "$createdAt" },
				},
			},
			{
				$sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 },
			},
			{
				$limit: 30, // Last 30 data points
			},
		];

		const trends = await db
			.collection("savings")
			.aggregate(trendPipeline)
			.toArray();

		return NextResponse.json({
			status: "success",
			data: {
				trends,
				period,
			},
		});
	} catch (error) {
		console.error("POST /api/admin/analytics/top-savers error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
