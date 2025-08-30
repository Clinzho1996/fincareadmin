// app/api/admin/transactions/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page")) || 1;
		const limit = parseInt(searchParams.get("limit")) || 10;
		const status = searchParams.get("status");
		const type = searchParams.get("type");

		const { db } = await connectToDatabase();

		// Build query
		const query = {};
		if (status) query.status = status;
		if (type) query.type = type;

		const transactions = await db
			.collection("transactions")
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
					$unwind: {
						path: "$user",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$project: {
						_id: 1,
						type: 1,
						amount: 1,
						status: 1,
						description: 1,
						reference: 1,
						createdAt: 1,
						updatedAt: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
					},
				},
			])
			.toArray();

		const total = await db.collection("transactions").countDocuments(query);

		return NextResponse.json({
			status: "success",
			data: transactions,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Transactions API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
