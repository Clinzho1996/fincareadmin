export const dynamic = "force-dynamic";

import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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

		// ✅ _id is ObjectId in users
		const user = await db
			.collection("users")
			.findOne(
				{ _id: new ObjectId(authResult.userId) },
				{ projection: { password: 0, otp: 0 } }
			);

		if (!user) {
			return NextResponse.json(
				{ error: "User not found or not verified" },
				{ status: 404 }
			);
		}

		// ✅ use string userId for related collections
		const userIdString = authResult.userId;

		const savings = await db
			.collection("savings")
			.find({ userId: userIdString })
			.toArray();
		const investments = await db
			.collection("investments")
			.find({ userId: userIdString })
			.toArray();
		const loans = await db
			.collection("loans")
			.find({ userId: userIdString })
			.toArray();
		const auctions = await db
			.collection("auctions")
			.find({ userId: userIdString })
			.toArray();

		// Calculate totals
		const totalSavings = savings.reduce(
			(sum, s) => sum + (s.currentBalance || 0),
			0
		);
		const totalInvestment = investments.reduce(
			(sum, i) => sum + (i.amount || 0),
			0
		);
		const totalLoans = loans.reduce((sum, l) => sum + (l.amount || 0), 0);
		const totalAuctions = auctions.length;

		return NextResponse.json({
			status: "success",
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
