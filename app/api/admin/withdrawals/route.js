// app/api/admin/withdrawals/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

// GET - Get all withdrawals (admin)
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		// Check if user is admin
		const { db } = await connectToDatabase();
		const user = await db
			.collection("users")
			.findOne({ _id: authResult.userId });

		if (!user || user.role !== "admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;

		// Build query
		const query = {};
		if (status && status !== "all") {
			query.status = status;
		}

		const withdrawals = await db
			.collection("withdrawals")
			.aggregate([
				{ $match: query },
				{ $sort: { createdAt: -1 } },
				{ $skip: (page - 1) * limit },
				{ $limit: limit },
				{
					$lookup: {
						from: "users",
						localField: "userId",
						foreignField: "_id",
						as: "user",
					},
				},
				{
					$project: {
						amount: 1,
						status: 1,
						accountName: 1,
						bankName: 1,
						accountNumber: 1,
						routingNumber: 1,
						notes: 1,
						createdAt: 1,
						updatedAt: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
						"user.phone": 1,
					},
				},
			])
			.toArray();

		const total = await db.collection("withdrawals").countDocuments(query);

		return NextResponse.json({
			withdrawals,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("GET /api/auth/withdrawals error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
