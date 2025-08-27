import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// GET - Get all bids made by the current user
export async function GET(request) {
	try {
		const authResult = await authenticate(request);
		if (authResult.error) {
			return NextResponse.json(
				{ error: authResult.error },
				{ status: authResult.status }
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");

		const { db } = await connectToDatabase();

		// Ensure userId is ObjectId
		const query = { userId: new ObjectId(authResult.userId) };
		if (status) query.status = status;

		const bids = await db
			.collection("bids")
			.aggregate([
				{ $match: query },
				{ $sort: { createdAt: -1 } },
				{
					$lookup: {
						from: "auctions",
						localField: "auctionId",
						foreignField: "_id",
						as: "auction",
					},
				},
				{ $unwind: "$auction" }, // ✅ flatten auction array
				{
					$project: {
						amount: 1,
						status: 1,
						createdAt: 1,
						auctionId: "$auction._id", // ✅ include auction id
						"auction.auctionName": 1,
						"auction.reservePrice": 1,
						"auction.status": 1,
						"auction.endDate": 1,
					},
				},
			])
			.toArray();

		return NextResponse.json({ bids });
	} catch (error) {
		console.error("GET /api/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
