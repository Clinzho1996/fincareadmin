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
		const limit = parseInt(searchParams.get("limit")) || 1000;
		const status = searchParams.get("status");
		const type = searchParams.get("type");

		const { db } = await connectToDatabase();

		// Build query
		const query = {};
		if (status) query.status = status;
		if (type) query.type = type;

		const transactions = await db
			.collection("transactions")
			.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.toArray();

		const total = await db.collection("transactions").countDocuments(query);

		// Convert ObjectId to string for JSON serialization
		const serializedTransactions = transactions.map((tx) => ({
			...tx,
			_id: tx._id.toString(),
			userId: tx.userId.toString(),
		}));

		return NextResponse.json({
			status: "success",
			data: serializedTransactions,
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
