// app/api/auctions/[id]/bids/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get all bids for an auction
export async function GET(request, { params }) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { id } = params;

		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid auction ID" },
				{ status: 400 }
			);
		}

		const { db } = await connectToDatabase();

		// Check if auction exists
		const auction = await db.collection("auctions").findOne({
			_id: new ObjectId(id),
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		// Get bids with user information
		const bids = await db
			.collection("bids")
			.aggregate([
				{ $match: { auctionId: new ObjectId(id) } },
				{ $sort: { amount: -1, createdAt: -1 } },
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
						createdAt: 1,
						"user.firstName": 1,
						"user.lastName": 1,
						"user.email": 1,
					},
				},
			])
			.toArray();

		return NextResponse.json({ bids });
	} catch (error) {
		console.error("GET /api/bid-id error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
