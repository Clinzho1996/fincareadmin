// app/api/user/won-auctions/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET user's won auctions
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
		const userId = new ObjectId(authResult.userId);

		// Get auctions won by this user
		const wonAuctions = await db
			.collection("user_won_auctions")
			.find({
				newOwnerId: userId,
			})
			.sort({ acceptedAt: -1 })
			.toArray();

		// Get user details for previous owners
		const wonAuctionsWithDetails = await Promise.all(
			wonAuctions.map(async (auction) => {
				const previousOwner = await db
					.collection("users")
					.findOne({ _id: auction.previousOwnerId });

				return {
					...auction,
					previousOwner: previousOwner
						? {
								firstName: previousOwner.firstName,
								lastName: previousOwner.lastName,
								email: previousOwner.email,
						  }
						: null,
				};
			})
		);

		return NextResponse.json({
			wonAuctions: wonAuctionsWithDetails,
		});
	} catch (error) {
		console.error("GET /api/user/won-auctions error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
