// app/api/settings/route.js
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const { db } = await connectToDatabase();

		// Get current settings or create default if none exists
		let settings = await db
			.collection("settings")
			.findOne({ type: "loan_settings" });

		// If no settings found, return defaults
		if (!settings) {
			settings = {
				interestRate: 10, // 10% default
				processingFeeRate: 1, // 1% default
				minLoanAmount: 1000,
				maxLoanAmount: 100000,
				defaultDuration: 12,
			};
		}

		return NextResponse.json({
			status: "success",
			data: settings,
		});
	} catch (error) {
		console.error("GET /api/settings error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
