// app/api/user/auctions/[id]/route.js
import { authenticate } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

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
		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

		const auction = await db.collection("user_auctions").findOne({
			_id: new ObjectId(id),
		});

		if (!auction) {
			return NextResponse.json({ error: "Auction not found" }, { status: 404 });
		}

		return NextResponse.json({ auction });
	} catch (error) {
		console.error("GET /api/user/auctions/[id] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// app/api/user/auctions/[id]/bids/route.js
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
		const { db } = await connectToDatabase();

		const bids = await db
			.collection("bids")
			.find({ auctionId: new ObjectId(id) })
			.sort({ amount: -1, createdAt: -1 })
			.toArray();

		return NextResponse.json({ bids });
	} catch (error) {
		console.error("GET /api/user/auctions/[id]/bids error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// app/api/user/auctions/[id]/stats/route.js
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
		const { db } = await connectToDatabase();
		const userId = new ObjectId(authResult.userId);

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
