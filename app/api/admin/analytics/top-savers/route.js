// app/api/admin/analytics/top-savers/route.js - FIXED VERSION
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
		const period = searchParams.get("period") || "month";
		const limit = parseInt(searchParams.get("limit")) || 20;
		const page = parseInt(searchParams.get("page")) || 1;
		const skip = (page - 1) * limit;

		const { db } = await connectToDatabase();

		// Calculate date range based on period
		const dateRange = getDateRange(period);
		console.log("Date range for period", period, ":", dateRange);

		// FIXED: Simplified aggregation pipeline
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
			// Lookup user details - handle both string and ObjectId userIDs
			{
				$lookup: {
					from: "users",
					let: { userId: "$_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$or: [
										{ $eq: ["$_id", "$$userId"] }, // Direct match for ObjectId
										{ $eq: [{ $toString: "$_id" }, "$$userId"] }, // String match
										{ $eq: ["$_id", { $toObjectId: "$$userId" }] }, // Convert string to ObjectId
									],
								},
							},
						},
					],
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
			// Project relevant fields - use proper projection syntax
			{
				$project: {
					userId: "$_id",
					totalSavingsAmount: 1,
					savingsCount: 1,
					lastSavingsDate: 1,
					firstSavingsDate: 1,
					savingsIds: 1,
					userDetails: {
						$cond: {
							if: { $ne: ["$userDetails", null] },
							then: {
								firstName: "$userDetails.firstName",
								lastName: "$userDetails.lastName",
								otherName: "$userDetails.otherName",
								email: "$userDetails.email",
								phone: "$userDetails.phone",
								savingsBalance: "$userDetails.savingsBalance",
								totalSavings: "$userDetails.totalSavings",
								membershipLevel: "$userDetails.membershipLevel",
								membershipStatus: "$userDetails.membershipStatus",
							},
							else: null,
						},
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

		console.log("Executing aggregation pipeline...");
		const topSavers = await db
			.collection("savings")
			.aggregate(pipeline)
			.toArray();

		console.log(`Found ${topSavers.length} savers`);
		console.log("UserDetails status for each saver:");
		topSavers.forEach((saver, index) => {
			console.log(`Saver ${index + 1}:`, {
				userId: saver.userId,
				hasUserDetails: !!saver.userDetails,
				userName: saver.userDetails
					? `${saver.userDetails.firstName} ${saver.userDetails.lastName}`
					: "No details",
			});
		});

		// Get total count for pagination
		const countMatch = {
			status: "verified",
			createdAt: dateRange
				? { $gte: dateRange.start, $lte: dateRange.end }
				: { $exists: true },
			$or: [
				{ amount: { $gt: 0 } },
				{ currentBalance: { $gt: 0 } },
				{ targetAmount: { $gt: 0 } },
			],
		};

		const total = await db.collection("savings").countDocuments(countMatch);

		// Calculate overall statistics
		const statsPipeline = [
			{
				$match: countMatch,
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
					averageSavings: {
						$avg: {
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
			{
				error: "Internal server error",
				details: error.message,
			},
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
			start.setDate(now.getDate() - now.getDay());
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
			return null;
	}

	return { start, end };
}

// Alternative simpler version if the above still has issues
export async function POST(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const { period = "month" } = await request.json();
		const { db } = await connectToDatabase();

		const dateRange = getDateRange(period);

		// SIMPLER APPROACH: Get savings first, then manually lookup users
		const savingsMatch = {
			status: "verified",
			createdAt: dateRange
				? { $gte: dateRange.start, $lte: dateRange.end }
				: { $exists: true },
			$or: [
				{ amount: { $gt: 0 } },
				{ currentBalance: { $gt: 0 } },
				{ targetAmount: { $gt: 0 } },
			],
		};

		// First, get grouped savings data
		const savingsPipeline = [
			{ $match: savingsMatch },
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
				},
			},
			{ $sort: { totalSavingsAmount: -1 } },
			{ $limit: 50 },
		];

		const savingsData = await db
			.collection("savings")
			.aggregate(savingsPipeline)
			.toArray();

		// Then, manually lookup user details for each saver
		const topSavers = await Promise.all(
			savingsData.map(async (saver) => {
				let userDetails = null;

				try {
					// Try to find user by converting userId to ObjectId if it's a string
					const userId =
						typeof saver._id === "string" ? new ObjectId(saver._id) : saver._id;

					userDetails = await db.collection("users").findOne({ _id: userId });
				} catch (error) {
					console.log(
						`Could not find user for userId: ${saver._id}`,
						error.message
					);
				}

				return {
					userId: saver._id,
					totalSavingsAmount: saver.totalSavingsAmount,
					savingsCount: saver.savingsCount,
					lastSavingsDate: saver.lastSavingsDate,
					firstSavingsDate: saver.firstSavingsDate,
					userDetails: userDetails
						? {
								firstName: userDetails.firstName,
								lastName: userDetails.lastName,
								otherName: userDetails.otherName,
								email: userDetails.email,
								phone: userDetails.phone,
								savingsBalance: userDetails.savingsBalance,
								totalSavings: userDetails.totalSavings,
								membershipLevel: userDetails.membershipLevel,
								membershipStatus: userDetails.membershipStatus,
						  }
						: null,
				};
			})
		);

		return NextResponse.json({
			status: "success",
			data: {
				topSavers,
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
