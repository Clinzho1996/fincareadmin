// app/api/user/auctions/[id]/stats/route.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
	try {
		const session = await getServerSession();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = params;
		const { db } = await connectToDatabase();
		const userId = new ObjectId(session.user.id);

		// Get total bids
		const totalBids = await db
			.collection("bids")
			.countDocuments({ auctionId: new ObjectId(id) });

		// Get user's highest bid
		const userHighestBid = await db
			.collection("bids")
			.findOne(
				{ auctionId: new ObjectId(id), bidderId: userId },
				{ sort: { amount: -1 } }
			);

		// Get unique bidders
		const uniqueBidders = await db
			.collection("bids")
			.distinct("bidderId", { auctionId: new ObjectId(id) });

		const statistics = {
			totalBids,
			userHighestBid: userHighestBid?.amount || 0,
			uniqueBidders: uniqueBidders.length,
		};

		return NextResponse.json(statistics);
	} catch (error) {
		console.error("GET /api/user/auctions/[id]/stats error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
