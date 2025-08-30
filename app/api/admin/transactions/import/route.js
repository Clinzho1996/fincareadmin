// app/api/admin/transactions/import/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import transactionsData from "./transactions.json";

export async function POST(request) {
	try {
		const token = await getToken({ req: request });

		if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
			return NextResponse.json(
				{ error: "Unauthorized. Admin access required." },
				{ status: 403 }
			);
		}

		const { db } = await connectToDatabase();

		// Insert the transactions
		const result = await db
			.collection("transactions")
			.insertMany(transactionsData.transactions);

		return NextResponse.json({
			status: "success",
			message: `${result.insertedCount} transactions imported successfully`,
		});
	} catch (error) {
		console.error("Import transactions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
