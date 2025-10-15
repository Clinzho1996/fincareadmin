// app/api/user/auctions/[id]/bids/route.js
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
