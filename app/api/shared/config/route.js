// app/api/shared/config/route.js

export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			// Return public config even if not authenticated
			const publicConfig = {
				appName: "FinCare",
				version: "1.0.0",
				currency: "USD",
				minWithdrawalAmount: 10,
				maxWithdrawalAmount: 10000,
				supportedBanks: ["Bank of America", "Chase", "Wells Fargo", "Citibank"],
				maintenanceMode: false,
			};

			return NextResponse.json(publicConfig);
		}

		const { db } = await connectToDatabase();

		// Get user-specific configuration
		const user = await db
			.collection("users")
			.findOne(
				{ _id: authResult.userId },
				{ projection: { password: 0, otp: 0 } }
			);

		const config = {
			appName: "FinCare",
			version: "1.0.0",
			currency: "USD",
			minWithdrawalAmount: 10,
			maxWithdrawalAmount: 10000,
			supportedBanks: ["Bank of America", "Chase", "Wells Fargo", "Citibank"],
			maintenanceMode: false,
			user: {
				savingsBalance: user.savingsBalance,
				totalInvestment: user.totalInvestment,
				totalLoans: user.totalLoans,
				canWithdraw: user.savingsBalance >= 10,
				withdrawalFee: 1.5, // 1.5% fee
			},
		};

		return NextResponse.json(config);
	} catch (error) {
		console.error("GET /api/auth/config error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
