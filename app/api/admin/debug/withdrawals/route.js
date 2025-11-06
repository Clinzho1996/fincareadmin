// app/api/admin/debug/withdrawals/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const { db } = await connectToDatabase();

		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		console.log("🔍 DEBUG - Checking withdrawals for user:", userId);

		// Check ALL withdrawals first
		const allWithdrawals = await db
			.collection("withdrawals")
			.find({})
			.toArray();

		console.log("🔍 DEBUG - All withdrawals in system:", allWithdrawals);

		// Try different query formats
		const queryAsString = { userId: userId };
		const queryAsObjectId = { userId: new ObjectId(userId) };

		const withdrawalsAsString = await db
			.collection("withdrawals")
			.find(queryAsString)
			.toArray();
		const withdrawalsAsObjectId = await db
			.collection("withdrawals")
			.find(queryAsObjectId)
			.toArray();

		return NextResponse.json({
			totalWithdrawals: allWithdrawals.length,
			queryAsString: queryAsString,
			queryAsObjectId: queryAsObjectId,
			withdrawalsAsString: withdrawalsAsString,
			withdrawalsAsObjectId: withdrawalsAsObjectId,
			allWithdrawals: allWithdrawals,
		});
	} catch (error) {
		console.error("Debug error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
