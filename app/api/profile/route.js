// app/api/profile/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { db } = await connectToDatabase();
		const user = await db
			.collection("users")
			.findOne(
				{ _id: authResult.userId },
				{ projection: { password: 0, otp: 0 } }
			);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Get user's savings, investments, loans, and auctions
		const savings = await db
			.collection("savings")
			.find({ userId: authResult.userId })
			.toArray();
		const investments = await db
			.collection("investments")
			.find({ userId: authResult.userId })
			.toArray();
		const loans = await db
			.collection("loans")
			.find({ userId: authResult.userId })
			.toArray();
		const auctions = await db
			.collection("auctions")
			.find({ userId: authResult.userId })
			.toArray();

		// Calculate totals
		const totalSavings = savings.reduce(
			(sum, saving) => sum + saving.currentBalance,
			0
		);
		const totalInvestment = investments.reduce(
			(sum, investment) => sum + investment.amount,
			0
		);
		const totalLoans = loans.reduce((sum, loan) => sum + loan.amount, 0);
		const totalAuctions = auctions.length;

		return NextResponse.json({
			user: {
				...user,
				totalSavings,
				totalInvestment,
				totalLoans,
				totalAuctions,
			},
			savings,
			investments,
			loans,
			auctions,
		});
	} catch (error) {
		console.error("GET /api/profile error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
